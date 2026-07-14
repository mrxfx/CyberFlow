import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Printer, Users, DollarSign, Clock, RefreshCw, CheckCircle2, AlertTriangle, 
  Search, Eye, Trash2, Sliders, Play, Settings, FileText, Globe, Clipboard, 
  HelpCircle, UserCheck, ShieldAlert, Cpu, Sparkles, LogOut, Plus, X, ListCollapse,
  ChevronRight, HardDrive, ToggleLeft, ToggleRight, Check, Loader2, ArrowLeft, ExternalLink
} from "lucide-react";
import { Job, CSCLog, ShopSettings, AnalyticsStats, Service, ServiceOption } from "../types";
import PdfPreview from "./PdfPreview";

interface AdminDashboardViewProps {
  onLogout: () => void;
}

export default function AdminDashboardView({ onLogout }: AdminDashboardViewProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<"dashboard" | "queue" | "csc" | "ai-filler" | "insights" | "settings" | "services">("dashboard");

  // Database States
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cscLogs, setCscLogs] = useState<CSCLog[]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [queueSearch, setQueueSearch] = useState("");
  const [queueFilter, setQueueFilter] = useState<string>("All");

  // CSC Search States
  const [cscSearch, setCscSearch] = useState("");
  const [cscFilter, setCscFilter] = useState<string>("All");

  // Modals & Dynamic states
  const [viewingFileJob, setViewingFileJob] = useState<Job | null>(null);
  const [isAddingCsc, setIsAddingCsc] = useState(false);
  const [newCscName, setNewCscName] = useState("");
  const [newCscPhone, setNewCscPhone] = useState("");
  const [newCscService, setNewCscService] = useState("PAN Card");
  const [newCscFee, setNewCscFee] = useState(150);
  const [newCscNotes, setNewCscNotes] = useState("");

  // Dynamic Services States
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAddingService, setIsAddingService] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [servicePricingType, setServicePricingType] = useState<"per-page" | "options" | "scan" | "fixed">("per-page");
  const [servicePriceBW, setServicePriceBW] = useState(5);
  const [servicePriceColor, setServicePriceColor] = useState(15);
  const [servicePriceSingle, setServicePriceSingle] = useState(10);
  const [servicePriceMulti, setServicePriceMulti] = useState(8);
  const [servicePriceFixed, setServicePriceFixed] = useState(100);
  const [serviceFormats, setServiceFormats] = useState("");
  const [serviceRules, setServiceRules] = useState("");
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newOptionPrice, setNewOptionPrice] = useState(0);

  // AI OCR Extractor States
  const [ocrRawText, setOcrRawText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);

  // AI Consulting State
  const [aiInsights, setAiInsights] = useState("");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Virtual Desktop Print Client Simulator Log State
  const [printSimulatorLogs, setPrintSimulatorLogs] = useState<string[]>([
    "[System] Virtual Windows Print Client v1.2.0 initialized.",
    "[System] Listening to Express backend /api/jobs queue...",
    "[System] Background print automation status: Ready."
  ]);
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(true);
  const [liveToast, setLiveToast] = useState<{ id: string; message: string } | null>(null);

  // Synthesize a beautiful digital dual-tone chime using Web Audio API
  const playNotificationChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // Tone 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.6);

      // Tone 2 (staggered slightly for beautiful chime)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.8);
      }, 100);

    } catch (e) {
      console.error("Audio chime synthesis failed:", e);
    }
  };

  const showLiveToast = (message: string) => {
    const id = Math.random().toString();
    setLiveToast({ id, message });
    playNotificationChime();
    
    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setLiveToast(prev => prev?.id === id ? null : prev);
    }, 6000);
  };

  // Load Database values
  const loadAllData = async () => {
    try {
      const [jobsRes, cscRes, statsRes, settingsRes, servicesRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/csc-logs"),
        fetch("/api/stats"),
        fetch("/api/settings"),
        fetch("/api/services")
      ]);

      if (jobsRes.ok && cscRes.ok && statsRes.ok && settingsRes.ok && servicesRes.ok) {
        const jData = await jobsRes.json();
        setJobs(jData);
        setCscLogs(await cscRes.json());
        setStats(await statsRes.json());
        setSettings(await settingsRes.json());
        setServices(await servicesRes.json());
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial data fetch
    loadAllData();

    // Subscribe to SSE updates for real-time live events
    const eventSource = new EventSource("/api/live-updates");

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        
        if (parsed.type === "job_created") {
          showLiveToast(`New Request: Token ${parsed.data.id} uploaded by ${parsed.data.customerName}!`);
          setJobs(prev => {
            if (prev.some(j => j.id === parsed.data.id)) return prev;
            return [parsed.data, ...prev];
          });
          // Refresh statistics
          fetch("/api/stats")
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error(err));
        } else if (parsed.type === "job_updated") {
          setJobs(prev => {
            const index = prev.findIndex(j => j.id === parsed.data.id);
            if (index !== -1 && prev[index].status !== parsed.data.status) {
              if (parsed.data.status === "Waiting") {
                showLiveToast(`Upload Completed: Token ${parsed.data.id} is now waiting for print approval.`);
              }
            }
            return prev.map(j => j.id === parsed.data.id ? parsed.data : j);
          });
          
          fetch("/api/stats")
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error(err));
        } else if (parsed.type === "job_deleted") {
          setJobs(prev => prev.filter(j => j.id === parsed.data.id));
          fetch("/api/stats")
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error(err));
        }
      } catch (err) {
        console.error("Error handling SSE stream in Admin back-office:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE stream error in Admin back-office, falling back to 5s polling intervals...", err);
      eventSource.close();
    };

    // Keep background polling as secondary safety fallback every 10 seconds
    const interval = setInterval(loadAllData, 10000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  // Simulator Print Action Sync
  // Watch if there is a 'Waiting' or 'Printing' job in the queue to log in the print client console
  useEffect(() => {
    if (!isSimulatorRunning) return;

    const printingJob = jobs.find(j => j.status === "Printing");
    if (printingJob) {
      const lastLog = printSimulatorLogs[printSimulatorLogs.length - 1];
      const printingLog = `[Client] Processing Token ${printingJob.id} ("${printingJob.fileName || "Print Request"}") on printer: [${printingJob.assignedPrinter}]`;
      if (!lastLog.includes(printingJob.id)) {
        setPrintSimulatorLogs(prev => [...prev.slice(-10), printingLog]);
      }
    }
  }, [jobs, isSimulatorRunning]);

  // Execute Simulated Print Command
  const handlePrintCommand = async (jobId: string) => {
    try {
      setPrintSimulatorLogs(prev => [...prev, `[Manual Trigger] Requesting print stream for Token ${jobId}...`]);
      const res = await fetch(`/api/jobs/${jobId}/print`, { method: "POST" });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Job Status
  const handleUpdateJobStatus = async (jobId: string, status: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setPrintSimulatorLogs(prev => [...prev, `[System] Job ${jobId} status updated to: ${status}`]);
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Job
  const handleDeleteJob = async (jobId: string) => {
    if (!confirm(`Are you sure you want to delete job ${jobId}?`)) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        setPrintSimulatorLogs(prev => [...prev, `[System] Job ${jobId} deleted.`]);
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit CSC log
  const handleAddCscLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/csc-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newCscName,
          phone: newCscPhone,
          serviceName: newCscService,
          fee: newCscFee,
          notes: newCscNotes
        })
      });

      if (res.ok) {
        setIsAddingCsc(false);
        setNewCscName("");
        setNewCscPhone("");
        setNewCscNotes("");
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update CSC Status
  const handleUpdateCscStatus = async (logId: string, status: string) => {
    try {
      const res = await fetch(`/api/csc-logs/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (updatedSettings: ShopSettings) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings)
      });
      if (res.ok) {
        setSettings(updatedSettings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Start Add Service
  const handleStartAddService = () => {
    setServiceName("");
    setServiceDesc("");
    setServicePricingType("per-page");
    setServicePriceBW(5);
    setServicePriceColor(15);
    setServicePriceSingle(10);
    setServicePriceMulti(8);
    setServicePriceFixed(100);
    setServiceFormats("PDF, Images");
    setServiceRules("");
    setServiceOptions([]);
    setNewOptionLabel("");
    setNewOptionPrice(0);
    setEditingService(null);
    setIsAddingService(true);
  };

  // Start Edit Service
  const handleStartEditService = (service: Service) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceDesc(service.description);
    setServicePricingType(service.pricingType);
    setServicePriceBW(service.priceBW ?? 5);
    setServicePriceColor(service.priceColor ?? 15);
    setServicePriceSingle(service.priceSingle ?? 10);
    setServicePriceMulti(service.priceMulti ?? 8);
    setServicePriceFixed(service.priceFixed ?? 100);
    setServiceFormats(service.supportedFormats ?? "PDF, Images");
    setServiceRules(service.pricingRules ?? "");
    setServiceOptions(service.options ?? []);
    setNewOptionLabel("");
    setNewOptionPrice(0);
    setIsAddingService(false);
  };

  // Toggle Service Enabled State
  const handleToggleService = async (service: Service) => {
    try {
      const updated = { ...service, enabled: !service.enabled };
      const res = await fetch(`/api/services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Service
  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to permanently delete this service? All existing orders for this service type will show its cached metadata.")) return;
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Service (Create or Update)
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      alert("Service name is required!");
      return;
    }

    const payload: Partial<Service> = {
      name: serviceName,
      description: serviceDesc,
      pricingType: servicePricingType,
      supportedFormats: serviceFormats,
      pricingRules: serviceRules,
      enabled: editingService ? editingService.enabled : true,
    };

    if (servicePricingType === "per-page") {
      payload.priceBW = servicePriceBW;
      payload.priceColor = servicePriceColor;
    } else if (servicePricingType === "scan") {
      payload.priceSingle = servicePriceSingle;
      payload.priceMulti = servicePriceMulti;
    } else if (servicePricingType === "fixed") {
      payload.priceFixed = servicePriceFixed;
    } else if (servicePricingType === "options") {
      payload.options = serviceOptions;
    }

    try {
      if (editingService) {
        const res = await fetch(`/api/services/${editingService.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...editingService, ...payload })
        });
        if (res.ok) {
          setEditingService(null);
          loadAllData();
        }
      } else {
        const slug = serviceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: slug, ...payload })
        });
        if (res.ok) {
          setIsAddingService(false);
          loadAllData();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run AI Form Data Extraction
  const handleAIExtract = async () => {
    if (!ocrRawText.trim()) return;
    setIsExtracting(true);
    try {
      const res = await fetch("/api/ai/csc-form-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: ocrRawText })
      });
      if (res.ok) {
        const data = await res.json();
        setExtractedData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Generate Gemini Business Insights
  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const res = await fetch("/api/ai/analytics-insights", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAiInsights(data.insight);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Helper formatting
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Filter Jobs list
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.customerName.toLowerCase().includes(queueSearch.toLowerCase()) || 
                          job.id.toLowerCase().includes(queueSearch.toLowerCase()) ||
                          job.phone.includes(queueSearch);
    const matchesFilter = queueFilter === "All" 
      ? job.status !== "Uploading" 
      : job.status === queueFilter;
    return matchesSearch && matchesFilter;
  });

  // Filter CSC logs list
  const filteredCscLogs = cscLogs.filter(log => {
    const matchesSearch = log.customerName.toLowerCase().includes(cscSearch.toLowerCase()) || 
                          log.phone.includes(cscSearch) ||
                          log.serviceName.toLowerCase().includes(cscSearch.toLowerCase());
    const matchesFilter = cscFilter === "All" || log.status === cscFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Syncing Back-office Operations Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex relative">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between p-4 sticky top-0 h-screen select-none z-35 shadow-xs">
        <div className="space-y-8">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-1.5 border-b border-slate-100 pb-4">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-slate-900 tracking-tight block text-base">CyberFlow AI</span>
              <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md mt-0.5 inline-block">ADMIN BACKSTAGE</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-blue-50 text-blue-700 shadow-xs border-r-2 border-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Cpu className="w-4 h-4" />
              Overview & Simulator
            </button>

            <button
              onClick={() => setActiveTab("queue")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "queue"
                  ? "bg-blue-50 text-blue-700 shadow-xs border-r-2 border-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                Print Queue
              </span>
              {jobs.filter(j => j.status === "Waiting").length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px]">
                  {jobs.filter(j => j.status === "Waiting").length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("csc")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "csc"
                  ? "bg-blue-50 text-blue-700 shadow-xs border-r-2 border-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-3">
                <Globe className="w-4 h-4" />
                CSC Logbook
              </span>
              {cscLogs.filter(l => l.status === "Pending").length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold text-[9px]">
                  {cscLogs.filter(l => l.status === "Pending").length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("ai-filler")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "ai-filler"
                  ? "bg-blue-50 text-blue-700 shadow-xs border-r-2 border-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              AI Form Extractor
            </button>

            <button
              onClick={() => setActiveTab("insights")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "insights"
                  ? "bg-blue-50 text-blue-700 shadow-xs border-r-2 border-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              Business Consultant
            </button>

            <button
              onClick={() => setActiveTab("services")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "services"
                  ? "bg-blue-50 text-blue-700 shadow-xs border-r-2 border-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Sliders className="w-4 h-4 text-emerald-600" />
              Service Catalog
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-blue-50 text-blue-700 shadow-xs border-r-2 border-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Settings className="w-4 h-4" />
              Cafe Settings
            </button>
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="border-t border-slate-100 pt-4 pb-2 space-y-3">
          <div className="flex items-center gap-2.5 px-2 text-xs">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-700 border border-blue-200">
              AD
            </div>
            <div className="overflow-hidden">
              <span className="font-bold block text-slate-800 truncate">Store Manager</span>
              <span className="text-[10px] text-slate-400 font-mono truncate block">admin@cyberflow.ai</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 justify-center py-2 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200 hover:border-red-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            Lock Workspace
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Header Ribbon */}
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === "dashboard" && "Center Operations Command Hub"}
              {activeTab === "queue" && "Customer Printing Queue"}
              {activeTab === "csc" && "Government CSC Registrations log"}
              {activeTab === "ai-filler" && "AI Fast Form Extractor"}
              {activeTab === "insights" && "Gemini Retail Consulting insights"}
              {activeTab === "services" && "Service Catalog & Custom Pricing Management"}
              {activeTab === "settings" && "General Center Settings"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Outlet: <strong>{settings?.shopName || "CyberFlow AI - Main Desk"}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-slate-600 font-mono font-medium">
              Queue Load: <span className="text-blue-600 font-bold">{jobs.filter(j => j.status === "Waiting").length} Pending</span>
            </div>
            <button
              onClick={loadAllData}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shadow-xs"
              title="Sync Database"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Tab Modules workspace */}
        <main className="p-8 flex-1 space-y-8">
          
          {/* TAB 1: OVERVIEW & SIMULATOR CLIENT */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Premium Stat Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                  <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase block">Total Operations</span>
                  <div className="text-2xl font-black font-mono text-slate-900">{stats?.totalCustomers || 0}</div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    Combined Print + CSC Logs
                  </p>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                  <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase block">Completed Revenue</span>
                  <div className="text-2xl font-black font-mono text-emerald-600">Rs. {stats?.totalRevenue || 0}</div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    Billed & Released Assets
                  </p>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                  <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase block">Queue Wait</span>
                  <div className="text-2xl font-black font-mono text-amber-600">{stats?.pendingJobs || 0} Jobs</div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Awaiting operator release
                  </p>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                  <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase block">Spool Client</span>
                  <div className="text-2xl font-black font-mono text-indigo-600">Active</div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Printer className="w-3.5 h-3.5 text-indigo-500" />
                    Listening background client
                  </p>
                </div>
              </div>

              {/* Live Active Upload Streams */}
              {jobs.filter(j => j.status === "Uploading").length > 0 && (
                <div className="bg-blue-50/40 border border-blue-100 p-6 rounded-3xl space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-ping" />
                      Live Client Upload Streams ({jobs.filter(j => j.status === "Uploading").length})
                    </h4>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-mono font-bold animate-pulse">
                      Direct Wire Active
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobs.filter(j => j.status === "Uploading").map((job) => (
                      <div key={job.id} className="bg-white border border-blue-200/60 p-4 rounded-2xl shadow-xs space-y-3 relative overflow-hidden">
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              TOKEN {job.id}
                            </span>
                            <h5 className="font-bold text-slate-800 text-xs mt-1.5">{job.customerName}</h5>
                            <p className="text-[10px] text-slate-400 font-mono">{job.phone}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black font-mono text-blue-600">{job.uploadProgress || 0}%</span>
                            <span className="block text-[9px] text-slate-400 font-medium">spooled</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${job.uploadProgress || 0}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-medium text-slate-400">
                            <span className="truncate max-w-[140px]">{job.fileName || "Streaming details..."}</span>
                            <span className="animate-pulse text-blue-600 font-semibold">Receiving...</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Two Column Layout: Main queue + Windows Client Simulator */}
              <div className="grid lg:grid-cols-3 gap-8">
                
                {/* Simulated Windows Desktop Agent console (1 Column) */}
                <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-3xl shadow-xs flex flex-col justify-between h-[480px]">
                  <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-sm font-bold text-slate-800">Spool Client Daemon</h3>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">Auto Print</span>
                        <button
                          onClick={async () => {
                            if (!settings) return;
                            const nextAuto = !settings.autoPrint;
                            const nextSet = { ...settings, autoPrint: nextAuto };
                            setSettings(nextSet);
                            handleSaveSettings(nextSet);
                          }}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                        >
                          {settings?.autoPrint ? (
                            <ToggleRight className="w-8 h-8 text-blue-600" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-slate-300" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      Emulates the local background spooler client. In production, this client agent triggers on-premise hardware printers directly.
                    </p>

                    {/* Styled Local Console Terminal */}
                    <div className="flex-1 bg-slate-900 border border-slate-950 rounded-2xl p-4 font-mono text-[10px] text-slate-200 space-y-1.5 overflow-y-auto shadow-inner h-[220px]">
                      {printSimulatorLogs.map((log, index) => (
                        <div key={index} className="leading-relaxed">
                          <span className="text-slate-500 select-none">[{new Date().toLocaleTimeString([], {hour: "2-digit", minute:"2-digit", second:"2-digit"})}]</span>{" "}
                          <span className={
                            log.includes("Completed") || log.includes("Success") 
                              ? "text-emerald-400 font-semibold" 
                              : log.includes("Processing") || log.includes("Manual")
                                ? "text-blue-300" 
                                : "text-slate-300"
                          }>
                            {log}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex gap-3 mt-3">
                    <button
                      onClick={() => {
                        setPrintSimulatorLogs(prev => [
                          ...prev,
                          `[Manual] Spool Daemon Ping verified. Latency: 14ms.`
                        ]);
                      }}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      Ping Daemon
                    </button>
                    <button
                      onClick={() => setPrintSimulatorLogs([
                        `[System] Logger spool buffer cleared. Ready.`
                      ])}
                      className="px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Dashboard Print Queue preview table (2 Columns) */}
                <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Live Print Queue Stream
                    </h3>
                    <button
                      onClick={() => setActiveTab("queue")}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      Manage Spooler &rarr;
                    </button>
                  </div>

                  {jobs.filter(j => j.status === "Waiting" || j.status === "Printing").length === 0 ? (
                    <div className="h-[310px] flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Spool Queue Empty</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">All customer documents printed and finalized.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto h-[310px] scrollbar">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                            <th className="pb-3 pl-2">Token</th>
                            <th className="pb-3">Customer</th>
                            <th className="pb-3">Specs</th>
                            <th className="pb-3">Printer Output</th>
                            <th className="pb-3 text-right pr-2">Control</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {jobs
                            .filter(j => j.status === "Waiting" || j.status === "Printing")
                            .map((job) => (
                              <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 pl-2 font-mono font-bold text-blue-600 text-sm">{job.id}</td>
                                <td className="py-3">
                                  <span className="font-bold text-slate-900 block">{job.customerName}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">{job.phone}</span>
                                </td>
                                <td className="py-3 max-w-[150px] truncate">
                                  <span className="font-semibold text-slate-700 block truncate">{job.fileName || job.serviceType}</span>
                                  <span className="text-[10px] text-slate-400 block font-mono">{job.copies} x {job.colorMode.toUpperCase()} ({job.paperSize})</span>
                                </td>
                                <td className="py-3">
                                  <span className="text-[10px] font-bold font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                                    {job.assignedPrinter}
                                  </span>
                                </td>
                                <td className="py-3 text-right pr-2 space-x-1.5">
                                  {job.status === "Waiting" ? (
                                    <button
                                      onClick={() => handlePrintCommand(job.id)}
                                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                                    >
                                      <Play className="w-3 h-3" />
                                      Spool Out
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg animate-pulse inline-block">
                                      Spooling...
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleUpdateJobStatus(job.id, "Cancelled")}
                                    className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer inline-block border border-transparent hover:border-red-100"
                                    title="Cancel Spool"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FULL PRINT QUEUE TABLE MANAGEMENT */}
          {activeTab === "queue" && (
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-6">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-4">
                {/* Search */}
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search token, customer name, phone..."
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition-colors"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                  {["All", "Waiting", "Printing", "Completed", "Cancelled", "Expired"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setQueueFilter(status)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                        queueFilter === status
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table rendering */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <th className="pb-3 pl-2">Token</th>
                      <th className="pb-3">Customer Info</th>
                      <th className="pb-3">Service & File</th>
                      <th className="pb-3">Specifications</th>
                      <th className="pb-3">Pricing (Rs)</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right pr-2">Control Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJobs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          No print jobs found matching the active filters.
                        </td>
                      </tr>
                    ) : (
                      filteredJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-2 font-mono font-black text-blue-600 text-sm">{job.id}</td>
                          <td className="py-4">
                            <span className="font-bold text-slate-900 block">{job.customerName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{job.phone}</span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-1.5 max-w-[180px] truncate">
                              <span className="font-semibold text-slate-800 truncate block">{job.fileName || job.serviceType}</span>
                              {job.fileData && (
                                <button
                                  onClick={() => setViewingFileJob(job)}
                                  className="text-blue-600 hover:text-blue-700 p-0.5"
                                  title="View File"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">{job.serviceType} {job.fileSize ? `(${job.fileSize})` : ""}</span>
                          </td>
                          <td className="py-4 font-mono text-[11px] text-slate-600">
                            <div>{job.copies} Copies • {job.colorMode.toUpperCase()}</div>
                            <div className="text-[10px] text-slate-400">{job.paperSize} • {job.sideMode === "double" ? "Duplex" : "Simplex"}</div>
                          </td>
                          <td className="py-4 font-bold text-slate-800 font-mono">
                            Rs. {job.price}
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold border ${
                              job.status === "Waiting" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              job.status === "Printing" ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse" :
                              job.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>
                              {job.status}
                            </span>
                          </td>
                          <td className="py-4 text-right pr-2 space-x-1.5">
                            {job.status === "Waiting" && (
                              <button
                                onClick={() => handlePrintCommand(job.id)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                              >
                                Print
                              </button>
                            )}
                            {job.status === "Printing" && (
                              <button
                                onClick={() => handleUpdateJobStatus(job.id, "Completed")}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                              >
                                Release
                              </button>
                            )}
                            {job.status !== "Completed" && job.status !== "Cancelled" && (
                              <button
                                onClick={() => handleUpdateJobStatus(job.id, "Cancelled")}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] rounded-lg transition-all cursor-pointer border border-slate-300/40"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer inline-block"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CSC REGISTER LOG BOOK */}
          {activeTab === "csc" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">CSC Online Application Registry</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Fill governmental forms and keep tracking digital logs</p>
                  </div>
                  
                  <button
                    onClick={() => setIsAddingCsc(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New CSC Entry
                  </button>
                </div>

                {/* CSC Filter and search */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, service, mobile..."
                      value={cscSearch}
                      onChange={(e) => setCscSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition-colors"
                    />
                  </div>

                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                    {["All", "Pending", "In Progress", "Completed", "Failed"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setCscFilter(status)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                          cscFilter === status
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CSC Log Table */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                        <th className="pb-3 pl-2">Case ID</th>
                        <th className="pb-3">Customer</th>
                        <th className="pb-3">Service Name</th>
                        <th className="pb-3 font-mono">Date Filed</th>
                        <th className="pb-3 font-mono">Admin Fee</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right pr-2">Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCscLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                            No CSC filings registered matching the selection.
                          </td>
                        </tr>
                      ) : (
                        filteredCscLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 pl-2 font-mono font-bold text-slate-500">{log.id}</td>
                            <td className="py-4">
                              <span className="font-bold text-slate-900 block">{log.customerName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{log.phone}</span>
                            </td>
                            <td className="py-4 font-semibold text-slate-800">
                              {log.serviceName}
                              {log.notes && (
                                <span className="text-[10px] text-slate-400 font-normal block italic mt-0.5 truncate max-w-[200px]">{log.notes}</span>
                              )}
                            </td>
                            <td className="py-4 font-mono text-[11px] text-slate-500">
                              {formatDate(log.createdAt)} {formatTime(log.createdAt)}
                            </td>
                            <td className="py-4 font-bold font-mono text-slate-800">
                              Rs. {log.fee}
                            </td>
                            <td className="py-4">
                              <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold border ${
                                log.status === "Pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                log.status === "In Progress" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                log.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                "bg-red-50 text-red-600 border-red-200"
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="py-4 text-right pr-2 space-x-1 flex items-center justify-end">
                              <select
                                value={log.status}
                                onChange={(e) => handleUpdateCscStatus(log.id, e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-lg p-1 text-[11px] font-semibold text-slate-700 cursor-pointer outline-none"
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Failed">Failed</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI FORM EXTRACTOR */}
          {activeTab === "ai-filler" && (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* OCR raw messy paste area */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full text-blue-700 font-bold tracking-wide uppercase">Gemini Form Intelligence</span>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight mt-2">Messy Text / OCR Raw Extractor</h3>
                  <p className="text-xs text-slate-500">Paste messy copy-pastes, raw chat, Aadhaar OCR, or draft notes. Gemini automatically parses structural customer details.</p>
                </div>

                <textarea
                  rows={10}
                  placeholder="Paste raw OCR scrapings, e.g.
NAME: Rajesh Kumar Verma
FATHER: Sunil Verma
DOB: 12-05-1994
AADHAAR: 4321-9876-0001
MOBILE: 9876000123
ADDRESS: House 12, Ward 3, Bilaspur, Chhattisgarh..."
                  value={ocrRawText}
                  onChange={(e) => setOcrRawText(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-2xl p-4 text-xs font-mono text-slate-800 outline-none transition-colors leading-relaxed"
                />

                <button
                  onClick={handleAIExtract}
                  disabled={isExtracting || !ocrRawText.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gemini Parsing Form Data...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Extract Structured Form Details
                    </>
                  )}
                </button>
              </div>

              {/* Extracted JSON Structured values */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 tracking-tight border-b border-slate-100 pb-3 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  Structured Autocomplete Output
                </h3>

                {extractedData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">First Name</span>
                        <span className="font-bold text-slate-800">{extractedData.firstName || "-"}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Last Name</span>
                        <span className="font-bold text-slate-800">{extractedData.lastName || "-"}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Date of Birth</span>
                        <span className="font-bold text-slate-800 font-mono">{extractedData.dob || "-"}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Mobile Phone</span>
                        <span className="font-bold text-slate-800 font-mono">{extractedData.mobile || "-"}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Aadhaar Number</span>
                        <span className="font-bold text-slate-800 font-mono">{extractedData.aadhaar || "-"}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Income (Yearly)</span>
                        <span className="font-bold text-slate-800 font-mono">Rs. {extractedData.income || "-"}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Residential Address</span>
                        <span className="font-medium text-slate-800 leading-relaxed">{extractedData.address || "-"}</span>
                      </div>
                    </div>

                    {extractedData.aiAnalysis && (
                      <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-purple-900 text-xs leading-normal">
                        <strong>Form Filing Instruction:</strong> {extractedData.aiAnalysis}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
                          alert("Structured customer JSON copied to clipboard!");
                        }}
                        className="flex-1 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        Copy All Fields
                      </button>
                      <button
                        onClick={() => setExtractedData(null)}
                        className="px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        Clear Structured fields
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-[280px] flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Fields Awaiting Extraction</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Structured details will populate here automatically.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: AI CONSULTANT / INSIGHTS */}
          {activeTab === "insights" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full text-purple-700 font-bold tracking-wide uppercase">Daily Retail Optimization</span>
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mt-2">Gemini AI Business Consultant</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Computes trends, current spooled printers configuration, queue latency, and CSC fees against local retail operational trends. Returns 3 immediate guidelines to maximize revenue and minimize lines.</p>
                </div>

                <button
                  onClick={handleGenerateInsights}
                  disabled={isGeneratingInsights}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-6 rounded-2xl font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  {isGeneratingInsights ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Consultant Analyzing Cafe Trends...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      Compute Daily Shop Insights
                    </>
                  )}
                </button>
              </div>

              {aiInsights && (
                <div className="bg-white border border-purple-100 p-8 rounded-3xl shadow-xs space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 font-mono">Structured Optimization Report</span>
                  <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed space-y-2">
                    {aiInsights}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5b: SERVICE MANAGEMENT CATALOG */}
          {activeTab === "services" && (
            <div className="space-y-6 text-left">
              <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-emerald-600" />
                    Service Catalog Configuration
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Instantly provision services, adjust live consumer pricing, enable/disable options, and update descriptions. Changes synchronize instantly.
                  </p>
                </div>
                <button
                  onClick={handleStartAddService}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add New Service
                </button>
              </div>

              {/* Grid of existing services */}
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={`bg-white border rounded-3xl p-6 shadow-xs relative flex flex-col justify-between transition-all ${
                      service.enabled ? "border-slate-200 hover:border-slate-300" : "border-slate-200 bg-slate-50/50 opacity-75"
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Top Row: Service status & icon badge */}
                      <div className="flex justify-between items-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold border uppercase ${
                          service.enabled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-400 border-slate-200"
                        }`}>
                          {service.enabled ? "Active" : "Disabled"}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleService(service)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200/50 flex items-center"
                            title={service.enabled ? "Disable Service" : "Enable Service"}
                          >
                            {service.enabled ? (
                              <ToggleRight className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-300" />
                            )}
                          </button>
                          <button
                            onClick={() => handleStartEditService(service)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200/50"
                            title="Edit Service"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          {service.id !== "print" && service.id !== "xerox" && service.id !== "scan" && (
                            <button
                              onClick={() => handleDeleteService(service.id)}
                              className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors cursor-pointer border border-slate-200/50"
                              title="Delete Service"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Info block */}
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-slate-950 text-sm tracking-tight">{service.name}</h4>
                        <p className="text-xs text-slate-500 leading-normal line-clamp-2 h-8">{service.description}</p>
                      </div>

                      {/* Pricing Specs Badge */}
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center border-b border-slate-200/50 pb-1.5">
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Pricing Type</span>
                          <span className="font-bold text-slate-700 font-mono text-[10px] uppercase bg-slate-100 px-2 py-0.5 rounded-md">
                            {service.pricingType}
                          </span>
                        </div>

                        {service.pricingType === "per-page" && (
                          <div className="space-y-1 font-semibold text-slate-700">
                            <div className="flex justify-between">
                              <span>Black & White Rate:</span>
                              <span className="font-mono text-slate-900">₹{service.priceBW}/page</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Color Rate:</span>
                              <span className="font-mono text-slate-900">₹{service.priceColor}/page</span>
                            </div>
                          </div>
                        )}

                        {service.pricingType === "scan" && (
                          <div className="space-y-1 font-semibold text-slate-700">
                            <div className="flex justify-between">
                              <span>Single Page Rate:</span>
                              <span className="font-mono text-slate-900">₹{service.priceSingle}/page</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Multi Page Bulk Rate:</span>
                              <span className="font-mono text-slate-900">₹{service.priceMulti}/page</span>
                            </div>
                          </div>
                        )}

                        {service.pricingType === "fixed" && (
                          <div className="flex justify-between font-semibold text-slate-700">
                            <span>Processing Assistant Fee:</span>
                            <span className="font-mono text-slate-900">₹{service.priceFixed}</span>
                          </div>
                        )}

                        {service.pricingType === "options" && (
                          <div className="space-y-1">
                            <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Option Rate Card Sets:</span>
                            <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto pr-1">
                              {service.options?.map((opt) => (
                                <div key={opt.id} className="bg-white border border-slate-200/50 rounded-lg p-1 text-[10px] text-center font-medium">
                                  <span className="text-slate-600 block truncate">{opt.label}</span>
                                  <span className="font-bold text-slate-900">₹{opt.price}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata summary info */}
                    <div className="border-t border-slate-100 mt-4 pt-3 flex justify-between items-center text-[10px] text-slate-400">
                      <span>Formats: <strong>{service.supportedFormats || "Any"}</strong></span>
                      {service.pricingRules && (
                        <span className="text-blue-600 font-semibold flex items-center gap-1 cursor-help" title={service.pricingRules}>
                          <HelpCircle className="w-3.5 h-3.5" />
                          Rules Set
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Service Creator & Editor Modal overlay */}
              <AnimatePresence>
                {(isAddingService || editingService) && (
                  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <motion.div
                      initial={{ scale: 0.95, y: 15 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.95, y: 15 }}
                      className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-left space-y-4 max-h-[90vh] overflow-y-auto"
                    >
                      <button
                        onClick={() => {
                          setIsAddingService(false);
                          setEditingService(null);
                        }}
                        className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer border border-slate-200"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase">
                          Catalog Builder
                        </span>
                        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mt-1.5">
                          {editingService ? `Edit Service: ${editingService.name}` : "Create Dynamic Service"}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Configure dynamic properties, pricing schemas, option packs, or custom rules instantly.
                        </p>
                      </div>

                      <form onSubmit={handleSaveService} className="space-y-4 pt-2 text-xs">
                        {/* Name & Supported formats */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Service Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Spiral Bound Printing"
                              value={serviceName}
                              onChange={(e) => setServiceName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Supported Formats (comma separated)</label>
                            <input
                              type="text"
                              placeholder="e.g. PDF, DOCX, JPG"
                              value={serviceFormats}
                              onChange={(e) => setServiceFormats(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                          <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Short Consumer Description *</label>
                          <textarea
                            rows={2}
                            required
                            placeholder="e.g. Instant high-speed spiral book printing with standard card sheet back bindings."
                            value={serviceDesc}
                            onChange={(e) => setServiceDesc(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800"
                          />
                        </div>

                        {/* Pricing Type Selection */}
                        <div className="space-y-1">
                          <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Pricing Scheme Type</label>
                          <select
                            value={servicePricingType}
                            onChange={(e) => setServicePricingType(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-bold"
                          >
                            <option value="per-page">Per-Page Rates (Black & White + Color)</option>
                            <option value="options">Option Rate Packages (ID Card/Passport photo packages)</option>
                            <option value="scan">Scanning Scheme (Single page vs Multi-page bulk)</option>
                            <option value="fixed">Fixed Form Assisting Fee (Government forms/applications)</option>
                          </select>
                        </div>

                        {/* CONDITIONAL PRICING CONFIGS */}
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                          <span className="text-slate-500 font-bold tracking-wider text-[9px] uppercase block">Pricing Parameters Matrix</span>
                          
                          {servicePricingType === "per-page" && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-slate-400 font-semibold text-[9px] block">Black & White Rate (₹ per page)</label>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  value={servicePriceBW}
                                  onChange={(e) => setServicePriceBW(parseFloat(e.target.value) || 0)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-slate-400 font-semibold text-[9px] block">Color Rate (₹ per page)</label>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  value={servicePriceColor}
                                  onChange={(e) => setServicePriceColor(parseFloat(e.target.value) || 0)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono"
                                />
                              </div>
                            </div>
                          )}

                          {servicePricingType === "scan" && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-slate-400 font-semibold text-[9px] block">Single Page Scan Rate (₹)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={servicePriceSingle}
                                  onChange={(e) => setServicePriceSingle(parseInt(e.target.value) || 0)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-slate-400 font-semibold text-[9px] block">Multi-Page Bulk Scan Rate (₹ per page)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={servicePriceMulti}
                                  onChange={(e) => setServicePriceMulti(parseInt(e.target.value) || 0)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono"
                                />
                              </div>
                            </div>
                          )}

                          {servicePricingType === "fixed" && (
                            <div className="space-y-1">
                              <label className="text-slate-400 font-semibold text-[9px] block">Fixed Facilitation / Registration Fee (₹)</label>
                              <input
                                type="number"
                                min={0}
                                value={servicePriceFixed}
                                onChange={(e) => setServicePriceFixed(parseInt(e.target.value) || 0)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono"
                              />
                            </div>
                          )}

                          {servicePricingType === "options" && (
                            <div className="space-y-3">
                              {/* Option Creator panel */}
                              <div className="grid grid-cols-2 gap-3.5 items-end bg-white border border-slate-200 p-3 rounded-xl shadow-inner">
                                <div className="space-y-1">
                                  <label className="text-slate-400 font-semibold text-[9px] block">New Set Label</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 6 Photos Set"
                                    value={newOptionLabel}
                                    onChange={(e) => setNewOptionLabel(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-slate-400 font-semibold text-[9px] block">Package Price (₹)</label>
                                  <div className="flex gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      value={newOptionPrice}
                                      onChange={(e) => setNewOptionPrice(parseInt(e.target.value) || 0)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-mono"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!newOptionLabel.trim()) return;
                                        const slugOpt = "opt-" + Math.random().toString(36).substring(2, 7);
                                        setServiceOptions([...serviceOptions, { id: slugOpt, label: newOptionLabel, price: newOptionPrice }]);
                                        setNewOptionLabel("");
                                        setNewOptionPrice(0);
                                      }}
                                      className="px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                                    >
                                      Add
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Active options list */}
                              <div className="space-y-1.5">
                                <span className="text-slate-400 font-semibold text-[9px] block uppercase">Active Package Sets:</span>
                                {serviceOptions.length === 0 ? (
                                  <p className="text-[10px] text-slate-400 italic">No package options added yet. Create at least one set.</p>
                                ) : (
                                  <div className="grid grid-cols-2 gap-2">
                                    {serviceOptions.map((opt) => (
                                      <div key={opt.id} className="flex justify-between items-center bg-white border border-slate-200 rounded-lg px-3 py-1">
                                        <span className="font-semibold text-slate-700">{opt.label} &rarr; ₹{opt.price}</span>
                                        <button
                                          type="button"
                                          onClick={() => setServiceOptions(serviceOptions.filter(o => o.id !== opt.id))}
                                          className="text-red-500 hover:text-red-700 font-bold p-0.5"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Custom Pricing Rules / Pricing Info */}
                        <div className="space-y-1">
                          <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Custom Pricing Rules / Regulatory Constraints</label>
                          <textarea
                            rows={2}
                            placeholder="e.g. First 5 pages are standard, then bulk discounts or custom paper weights apply."
                            value={serviceRules}
                            onChange={(e) => setServiceRules(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800"
                          />
                        </div>

                        <div className="flex gap-2.5 pt-2">
                          <button
                            type="submit"
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-center"
                          >
                            {editingService ? "Save Service Specifications" : "Create Service Item"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingService(false);
                              setEditingService(null);
                            }}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 6: SETTINGS & GENERAL CONFIG */}
          {activeTab === "settings" && settings && (
            <div className="max-w-2xl mx-auto space-y-6 text-left">
              {/* General Rates Card */}
              <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xs space-y-6">
                <h3 className="text-base font-bold text-slate-900 tracking-tight border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-600" />
                  Center Rates & General Configuration
                </h3>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Shop / Center Name</label>
                    <input
                      type="text"
                      value={settings.shopName}
                      onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Store Contact Phone</label>
                    <input
                      type="text"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Black & White Print Rate (per page)</label>
                    <input
                      type="number"
                      value={settings.pricePerBWPage}
                      onChange={(e) => setSettings({ ...settings, pricePerBWPage: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Color Print Rate (per page)</label>
                    <input
                      type="number"
                      value={settings.pricePerColorPage}
                      onChange={(e) => setSettings({ ...settings, pricePerColorPage: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Document Scanning Rate (per page)</label>
                    <input
                      type="number"
                      value={settings.pricePerScan}
                      onChange={(e) => setSettings({ ...settings, pricePerScan: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Lamination Rate (per sheet)</label>
                    <input
                      type="number"
                      value={settings.pricePerLamination}
                      onChange={(e) => setSettings({ ...settings, pricePerLamination: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1 col-span-2 border-t border-slate-100 pt-4 mt-2">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <label className="text-slate-800 font-bold block">Secure Clean Spooler</label>
                        <span className="text-[10px] text-slate-400">Instantly wipe document base64 from system memory when printed</span>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, deleteAfterPrint: !settings.deleteAfterPrint })}
                        className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {settings.deleteAfterPrint ? (
                          <ToggleRight className="w-8 h-8 text-blue-600" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-300" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Settings: Default Presets & Ingress Constraints Card */}
              <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xs space-y-6">
                <h3 className="text-base font-bold text-slate-900 tracking-tight border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Quick Settings: Default Presets & Ingress Constraints
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Configure default form choices and strict validation constraints automatically enforced on customer-facing uploading forms.
                </p>

                <div className="grid sm:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Default Copies Preset</label>
                    <input
                      type="number"
                      min={1}
                      value={settings.defaultCopies ?? 1}
                      onChange={(e) => setSettings({ ...settings, defaultCopies: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Maximum Allowed Copies per request</label>
                    <input
                      type="number"
                      min={1}
                      value={settings.maxAllowedCopies ?? 50}
                      onChange={(e) => setSettings({ ...settings, maxAllowedCopies: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Default Color Mode Preset</label>
                    <select
                      value={settings.defaultColorMode ?? "bw"}
                      onChange={(e) => setSettings({ ...settings, defaultColorMode: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    >
                      <option value="bw">Black & White (B&W)</option>
                      <option value="color">Full Color</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Default Paper Layout Preset</label>
                    <select
                      value={settings.defaultPaperSize ?? "A4"}
                      onChange={(e) => setSettings({ ...settings, defaultPaperSize: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    >
                      <option value="A4">A4 (Standard)</option>
                      <option value="A3">A3 (Poster)</option>
                      <option value="Legal">Legal (CSC)</option>
                      <option value="Letter">Letter</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Default Duplex Mode Preset</label>
                    <select
                      value={settings.defaultSideMode ?? "single"}
                      onChange={(e) => setSettings({ ...settings, defaultSideMode: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    >
                      <option value="single">Single-Sided</option>
                      <option value="double">Double-Sided</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Center GST Rate (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={settings.gstPercent}
                      onChange={(e) => setSettings({ ...settings, gstPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Maximum Upload File Size (MB)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={settings.maxFileSizeMB ?? 50}
                      onChange={(e) => setSettings({ ...settings, maxFileSizeMB: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) })}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  {/* Allowed Paper Sizes checkboxes */}
                  <div className="col-span-2 border-t border-slate-150 pt-4 space-y-3">
                    <span className="font-bold text-slate-800 text-xs block">Allowed Paper Sizes (Ingress Restrictions)</span>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.allowA4 ?? true}
                          onChange={(e) => setSettings({ ...settings, allowA4: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-[11px] font-semibold text-slate-700">A4 Standard Desk</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.allowA3 ?? true}
                          onChange={(e) => setSettings({ ...settings, allowA3: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-[11px] font-semibold text-slate-700">A3 Poster Size</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.allowLegal ?? true}
                          onChange={(e) => setSettings({ ...settings, allowLegal: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-[11px] font-semibold text-slate-700">Legal Documents</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.allowLetter ?? true}
                          onChange={(e) => setSettings({ ...settings, allowLetter: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-[11px] font-semibold text-slate-700">Letter Standard</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Save Button */}
              <button
                onClick={() => {
                  handleSaveSettings(settings);
                  alert("Center & Quick settings successfully saved!");
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <Check className="w-4 h-4" />
                Save Center & Ingress Configurations
              </button>
            </div>
          )}
        </main>
      </div>

      {/* DETAILED BASE64 PREVIEW MODAL */}
      <AnimatePresence>
        {viewingFileJob && (
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-left relative">
              <button
                onClick={() => setViewingFileJob(null)}
                className="absolute top-4 right-4 p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-800 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-bold font-mono text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase">File Vault Viewer</span>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight mt-1.5">{viewingFileJob.fileName}</h3>
                <p className="text-xs text-slate-500 font-mono">Token ID: <strong>{viewingFileJob.id}</strong> • Owner: {viewingFileJob.customerName}</p>
              </div>

              {/* Document representation canvas frame */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl h-[450px] w-full flex items-center justify-center overflow-hidden">
                {viewingFileJob.fileType?.startsWith("image/") ? (
                  <img
                    src={viewingFileJob.fileData}
                    alt="Customer Attachment View"
                    className="max-h-full max-w-full object-contain p-2"
                    referrerPolicy="no-referrer"
                  />
                ) : viewingFileJob.fileType === "application/pdf" && viewingFileJob.fileData ? (
                  <div className="w-full h-full overflow-hidden">
                    <PdfPreview fileData={viewingFileJob.fileData} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="w-12 h-12 text-slate-400" />
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-800">Binary Document Asset</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Size count: {viewingFileJob.fileSize || "unknown"}</p>
                    </div>
                  </div>
                )}
              </div>

              {viewingFileJob.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs text-slate-700 leading-normal">
                  <strong>Operator Instructions:</strong> "{viewingFileJob.notes}"
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handlePrintCommand(viewingFileJob.id);
                    setViewingFileJob(null);
                  }}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Spool & Print Now
                </button>
                <button
                  onClick={() => setViewingFileJob(null)}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHT NEW CSC MODAL BOX */}
      <AnimatePresence>
        {isAddingCsc && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-left space-y-4"
            >
              <button
                onClick={() => setIsAddingCsc(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-bold font-mono text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase">Log registry</span>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mt-1.5">New CSC Filing Application</h3>
                <p className="text-xs text-slate-400">Manual entry for customers requesting in-person government registrations</p>
              </div>

              <form onSubmit={handleAddCscLog} className="space-y-3.5 pt-2 text-xs">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sen"
                      value={newCscName}
                      onChange={(e) => setNewCscName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Mobile Phone *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9876543210"
                      value={newCscPhone}
                      onChange={(e) => setNewCscPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Government Service</label>
                    <select
                      value={newCscService}
                      onChange={(e) => setNewCscService(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800"
                    >
                      <option value="PAN Card">PAN Card (New/Correction)</option>
                      <option value="Aadhaar Service">Aadhaar (Details/Demographics)</option>
                      <option value="Income Certificate">Income Certificate Filling</option>
                      <option value="Caste Certificate">Caste/Category Certificate</option>
                      <option value="Voter ID Card">Voter ID Registration</option>
                      <option value="Passport Seva">Passport Seva application</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Service Fee (Rs)</label>
                    <input
                      type="number"
                      required
                      value={newCscFee}
                      onChange={(e) => setNewCscFee(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Admin notes (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Aadhaar OTP pending; photo verified."
                    value={newCscNotes}
                    onChange={(e) => setNewCscNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Register CSC application
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Real-time Toast Alert */}
      <AnimatePresence>
        {liveToast && (
          <motion.div
            initial={{ opacity: 0, x: 50, y: 15 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-20 right-6 z-50 max-w-sm bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-800 flex items-start gap-3.5"
          >
            <div className="p-2 bg-blue-600 text-white rounded-xl mt-0.5 animate-pulse">
              <Printer className="w-4 h-4" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 font-mono">
                Counter Event Broadcast
              </span>
              <p className="text-xs font-bold text-slate-100 leading-normal">{liveToast.message}</p>
              <span className="block text-[8px] text-slate-500 font-mono">Instant push update</span>
            </div>
            <button 
              onClick={() => setLiveToast(null)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
