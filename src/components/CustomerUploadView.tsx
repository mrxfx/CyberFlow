import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  UploadCloud, Loader2, CheckCircle2, QrCode, FileText, 
  Trash2, Check, RefreshCw, AlertTriangle, Phone, Sparkles, Search, X, Printer, Settings,
  Copy, Image as ImageIcon, Layers, Scan, Info, HelpCircle, ChevronRight
} from "lucide-react";
import { pdfjs } from "react-pdf";
import { Service, ServiceOption } from "../types";

// Configure PDFjs worker using CDN matching the installed version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface CustomerUploadViewProps {
  onNavigateToAdmin: () => void;
}

interface CreatedJobResponse {
  success: boolean;
  token: string;
  job: any;
  queuePosition: number;
  estimatedWaitMinutes: number;
}

interface PdfAnalysis {
  fileName: string;
  fileSize: number;
  totalPages: number;
  version: string;
  isPasswordProtected: boolean;
  isCorrupted: boolean;
  pageSizeDetected: string;
}

// Pure Client-Side PDF Analysis using PDF.js for streaming & lazy-loading
function analyzePdfClientSide(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<PdfAnalysis> {
  return new Promise(async (resolve) => {
    const fileSize = file.size;
    const fileName = file.name;

    // Check if it's an image first
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
    if (isImage) {
      resolve({
        fileName,
        fileSize,
        totalPages: 1,
        version: "Unknown",
        isPasswordProtected: false,
        isCorrupted: false,
        pageSizeDetected: "Custom",
      });
      return;
    }

    if (!fileName.toLowerCase().endsWith(".pdf")) {
      resolve({
        fileName,
        fileSize,
        totalPages: 1,
        version: "Unknown",
        isPasswordProtected: false,
        isCorrupted: false,
        pageSizeDetected: "Custom",
      });
      return;
    }

    // Load PDF using PDF.js progressive streaming loader (uses range requests / chunks natively)
    const objectUrl = URL.createObjectURL(file);
    try {
      const loadingTask = pdfjs.getDocument({
        url: objectUrl,
        verbosity: 0,
      });

      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      if (onProgress) {
        onProgress(0, totalPages);
      }

      // Check first page to find paper size and format (lazy loading - only parsing page 1)
      let pageSizeDetected = "A4";
      try {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        const width = viewport.width;
        const height = viewport.height;
        // PDF points: A4 is 595.27 x 841.89 points
        if (Math.abs(width - 595.27) < 30 && Math.abs(height - 841.89) < 30) {
          pageSizeDetected = "A4";
        } else if (Math.abs(width - 612) < 30 && Math.abs(height - 792) < 30) {
          pageSizeDetected = "Letter";
        } else if (Math.abs(width - 612) < 30 && Math.abs(height - 1008) < 30) {
          pageSizeDetected = "Legal";
        } else if (Math.abs(width - 841.89) < 40 && Math.abs(height - 1190.55) < 40) {
          pageSizeDetected = "A3";
        } else {
          pageSizeDetected = "Custom";
        }
        page.cleanup();
      } catch (e) {
        console.warn("Error scanning page 1 for size detection:", e);
      }

      // Progressive counting feedback loop - fast, non-blocking and looks incredibly reactive
      // It counts pages incrementally with tiny pauses, but at a speed proportional to total count
      const stepDelay = totalPages > 100 ? 2 : 10;
      const stepIncrement = totalPages > 200 ? Math.max(1, Math.floor(totalPages / 50)) : 1;
      
      for (let i = 1; i <= totalPages; i += stepIncrement) {
        if (onProgress) {
          onProgress(i, totalPages);
        }
        // Yield execution to the browser main thread to prevent UI freezing
        await new Promise((r) => setTimeout(r, stepDelay));
      }

      // Final progress guarantee
      if (onProgress) {
        onProgress(totalPages, totalPages);
      }

      resolve({
        fileName,
        fileSize,
        totalPages,
        version: "1.4",
        isPasswordProtected: false,
        isCorrupted: false,
        pageSizeDetected,
      });
    } catch (err: any) {
      console.error("PDF.js analysis error:", err);
      const isPassword = err && (err.name === "PasswordException" || err.message?.includes("password") || err.message?.includes("Password"));
      resolve({
        fileName,
        fileSize,
        totalPages: 1,
        version: "Unknown",
        isPasswordProtected: !!isPassword,
        isCorrupted: !isPassword,
        pageSizeDetected: "Custom",
      });
    } finally {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (e) {}
    }
  });
}

export default function CustomerUploadView({ onNavigateToAdmin }: CustomerUploadViewProps) {
  // Form State
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("print");
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<"bw" | "color">("bw");
  const [paperSize, setPaperSize] = useState<"A4" | "A3" | "Legal" | "Letter">("A4");
  const [sideMode, setSideMode] = useState<"single" | "double">("single");
  const [notes, setNotes] = useState("");
  const [pagesCount, setPagesCount] = useState<number>(1);
  
  // Dynamic Services States
  const [services, setServices] = useState<Service[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  
  // File State
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedOverServiceId, setDraggedOverServiceId] = useState<string | null>(null);
  
  // Real-time Upload Progress State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Shop settings state
  const [settings, setSettings] = useState<any>({
    pricePerBWPage: 5,
    pricePerColorPage: 15,
    pricePerScan: 10,
    pricePerLamination: 30,
    pricePassportPhoto: 50,
  });

  // UI Flow State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdJob, setCreatedJob] = useState<CreatedJobResponse | null>(null);
  const [liveJobStatus, setLiveJobStatus] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI assistant preview state
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pdfAnalysisProgress, setPdfAnalysisProgress] = useState<{ current: number; total: number } | null>(null);

  // Floating Tracker Dialog state
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [searchToken, setSearchToken] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Pricing Settings and dynamic services list
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setSettings(data);
          if (data.defaultCopies !== undefined) setCopies(data.defaultCopies);
          if (data.defaultColorMode !== undefined) setColorMode(data.defaultColorMode);
          if (data.defaultPaperSize !== undefined) setPaperSize(data.defaultPaperSize);
          if (data.defaultSideMode !== undefined) setSideMode(data.defaultSideMode);
        }
      })
      .catch((err) => console.error("Error loading pricing settings:", err));

    fetch("/api/services")
      .then((res) => res.json())
      .then((data: Service[]) => {
        if (data && Array.isArray(data)) {
          setServices(data);
          const activeServices = data.filter(s => s.enabled);
          if (activeServices.length > 0) {
            setServiceType(activeServices[0].id);
            if (activeServices[0].options && activeServices[0].options.length > 0) {
              setSelectedOptionId(activeServices[0].options[0].id);
            }
          }
        }
      })
      .catch((err) => console.error("Error loading services:", err));
  }, []);

  const handleServiceTypeChange = (newType: string) => {
    setServiceType(newType);
    const service = services.find(s => s.id === newType);
    if (service && service.options && service.options.length > 0) {
      setSelectedOptionId(service.options[0].id);
    } else {
      setSelectedOptionId("");
    }
  };

  // Card-specific Drag & Drop handlers for digital service selection
  const handleServiceCardDragOver = (e: React.DragEvent, serviceId: string) => {
    e.preventDefault();
    setDraggedOverServiceId(serviceId);
  };

  const handleServiceCardDragLeave = () => {
    setDraggedOverServiceId(null);
  };

  const handleServiceCardDrop = (e: React.DragEvent, serviceId: string) => {
    e.preventDefault();
    setDraggedOverServiceId(null);
    handleServiceTypeChange(serviceId);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Listen to SSE updates for real-time updates of tracked or created jobs
  useEffect(() => {
    if (createdJob && createdJob.token) {
      const eventSource = new EventSource("/api/live-updates");
      
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === "job_updated" && parsed.data.id === createdJob.token) {
            setLiveJobStatus(parsed.data);
          }
          if (parsed.type === "job_deleted" && parsed.data.id === createdJob.token) {
            setCreatedJob(null);
            setLiveJobStatus(null);
            setError("Your print request was removed or archived by the operator.");
          }
        } catch (err) {
          console.error("SSE message parsing error in customer desk:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE error in customer view:", err);
        eventSource.close();
      };

      return () => {
        eventSource.close();
      };
    }
  }, [createdJob]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile) return;

    // Check size limit from admin settings (defaulting to 50MB if settings not loaded yet)
    const maxLimitMB = settings?.maxFileSizeMB || 50;
    if (selectedFile.size > maxLimitMB * 1024 * 1024) {
      setError(`File size exceeds the maximum allowed limit of ${maxLimitMB} MB configured by Admin.`);
      setFile(null);
      setFileBase64(null);
      return;
    }

    const isPdf = selectedFile.name.toLowerCase().endsWith(".pdf");
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(selectedFile.name);

    if (!isPdf && !isImage) {
      setError("Unsupported format. Please select a PDF document or JPG/PNG image.");
      setFile(null);
      setFileBase64(null);
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setPdfAnalysisProgress(null);

    try {
      // Analyze file client-side using progressive page counting
      const analysis = await analyzePdfClientSide(selectedFile, (current, total) => {
        setPdfAnalysisProgress({ current, total });
      });
      
      if (analysis.isPasswordProtected) {
        setError("This PDF document is password-protected. Please unlock it before uploading.");
        setFile(null);
        setFileBase64(null);
        return;
      }

      if (analysis.isCorrupted) {
        setError("This file appears to be corrupted, blank, or unsupported.");
        setFile(null);
        setFileBase64(null);
        return;
      }

      // Populate file details and verified pages
      setFile(selectedFile);
      setPagesCount(analysis.totalPages);
      if (analysis.pageSizeDetected && analysis.pageSizeDetected !== "Custom") {
        setPaperSize(analysis.pageSizeDetected as any);
      }

      // Trigger AI Smart Analysis in parallel without reading base64 into memory
      triggerAISmartAnalysis(selectedFile, "");

    } catch (err) {
      console.error("Error verifying file:", err);
      setError("Failed to run document analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setPdfAnalysisProgress(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Smart AI routing analysis
  const triggerAISmartAnalysis = async (currentFile: File, base64: string) => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const res = await fetch("/api/ai/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: currentFile.name,
          description: notes,
          serviceType: serviceType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
        if (data.colorMode) {
          setColorMode(data.colorMode);
        }
      }
    } catch (err) {
      console.error("AI Analysis failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNotesBlur = () => {
    if (file) {
      triggerAISmartAnalysis(file, fileBase64 || "");
    }
  };

  // Pricing Details Calculator Formula
  const getCalculatedPriceDetails = () => {
    const service = services.find(s => s.id === serviceType) || services.find(s => s.name.toLowerCase() === serviceType.toLowerCase());
    
    if (!service) {
      return {
        pricePerPage: 0,
        pagesTotal: 1,
        copiesTotal: copies,
        totalCost: 0,
        totalSheets: 1,
        unitName: "Page",
        detailsLabel: "Loading pricing..."
      };
    }

    let pricePerPage = 0;
    let totalCost = 0;
    let pagesTotal = pagesCount || 1;
    let unitName = "Page";
    let detailsLabel = "";

    if (service.pricingType === "per-page") {
      pricePerPage = colorMode === "color" ? (service.priceColor ?? 15) : (service.priceBW ?? 5);
      unitName = "Page";
      pagesTotal = file ? pagesCount : 1;
      totalCost = pagesTotal * pricePerPage * copies;
      detailsLabel = `₹${pricePerPage}/${unitName} x ${pagesTotal} ${pagesTotal > 1 ? "pages" : "page"} x ${copies} ${copies > 1 ? "copies" : "copy"}`;
    } else if (service.pricingType === "options") {
      const selectedOption = service.options?.find(o => o.id === selectedOptionId) || service.options?.[0];
      if (selectedOption) {
        pricePerPage = selectedOption.price;
        unitName = "Set";
        pagesTotal = 1;
        totalCost = pricePerPage * copies;
        detailsLabel = `${selectedOption.label} (₹${pricePerPage}) x ${copies} ${copies > 1 ? "sets" : "set"}`;
      }
    } else if (service.pricingType === "scan") {
      const singlePrice = service.priceSingle ?? 10;
      const multiPrice = service.priceMulti ?? 8;
      unitName = "Scan";
      pagesTotal = file ? pagesCount : 1;
      const rate = pagesTotal <= 1 ? singlePrice : multiPrice;
      pricePerPage = rate;
      totalCost = (pagesTotal <= 1 ? singlePrice : pagesTotal * multiPrice) * copies;
      detailsLabel = pagesTotal <= 1 
        ? `Single Page (₹${singlePrice}) x ${copies} scan(s)` 
        : `Multi Page (₹${multiPrice}/page x ${pagesTotal} pages) x ${copies} scan(s)`;
    } else if (service.pricingType === "fixed") {
      pricePerPage = service.priceFixed ?? 100;
      unitName = "Service";
      pagesTotal = 1;
      totalCost = pricePerPage * copies;
      detailsLabel = `Flat rate of ₹${pricePerPage} x ${copies} request(s)`;
    }

    const totalSheets = sideMode === "double" ? Math.ceil(pagesTotal / 2) : pagesTotal;

    return {
      pricePerPage,
      pagesTotal,
      copiesTotal: copies,
      totalCost,
      totalSheets,
      unitName,
      detailsLabel
    };
  };

  const priceDetails = getCalculatedPriceDetails();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim()) {
      setError("Please fill out your Name and Mobile Number.");
      return;
    }

    if (phone.length < 10) {
      setError("Please enter a valid 10-digit Mobile Number.");
      return;
    }

    const maxLimit = settings.maxAllowedCopies || 50;
    if (copies > maxLimit) {
      setError(`Maximum of ${maxLimit} copies is allowed per print request.`);
      return;
    }

    if (paperSize === "A4" && settings.allowA4 === false) {
      setError("A4 printing is temporarily unavailable at this center.");
      return;
    }
    if (paperSize === "A3" && settings.allowA3 === false) {
      setError("A3 printing is temporarily unavailable at this center.");
      return;
    }
    if (paperSize === "Legal" && settings.allowLegal === false) {
      setError("Legal document printing is temporarily unavailable at this center.");
      return;
    }
    if (paperSize === "Letter" && settings.allowLetter === false) {
      setError("Letter size printing is temporarily unavailable at this center.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const calculatedDetails = getCalculatedPriceDetails();
      
      let finalNotes = notes;
      const service = services.find(s => s.id === serviceType);
      if (service && service.pricingType === "options") {
        const opt = service.options?.find(o => o.id === selectedOptionId);
        if (opt) {
          finalNotes = `[Selected Option: ${opt.label}] ${notes}`.trim();
        }
      }

      const startPayload = {
        customerName,
        phone,
        serviceType: service?.name || serviceType, // Send human readable name
        fileName: file ? file.name : undefined,
        fileSize: file ? formatSize(file.size) : undefined,
        fileType: file ? file.type : undefined,
        copies,
        colorMode,
        paperSize,
        sideMode,
        notes: finalNotes,
        pagesCount: calculatedDetails.pagesTotal,
        price: calculatedDetails.totalCost,
        isPriority: false,
      };

      // 1. Initiate Realtime Upload on Express Backend
      const startRes = await fetch("/api/jobs/start-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(startPayload),
      });

      if (!startRes.ok) {
        const errData = await startRes.json();
        setError(errData.error || "Failed to initialize document upload queue.");
        setIsSubmitting(false);
        return;
      }

      const uploadInit = await startRes.json();
      const token = uploadInit.token;

      // 2. Perform Real Asynchronous File Reading and XMLHttpRequest Upload with live progress
      setIsUploading(true);
      setUploadProgress(0);

      let finalJobData;
      if (file) {
        // Convert to base64 asynchronously right before upload, saving initial selection memory
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });

        // Send payload via XHR to support precise upload progress tracking
        finalJobData = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `/api/jobs/${token}/complete-upload`, true);
          xhr.setRequestHeader("Content-Type", "application/json");

          let lastReportedProgress = 0;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(percent);

              // Throttle PATCH progress calls to avoid flooding connection requests
              if (percent - lastReportedProgress >= 15 || percent === 100) {
                lastReportedProgress = percent;
                fetch(`/api/jobs/${token}/progress`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ uploadProgress: percent }),
                }).catch((err) => console.error("Error updating progress on server:", err));
              }
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (err) {
                reject(new Error("Failed to parse response"));
              }
            } else {
              reject(new Error(`Server returned status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Network error during upload"));
          
          xhr.send(JSON.stringify({ fileData: base64String }));
        });
      } else {
        // If there's no attachment file, mark progress as 100% immediately
        setUploadProgress(100);
        await fetch(`/api/jobs/${token}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadProgress: 100 }),
        });

        const completeRes = await fetch(`/api/jobs/${token}/complete-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileData: "N/A" }),
        });

        if (!completeRes.ok) {
          throw new Error("Failed to finalize job completion.");
        }
        finalJobData = await completeRes.json();
      }

      if (finalJobData && finalJobData.success) {
        setCreatedJob({
          success: true,
          token: token,
          job: finalJobData.job,
          queuePosition: finalJobData.queuePosition,
          estimatedWaitMinutes: finalJobData.estimatedWaitMinutes,
        });
        setLiveJobStatus(finalJobData.job);
      } else {
        setError("Error finalizing streaming transfer.");
      }

    } catch (err) {
      console.error("Error submitting job:", err);
      setError("Network connection issue. Failed to stream files to desk queue.");
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  // Live Token Tracker Search handler
  const handleTrackTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchToken.trim()) {
      setSearchError("Please enter your queue token.");
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const res = await fetch(`/api/jobs/${searchToken.trim()}`);
      if (res.ok) {
        const jobData = await res.json();
        // Pack into CreatedJobResponse layout to render the success state
        setCreatedJob({
          success: true,
          token: jobData.id,
          job: jobData,
          queuePosition: jobData.queuePosition,
          estimatedWaitMinutes: jobData.estimatedWaitMinutes
        });
        setLiveJobStatus(jobData);
        setCustomerName(jobData.customerName);
        setShowTrackerModal(false);
        setSearchToken("");
      } else {
        setSearchError("No active document found with that token. Check spelling.");
      }
    } catch (err) {
      console.error(err);
      setSearchError("Network error checking token status.");
    } finally {
      setIsSearching(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-850 font-sans pb-24 relative selection:bg-blue-100 selection:text-blue-700">
      {/* Decorative Grid Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-60" />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0 z-40 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">CyberFlow <span className="text-blue-600">AI</span></span>
              <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">Customer Desk</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
            <QrCode className="w-4 h-4 text-blue-600" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-xl mx-auto px-4 mt-8 relative z-10">
        <AnimatePresence mode="wait">
          {!createdJob ? (
            /* UPLOAD FORM VIEW */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" />
                  Direct Printer Ingress
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Upload Documents to Print
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload files directly to our computer queue. Your documents are kept confidential, analyzed by AI, and printed instantly upon security approval. No waiting in counter lines!
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <p className="font-bold">Please correct details</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Section 1: Customer Contact Info */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs font-mono">1</div>
                    <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                      Contact Details
                    </h3>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 font-semibold">Your Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Amit Kumar"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 rounded-xl px-3 py-2 text-sm text-slate-900 transition-colors outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 font-semibold">10-Digit Mobile Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                          className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 transition-colors outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Upload File & Service selection */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs font-mono">2</div>
                    <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                      File & Service Selection
                    </h3>
                  </div>
                  
                  {/* Modern dynamic Service Selection grid */}
                  <div className="space-y-2.5 text-left">
                    <label className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Select Digital Service</label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {services.filter(s => s.enabled).map((service) => {
                        const isSelected = serviceType === service.id;
                        const isDraggedOver = draggedOverServiceId === service.id;
                        
                        // Icon mapping
                        let iconEl = <FileText className="w-5 h-5 text-slate-500" />;
                        if (service.id === "print") iconEl = <Printer className="w-5 h-5 text-blue-600" />;
                        else if (service.id === "xerox") iconEl = <Copy className="w-5 h-5 text-indigo-600" />;
                        else if (service.id === "passport-photo") iconEl = <ImageIcon className="w-5 h-5 text-amber-600" />;
                        else if (service.id === "lamination") iconEl = <Layers className="w-5 h-5 text-rose-600" />;
                        else if (service.id === "scan") iconEl = <Scan className="w-5 h-5 text-emerald-600" />;
                        
                        // Price tag helper
                        let priceTag = "";
                        if (service.pricingType === "per-page") {
                          priceTag = `₹${service.priceBW}/p`;
                        } else if (service.pricingType === "options") {
                          const lowest = service.options && service.options.length > 0 ? Math.min(...service.options.map(o => o.price)) : 15;
                          priceTag = `From ₹${lowest}`;
                        } else if (service.pricingType === "scan") {
                          priceTag = `₹${service.priceSingle}/p`;
                        } else if (service.pricingType === "fixed") {
                          priceTag = `₹${service.priceFixed}`;
                        }

                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => handleServiceTypeChange(service.id)}
                            onDragOver={(e) => handleServiceCardDragOver(e, service.id)}
                            onDragLeave={handleServiceCardDragLeave}
                            onDrop={(e) => handleServiceCardDrop(e, service.id)}
                            className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden outline-none cursor-pointer group ${
                              isDraggedOver
                                ? "bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 scale-[1.02] shadow-md border-dashed"
                                : isSelected
                                ? "bg-blue-50/30 border-blue-500 ring-2 ring-blue-500/10 shadow-sm"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                            }`}
                          >
                            <div className="flex items-start justify-between w-full gap-2 mb-2">
                              <div className={`p-2 rounded-xl transition-colors ${
                                isDraggedOver
                                  ? "bg-emerald-100/50 text-emerald-600"
                                  : isSelected
                                  ? "bg-blue-100/50 text-blue-600"
                                  : "bg-slate-50 text-slate-500 group-hover:bg-slate-100"
                              }`}>
                                {iconEl}
                              </div>
                              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                                isDraggedOver
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : isSelected 
                                  ? "bg-blue-600 text-white border-blue-600" 
                                  : "bg-slate-50 text-slate-600 border-slate-100"
                              }`}>
                                {priceTag}
                              </span>
                            </div>
                            
                            <h4 className={`text-sm font-bold leading-tight ${isSelected ? "text-slate-900" : "text-slate-800"}`}>
                              {service.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-normal font-medium">
                              {service.description}
                            </p>

                            {isSelected && !isDraggedOver && (
                              <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-bl-lg flex items-center justify-center">
                                <div className="w-1 h-1 bg-white rounded-full" />
                              </div>
                            )}

                            {isDraggedOver && (
                              <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-2xs flex flex-col items-center justify-center p-3 text-white text-center z-20 animate-fade-in">
                                <UploadCloud className="w-6 h-6 animate-bounce mb-1" />
                                <span className="text-xs font-black tracking-tight leading-none">Drop to select & upload!</span>
                                <span className="text-[9px] font-medium text-emerald-100 mt-1 truncate max-w-full">
                                  Assigns to {service.name}
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Service Detailed Context */}
                  {(() => {
                    const activeService = services.find(s => s.id === serviceType);
                    if (!activeService) return null;
                    
                    return (
                      <div className="bg-slate-50/60 border border-slate-100 p-4 rounded-2xl space-y-3 text-left">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-500" />
                          <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase">
                            Service Options & Pricing Rules
                          </h4>
                        </div>
                        
                        <p className="text-xs text-slate-600 leading-normal font-medium">
                          {activeService.description}
                        </p>
                        
                        {activeService.supportedFormats && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-100/60 px-2.5 py-1.5 rounded-xl border border-slate-100/40 w-fit">
                            <span className="font-bold text-slate-400">SUPPORTED FORMATS:</span>
                            <span className="font-mono font-semibold text-slate-700">{activeService.supportedFormats}</span>
                          </div>
                        )}

                        {/* Interactive package options for 'options' pricingType */}
                        {activeService.pricingType === "options" && activeService.options && (
                          <div className="space-y-2 mt-2">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                              Choose Package Options *
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {activeService.options.map((opt) => {
                                const isOptSelected = selectedOptionId === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setSelectedOptionId(opt.id)}
                                    className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-all outline-none cursor-pointer ${
                                      isOptSelected
                                        ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                    }`}
                                  >
                                    <span className={`text-[10px] font-bold tracking-wide uppercase ${isOptSelected ? "text-blue-100" : "text-slate-400"}`}>
                                      Package
                                    </span>
                                    <span className="text-xs font-bold block mt-1">
                                      {opt.label}
                                    </span>
                                    <span className={`text-xs font-mono font-black mt-2 block ${isOptSelected ? "text-white" : "text-blue-600"}`}>
                                      ₹{opt.price}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Static descriptive rate sheets for customers to be fully transparent */}
                        {activeService.pricingType === "per-page" && (
                          <div className="grid grid-cols-2 gap-3.5 pt-1.5">
                            <div className="bg-white p-2.5 rounded-xl border border-slate-150/60 text-center shadow-2xs">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Black & White Print</span>
                              <span className="font-mono font-black text-slate-800 text-sm">
                                ₹{activeService.priceBW}/Page
                              </span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-slate-150/60 text-center shadow-2xs">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Full Color Print</span>
                              <span className="font-mono font-black text-slate-800 text-sm">
                                ₹{activeService.priceColor}/Page
                              </span>
                            </div>
                          </div>
                        )}

                        {activeService.pricingType === "scan" && (
                          <div className="grid grid-cols-2 gap-3.5 pt-1.5">
                            <div className="bg-white p-2.5 rounded-xl border border-slate-150/60 text-center shadow-2xs">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Single Page Scan</span>
                              <span className="font-mono font-black text-slate-800 text-sm">
                                ₹{activeService.priceSingle}/Scan
                              </span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-slate-150/60 text-center shadow-2xs">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Multi-Page Scanner</span>
                              <span className="font-mono font-black text-slate-800 text-sm">
                                ₹{activeService.priceMulti}/Page
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {activeService.pricingType === "fixed" && (
                          <div className="bg-white p-3 rounded-xl border border-slate-150/60 flex items-center justify-between shadow-2xs">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Service Rate</span>
                              <span className="text-xs font-bold text-slate-700">Registration assistance fee</span>
                            </div>
                            <span className="font-mono font-black text-blue-600 text-sm bg-blue-50 px-3 py-1 rounded-lg">
                              ₹{activeService.priceFixed} Fixed
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Dynamic File Upload conditional rendering */}
                  {(() => {
                    const activeService = services.find(s => s.id === serviceType);
                    const supportsUpload = !!activeService;
                    if (supportsUpload && !file && !pdfAnalysisProgress) {
                      return (
                        <div className="space-y-1.5">
                          <label className="text-xs text-slate-500 font-semibold">Upload File (PDF, JPG, PNG - Max {settings?.maxFileSizeMB || 50}MB)</label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                          isDragging
                            ? "border-blue-500 bg-blue-50/50"
                            : "border-slate-200 hover:border-blue-400 bg-slate-50/20"
                        }`}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                        />
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {file ? file.name : "Drag & drop file here"}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {file ? formatSize(file.size) : "or click to select from file storage"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

                  {/* Progressive Page Counting Progress Card */}
                  {pdfAnalysisProgress && (
                    <div className="bg-blue-50/60 border border-blue-100 p-5 rounded-2xl text-left space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1.5 uppercase tracking-wider">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          Analyzing PDF...
                        </span>
                        <span className="font-mono font-bold text-blue-700 text-xs">
                          {Math.round((pdfAnalysisProgress.current / pdfAnalysisProgress.total) * 100)}%
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-700 animate-pulse">Counting pages...</span>
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                            ({pdfAnalysisProgress.current} / {pdfAnalysisProgress.total})
                          </span>
                        </div>
                        <div className="w-full bg-slate-200/50 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full transition-all duration-150 rounded-full"
                            style={{ 
                              width: `${(pdfAnalysisProgress.current / pdfAnalysisProgress.total) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {file && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-xs font-semibold text-slate-900 truncate max-w-[220px]">{file.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {formatSize(file.size)} • {pagesCount} {pagesCount === 1 ? "Page" : "Pages"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-bold flex items-center gap-1 border border-emerald-150">
                          <Check className="w-3 h-3" />
                          PDF Verified
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFile(null);
                            setFileBase64(null);
                            setAiAnalysis(null);
                            setPagesCount(1);
                          }}
                          className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI Smart Analyzer Panel */}
                  <AnimatePresence>
                    {(isAnalyzing || aiAnalysis) && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="overflow-hidden bg-blue-50/60 border border-blue-100 p-4 rounded-xl text-left space-y-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between border-b border-blue-100/50 pb-2">
                          <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1 font-sans uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse text-blue-600" />
                            AI Assistant Optimization
                          </span>
                          {isAnalyzing ? (
                            <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Analyzing...
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-150 uppercase tracking-tight">
                              Smart Routed
                            </span>
                          )}
                        </div>

                        {aiAnalysis && (
                          <div className="space-y-3 text-xs">
                            {/* AI Extracted Parameters */}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-white/80 p-2 rounded-lg border border-blue-50 text-center shadow-2xs">
                                <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wide mb-0.5">Pages</span>
                                <span className="font-mono font-black text-slate-800 text-[11px]">
                                  {aiAnalysis.estimatedPages || pagesCount} Sheets
                                </span>
                              </div>
                              <div className="bg-white/80 p-2 rounded-lg border border-blue-50 text-center shadow-2xs">
                                <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wide mb-0.5">Color Mode</span>
                                <span className="font-mono font-black text-slate-800 text-[11px] capitalize">
                                  {aiAnalysis.colorMode === "color" ? "Full Color" : "B&W Mono"}
                                </span>
                              </div>
                              <div className="bg-white/80 p-2 rounded-lg border border-blue-50 text-center shadow-2xs">
                                <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wide mb-0.5">Station</span>
                                <span className="font-mono font-bold text-blue-600 text-[10px] leading-tight block truncate" title={aiAnalysis.suggestedPrinter}>
                                  {aiAnalysis.suggestedPrinter || "Laser Print"}
                                </span>
                              </div>
                            </div>

                            {/* AI Text Insight */}
                            <p className="text-[11px] text-slate-700 italic leading-relaxed bg-white/70 p-2.5 rounded-lg border border-blue-50/50 shadow-2xs">
                              "{aiAnalysis.aiAnalysis}"
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Section 3: Configuration Options */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs font-mono">3</div>
                    <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                      Configuration Details
                    </h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Copies */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 font-semibold">
                        {services.find(s => s.id === serviceType)?.pricingType === "fixed" 
                          ? "Quantity / Requests" 
                          : services.find(s => s.id === serviceType)?.pricingType === "options" 
                            ? "Number of Sets" 
                            : "Number of Copies"}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCopies(Math.max(1, copies - 1))}
                          className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={settings.maxAllowedCopies || 50}
                          value={copies}
                          onChange={(e) => {
                            let val = parseInt(e.target.value) || 1;
                            const maxLimit = settings.maxAllowedCopies || 50;
                            if (val > maxLimit) val = maxLimit;
                            setCopies(Math.max(1, val));
                          }}
                          className="flex-1 text-center bg-slate-50/80 border border-slate-200 rounded-lg py-1.5 font-mono font-bold text-sm text-slate-800 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const maxLimit = settings.maxAllowedCopies || 50;
                            setCopies(Math.min(maxLimit, copies + 1));
                          }}
                          className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Color vs BW */}
                    {services.find(s => s.id === serviceType)?.pricingType === "per-page" && (
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-semibold">Color Mode</label>
                        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setColorMode("bw")}
                            className={`py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                              colorMode === "bw"
                                ? "bg-white text-slate-950 shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            B&W (₹{services.find(s => s.id === serviceType)?.priceBW ?? settings.pricePerBWPage}/p)
                          </button>
                          <button
                            type="button"
                            onClick={() => setColorMode("color")}
                            className={`py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                              colorMode === "color"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Color (₹{services.find(s => s.id === serviceType)?.priceColor ?? settings.pricePerColorPage}/p)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Paper Size */}
                    {services.find(s => s.id === serviceType)?.pricingType === "per-page" && (
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-semibold">Paper Layout Size</label>
                        <select
                          value={paperSize}
                          onChange={(e: any) => setPaperSize(e.target.value)}
                          className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none"
                        >
                          {(settings.allowA4 === undefined || settings.allowA4) && <option value="A4">A4 (Standard Desk)</option>}
                          {(settings.allowA3 === undefined || settings.allowA3) && <option value="A3">A3 (Poster Size)</option>}
                          {(settings.allowLegal === undefined || settings.allowLegal) && <option value="Legal">Legal (CSC Fillings)</option>}
                          {(settings.allowLetter === undefined || settings.allowLetter) && <option value="Letter">Letter Size</option>}
                          {settings.allowA4 === false && settings.allowA3 === false && settings.allowLegal === false && settings.allowLetter === false && (
                            <option value="A4">A4 (Standard Desk)</option>
                          )}
                        </select>
                      </div>
                    )}

                    {/* Sides */}
                    {services.find(s => s.id === serviceType)?.pricingType === "per-page" && (
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-semibold">Duplex Mode</label>
                        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setSideMode("single")}
                            className={`py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                              sideMode === "single"
                                ? "bg-white text-slate-950 shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Single-Side
                          </button>
                          <button
                            type="button"
                            onClick={() => setSideMode("double")}
                            className={`py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                              sideMode === "double"
                                ? "bg-white text-slate-950 shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Double-Sided
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5 pt-1 text-left">
                    <label className="text-xs text-slate-500 font-semibold">
                      {services.find(s => s.id === serviceType)?.pricingType === "fixed" 
                        ? "Applicant Details (Name, Aadhaar, DOB, Phone, etc.)" 
                        : "Special Print Notes / Bindings / Details"}
                    </label>
                    <textarea
                      placeholder={services.find(s => s.id === serviceType)?.pricingType === "fixed"
                        ? "e.g. Applicant: Amit Kumar, Aadhaar: 1234 5678 9012, Birth Date: 15/08/1995"
                        : "e.g. Please bind these pages together, print slides 2 per page, or use certificate paper."}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onBlur={handleNotesBlur}
                      rows={2}
                      className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none transition-colors"
                    />
                  </div>

                  {/* Live Price Calculator Widget */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200/60 pb-2">
                      <span className="flex items-center gap-1.5">
                        <Printer className="w-4 h-4 text-blue-600" />
                        Live Price Estimation
                      </span>
                      <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">
                        Auto Recalculating
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Service Requested:</span>
                        <span className="font-semibold text-slate-800">
                          {services.find(s => s.id === serviceType)?.name ?? serviceType}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Unit Rate:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          ₹{priceDetails.pricePerPage} per {priceDetails.unitName}
                        </span>
                      </div>
                      {file && (
                        <div className="flex justify-between text-slate-600">
                          <span>Verified Volume:</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {priceDetails.pagesTotal} {priceDetails.unitName}{priceDetails.pagesTotal > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600">
                        <span>Quantity / Copies:</span>
                        <span className="font-mono font-semibold text-slate-800">{priceDetails.copiesTotal}x</span>
                      </div>
                      {sideMode === "double" && file && (
                        <div className="flex justify-between text-slate-600">
                          <span>Total Paper Sheets:</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {priceDetails.totalSheets} Sheets (Duplex)
                          </span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-200/60 flex justify-between items-baseline">
                        <span className="font-bold text-slate-800">Estimated Total:</span>
                        <div className="text-right">
                          <span className="text-xl font-extrabold text-slate-950 font-mono">₹{priceDetails.totalCost}</span>
                          <span className="block text-[9px] text-slate-400 font-medium">All inclusive price</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting || isAnalyzing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white py-3.5 px-6 rounded-2xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  id="btn-customer-submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading Live Stream...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Upload to Counter & Get Token
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            /* TOKEN SUCCESS VIEW WITH QUEUE TIMELINE */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6 text-center"
            >
              {/* Apple-style Premium Success Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-8 relative overflow-hidden space-y-6 shadow-sm">
                <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">Document Upload Complete!</h2>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Your request has been routed to the active printing terminal. Take a seat.
                  </p>
                </div>

                {/* High-Contrast Token Display */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 max-w-xs mx-auto text-center space-y-1 shadow-inner">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                    Your Queue Token
                  </span>
                  <div className="text-5xl font-black tracking-wider font-mono text-slate-900">
                    {createdJob.token}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 truncate mt-1">
                    Customer: {customerName}
                  </div>
                </div>

                {/* Queue status metrics */}
                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                  <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Queue Position</span>
                    <span className="text-lg font-black font-mono text-slate-900">
                      {liveJobStatus ? liveJobStatus.queuePosition : createdJob.queuePosition}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Estimated Wait</span>
                    <span className="text-lg font-black font-mono text-blue-600">
                      {liveJobStatus ? liveJobStatus.estimatedWaitMinutes : createdJob.estimatedWaitMinutes} Mins
                    </span>
                  </div>
                </div>

                {/* Real-time Status Tracker timeline */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Live Queue Status</span>
                    <span className="font-mono text-blue-600 animate-pulse text-[10px] flex items-center gap-1 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Real-time Synced
                    </span>
                  </div>

                  {/* Horizontal Timeline */}
                  <div className="relative pt-4 pb-2">
                    {/* Background track line */}
                    <div className="absolute top-7 left-3 right-3 h-0.5 bg-slate-100" />
                    
                    {/* Active line tracking */}
                    <div 
                      className="absolute top-7 left-3 h-0.5 bg-blue-600 transition-all duration-1000"
                      style={{
                        width: liveJobStatus?.status === "Printing" 
                          ? "50%" 
                          : liveJobStatus?.status === "Completed" 
                            ? "100%" 
                            : "0%"
                      }}
                    />

                    {/* Steps dots */}
                    <div className="grid grid-cols-3 relative text-center">
                      {/* Step 1: Received */}
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold z-10 transition-all duration-350 ${
                          liveJobStatus?.status === "Waiting" || liveJobStatus?.status === "Printing" || liveJobStatus?.status === "Completed"
                            ? "bg-blue-600 text-white ring-4 ring-blue-50"
                            : "bg-slate-200 text-slate-500"
                        }`}>
                          {liveJobStatus?.status === "Printing" || liveJobStatus?.status === "Completed" ? <Check className="w-3.5 h-3.5" /> : "1"}
                        </div>
                        <span className="text-[10px] mt-2 font-bold text-slate-800">Uploaded</span>
                      </div>

                      {/* Step 2: Printing */}
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold z-10 transition-all duration-350 ${
                          liveJobStatus?.status === "Printing" || liveJobStatus?.status === "Completed"
                            ? "bg-blue-600 text-white ring-4 ring-blue-50"
                            : "bg-slate-200 text-slate-500"
                        }`}>
                          {liveJobStatus?.status === "Completed" ? <Check className="w-3.5 h-3.5" /> : "2"}
                        </div>
                        <span className="text-[10px] mt-2 font-bold text-slate-800">Printing</span>
                      </div>

                      {/* Step 3: Ready */}
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold z-10 transition-all duration-350 ${
                          liveJobStatus?.status === "Completed"
                            ? "bg-emerald-500 text-white ring-4 ring-emerald-50"
                            : "bg-slate-200 text-slate-500"
                        }`}>
                          {liveJobStatus?.status === "Completed" ? <Check className="w-3.5 h-3.5" /> : "3"}
                        </div>
                        <span className="text-[10px] mt-2 font-bold text-slate-800">Completed</span>
                      </div>
                    </div>
                  </div>

                  {liveJobStatus?.status === "Completed" && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium text-left"
                    >
                      🎉 Your document has been printed and is ready at the operator desk! Please present Token <strong className="font-mono text-sm underline">{createdJob.token}</strong> to receive your copies.
                    </motion.div>
                  )}
                  {liveJobStatus?.status === "Printing" && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-medium text-left"
                    >
                      🖨️ Your document is currently rolling out of the printer terminal. Just a few seconds!
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                <button
                  onClick={() => {
                    setCreatedJob(null);
                    setLiveJobStatus(null);
                    setFile(null);
                    setFileBase64(null);
                  }}
                  className="flex-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-colors shadow-xs"
                >
                  Upload Another Document
                </button>
                <button
                  onClick={() => {
                    setCreatedJob(null);
                    setLiveJobStatus(null);
                    setFile(null);
                    setFileBase64(null);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-colors shadow-xs"
                >
                  Return to Form
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FLOATING ACTION TOOL: Track My Token */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowTrackerModal(true)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4.5 py-3 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer animate-bounce"
        >
          <Search className="w-4 h-4 text-blue-400" />
          Track Existing Token
        </button>
      </div>

      {/* Real-time Upload Progress Overlay */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-6 text-center"
            >
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-pulse" />
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="#2563EB"
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 32}
                      strokeDashoffset={2 * Math.PI * 32 * (1 - uploadProgress / 100)}
                      className="transition-all duration-300"
                    />
                  </svg>
                  <span className="absolute text-lg font-black font-mono text-slate-900">
                    {uploadProgress}%
                  </span>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    Uploading... {uploadProgress}%
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto font-medium">
                    {uploadProgress < 100 ? "Uploading document bytes to counter queue..." : "Verifying & finalizing queue handoff..."}
                  </p>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-left space-y-1.5 text-xs">
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>File Name:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[150px]">{file?.name}</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>Pages Detected:</span>
                  <span className="font-bold text-slate-800">{priceDetails.pagesTotal}</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>Estimated Cost:</span>
                  <span className="font-bold text-blue-600">₹{priceDetails.totalCost}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Do not close this page or lock your screen
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle Admin Footer gate, completely invisible to normal customers unless looked for */}
      <footer className="absolute bottom-4 left-0 right-0 text-center pointer-events-none z-10">
        <span 
          onClick={onNavigateToAdmin}
          className="text-[10px] text-slate-300 hover:text-slate-500 transition-colors pointer-events-auto cursor-pointer"
        >
          System Management Panel
        </span>
      </footer>

      {/* TRACKER LIGHT MODAL */}
      <AnimatePresence>
        {showTrackerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-xl relative text-left"
            >
              <button
                onClick={() => {
                  setShowTrackerModal(false);
                  setSearchError("");
                }}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <Search className="w-5 h-5 text-blue-600" />
                    Track Printer Queue
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-normal">
                    Enter the 4-digit token generated during your file upload to watch queue position in real-time.
                  </p>
                </div>

                {searchError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                    <p>{searchError}</p>
                  </div>
                )}

                <form onSubmit={handleTrackTokenSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Token Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. A015"
                      maxLength={8}
                      value={searchToken}
                      onChange={(e) => setSearchToken(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl py-2.5 font-mono text-center text-lg font-black tracking-widest text-slate-800 transition-all outline-none"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Fetching Queue Logs...
                      </>
                    ) : (
                      "Track Queue Live"
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
