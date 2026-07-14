import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  UploadCloud, Loader2, CheckCircle2, QrCode, FileText, 
  Trash2, Check, RefreshCw, AlertTriangle, Phone, Sparkles, Search, X, Printer, Settings
} from "lucide-react";

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

export default function CustomerUploadView({ onNavigateToAdmin }: CustomerUploadViewProps) {
  // Form State
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("Print");
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<"bw" | "color">("bw");
  const [paperSize, setPaperSize] = useState<"A4" | "A3" | "Legal" | "Letter">("A4");
  const [sideMode, setSideMode] = useState<"single" | "double">("single");
  const [notes, setNotes] = useState("");
  
  // File State
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // UI Flow State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdJob, setCreatedJob] = useState<CreatedJobResponse | null>(null);
  const [liveJobStatus, setLiveJobStatus] = useState<any | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI assistant preview state
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Floating Tracker Dialog state
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [searchToken, setSearchToken] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll for token status updates if token successfully created or tracked
  useEffect(() => {
    let interval: any;
    if (createdJob && createdJob.token) {
      setIsPolling(true);
      const fetchStatus = async () => {
        try {
          const res = await fetch(`/api/jobs/${createdJob.token}`);
          if (res.ok) {
            const data = await res.json();
            setLiveJobStatus(data);
          }
        } catch (err) {
          console.error("Error polling job status", err);
        }
      };

      fetchStatus();
      interval = setInterval(fetchStatus, 4000); // Check every 4 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
      setIsPolling(false);
    };
  }, [createdJob]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File exceeds maximum 10MB size limit.");
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Read file as base64 DataURL
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFileBase64(base64String);
      triggerAISmartAnalysis(selectedFile, base64String);
    };
    reader.readAsDataURL(selectedFile);
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

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        customerName,
        phone,
        serviceType,
        fileName: file ? file.name : undefined,
        fileSize: file ? `${(file.size / 1024).toFixed(0)} KB` : undefined,
        fileType: file ? file.type : undefined,
        fileData: fileBase64 || undefined,
        copies,
        colorMode,
        paperSize,
        sideMode,
        notes,
        isPriority: false,
      };

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data: CreatedJobResponse = await res.json();
        setCreatedJob(data);
        setLiveJobStatus(data.job);
      } else {
        const errData = await res.json();
        setError(errData.error || "Submission failed. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting job:", err);
      setError("Network error. Failed to send details to shop.");
    } finally {
      setIsSubmitting(false);
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
                  
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-semibold">Service Requested</label>
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="Print">Print Documents (PDF, Resume, Form)</option>
                      <option value="Photocopy">Xerox / Photocopy (ID, Marksheets)</option>
                      <option value="Scanning">High-Res Document Scanning</option>
                      <option value="Passport Photo">Passport Size Photos</option>
                      <option value="Lamination">Lamination (A4 or Custom Card size)</option>
                      <option value="CSC Service">CSC Government Registration Application</option>
                    </select>
                  </div>

                  {serviceType !== "Lamination" && serviceType !== "Passport Photo" && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-500 font-semibold">Upload File (PDF, JPG, PNG - Max 10MB)</label>
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
                  )}

                  {file && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-xs font-semibold text-slate-900 truncate max-w-[220px]">{file.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{formatSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setFileBase64(null);
                          setAiAnalysis(null);
                        }}
                        className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* AI Smart Analyzer Panel */}
                  <AnimatePresence>
                    {(isAnalyzing || aiAnalysis) && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="overflow-hidden bg-blue-50/60 border border-blue-100 p-4 rounded-xl text-left space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1 font-sans uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse text-blue-600" />
                            AI Assistant Optimization
                          </span>
                          {isAnalyzing && <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />}
                        </div>
                        {aiAnalysis && (
                          <div className="text-xs space-y-1.5">
                            <p className="text-slate-700 italic leading-relaxed bg-white/70 p-2 rounded-lg border border-blue-50/50">
                              "{aiAnalysis.aiAnalysis}"
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-slate-500 text-[10px] pt-1">
                              <div>Pages: <span className="text-slate-900 font-bold">{aiAnalysis.estimatedPages}</span></div>
                              <div>Mode: <span className="text-slate-900 font-bold uppercase">{aiAnalysis.colorMode}</span></div>
                              <div>Printer: <span className="text-slate-900 font-bold">{aiAnalysis.suggestedPrinter}</span></div>
                              <div className="text-emerald-600 font-bold">Estimated Cost: Rs. {aiAnalysis.priceQuote}</div>
                            </div>
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
                      <label className="text-xs text-slate-500 font-semibold">Number of Copies</label>
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
                          max={100}
                          value={copies}
                          onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 text-center bg-slate-50/80 border border-slate-200 rounded-lg py-1.5 font-mono font-bold text-sm text-slate-800 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setCopies(copies + 1)}
                          className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Color vs BW */}
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
                          B&W (Rs. 5/p)
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
                          Color (Rs. 15/p)
                        </button>
                      </div>
                    </div>

                    {/* Paper Size */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 font-semibold">Paper Layout Size</label>
                      <select
                        value={paperSize}
                        onChange={(e: any) => setPaperSize(e.target.value)}
                        className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                      >
                        <option value="A4">A4 (Standard Desk)</option>
                        <option value="A3">A3 (Poster Size)</option>
                        <option value="Legal">Legal (CSC Fillings)</option>
                        <option value="Letter">Letter Size</option>
                      </select>
                    </div>

                    {/* Sides */}
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
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs text-slate-500 font-semibold">Special Print Notes / Bindings</label>
                    <textarea
                      placeholder="e.g. Please bind these pages together, print slides 2 per page, or use certificate paper."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onBlur={handleNotesBlur}
                      rows={2}
                      className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none transition-colors"
                    />
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
                      Queuing Document on Desk...
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
                  <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">Document Queued Successfully!</h2>
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
                      Live Syncing
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
                        <span className="text-[10px] mt-2 font-bold text-slate-800">Received</span>
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
                            ? "bg-emerald-500 text-white ring-4 ring-emerald-50 animate-bounce"
                            : "bg-slate-200 text-slate-500"
                        }`}>
                          "3"
                        </div>
                        <span className="text-[10px] mt-2 font-bold text-slate-800">Ready</span>
                      </div>
                    </div>
                  </div>

                  {liveJobStatus?.status === "Completed" && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium text-left"
                    >
                      🎉 Your document has been printed and is ready at the operator desk! Please present Token <strong>{createdJob.token}</strong> to receive your copies.
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
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4.5 py-3 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Search className="w-4 h-4 text-blue-400" />
          Track Existing Token
        </button>
      </div>

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
