import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

// Increase payload limit for base64 file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- TYPES ---
interface Job {
  id: string; // e.g. A001, A002...
  customerName: string;
  phone: string;
  serviceType: string; // 'Print', 'Photocopy', 'Scanning', 'CSC Service', etc.
  fileName?: string;
  fileSize?: string;
  fileData?: string; // base64 string
  fileType?: string; // mimeType
  copies: number;
  colorMode: "bw" | "color";
  paperSize: "A4" | "A3" | "Legal" | "Letter";
  sideMode: "single" | "double";
  notes?: string;
  status: "Waiting" | "Printing" | "Completed" | "Cancelled" | "Expired";
  createdAt: string; // ISO string
  pagesCount: number;
  assignedPrinter: string;
  price: number;
  isPriority?: boolean;
}

interface CSCLog {
  id: string;
  customerName: string;
  phone: string;
  serviceName: string; // PAN, Aadhaar, Voter, etc.
  status: "Pending" | "In Progress" | "Completed" | "Failed";
  fee: number;
  notes?: string;
  createdAt: string;
}

interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
  email: string;
  pricePerBWPage: number;
  pricePerColorPage: number;
  pricePerScan: number;
  pricePerLamination: number;
  pricePassportPhoto: number;
  defaultExpiryMinutes: number; // 1, 5, 10, 30, 60, 120, 360, 720, 1440
  autoPrint: boolean;
  deleteAfterPrint: boolean;
  gstPercent: number;
}

// --- GLOBAL DATABASE (IN-MEMORY) ---
let nextTokenNumber = 24; // start after seed jobs
let jobsDb: Job[] = [
  {
    id: "A015",
    customerName: "Rahul Sharma",
    phone: "9876543210",
    serviceType: "Print",
    fileName: "Resume_Rahul.pdf",
    fileSize: "145 KB",
    fileData: "data:application/pdf;base64,JVBERi0xLjQKJ..." , // mock data prefix
    fileType: "application/pdf",
    copies: 2,
    colorMode: "bw",
    paperSize: "A4",
    sideMode: "single",
    notes: "Please print on thick paper if possible.",
    status: "Completed",
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
    pagesCount: 1,
    assignedPrinter: "Black & White Laser",
    price: 10,
    isPriority: false,
  },
  {
    id: "A016",
    customerName: "Ananya Patel",
    phone: "9123456789",
    serviceType: "Scanning",
    fileName: "Marksheet_10th.jpg",
    fileSize: "1.2 MB",
    fileData: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..." ,
    fileType: "image/jpeg",
    copies: 1,
    colorMode: "color",
    paperSize: "A4",
    sideMode: "single",
    notes: "High resolution scan please.",
    status: "Completed",
    createdAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    pagesCount: 1,
    assignedPrinter: "Flatbed Color Scanner",
    price: 15,
    isPriority: false,
  },
  {
    id: "A017",
    customerName: "Amit Verma",
    phone: "8887776665",
    serviceType: "CSC Service",
    notes: "Aadhaar Card Correction online application and biometrics check setup.",
    copies: 1,
    colorMode: "color",
    paperSize: "A4",
    sideMode: "double",
    status: "Completed",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    pagesCount: 2,
    assignedPrinter: "Color Inkjet Pro",
    price: 50,
    isPriority: true,
  },
  {
    id: "A018",
    customerName: "Deepak Kumar",
    phone: "9988776655",
    serviceType: "Print",
    fileName: "Project_Report_Final.pdf",
    fileSize: "4.5 MB",
    fileType: "application/pdf",
    fileData: "data:application/pdf;base64,JVBERi0xLjQKJ...",
    copies: 1,
    colorMode: "bw",
    paperSize: "A4",
    sideMode: "double",
    notes: "Print spiral binding ready.",
    status: "Completed",
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    pagesCount: 32,
    assignedPrinter: "Heavy-Duty Duplex Printer",
    price: 80,
    isPriority: false,
  },
  {
    id: "A019",
    customerName: "Vikram Singh",
    phone: "7766554433",
    serviceType: "Passport Photo",
    notes: "8 Copies of Passport photo with blue background.",
    copies: 8,
    colorMode: "color",
    paperSize: "A4",
    sideMode: "single",
    status: "Completed",
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    pagesCount: 1,
    assignedPrinter: "Color Photo Printer",
    price: 60,
    isPriority: false,
  },
  {
    id: "A020",
    customerName: "Sanjay Gupta",
    phone: "8123456780",
    serviceType: "Print",
    fileName: "Income_Certificate_Draft.pdf",
    fileSize: "320 KB",
    fileType: "application/pdf",
    fileData: "data:application/pdf;base64,JVBERi0xLjQKJ...",
    copies: 1,
    colorMode: "bw",
    paperSize: "A4",
    sideMode: "single",
    status: "Printing",
    createdAt: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
    pagesCount: 2,
    assignedPrinter: "Black & White Laser",
    price: 10,
    isPriority: false,
  },
  {
    id: "A021",
    customerName: "Priyanka Sen",
    phone: "9898989898",
    serviceType: "Print",
    fileName: "Wedding_Card_Design.png",
    fileSize: "2.1 MB",
    fileType: "image/png",
    fileData: "data:image/png;base64,iVBORw0KGgoAAAANSU...",
    copies: 5,
    colorMode: "color",
    paperSize: "A4",
    sideMode: "single",
    notes: "Color must be vibrant! High quality print request.",
    status: "Waiting",
    createdAt: new Date(Date.now() - 300000).toISOString(), // 5 mins ago
    pagesCount: 1,
    assignedPrinter: "Color Inkjet Pro",
    price: 75,
    isPriority: true,
  },
  {
    id: "A022",
    customerName: "Manish Joshi",
    phone: "7001122334",
    serviceType: "Lamination",
    notes: "Aadhaar card size lamination for safety.",
    copies: 1,
    colorMode: "bw",
    paperSize: "A4",
    sideMode: "single",
    status: "Waiting",
    createdAt: new Date(Date.now() - 60000).toISOString(), // 1 min ago
    pagesCount: 1,
    assignedPrinter: "Hot Roll Laminator",
    price: 20,
    isPriority: false,
  }
];

let cscLogsDb: CSCLog[] = [
  {
    id: "CSC101",
    customerName: "Rahul Sharma",
    phone: "9876543210",
    serviceName: "PAN Card",
    status: "Completed",
    fee: 150,
    notes: "Application submitted. Receipt handed over.",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "CSC102",
    customerName: "Amit Verma",
    phone: "8887776665",
    serviceName: "Aadhaar Card",
    status: "Completed",
    fee: 100,
    notes: "Biometric appointment scheduled for tomorrow morning.",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "CSC103",
    customerName: "Sunita Yadav",
    phone: "9456123078",
    serviceName: "Income Certificate",
    status: "In Progress",
    fee: 120,
    notes: "Documents uploaded. Pending Tehsildar approval.",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "CSC104",
    customerName: "Rajesh Mishra",
    phone: "9001122335",
    serviceName: "Voter ID",
    status: "Pending",
    fee: 100,
    notes: "Form 6 filled. Document upload pending.",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "CSC105",
    customerName: "Kamlesh Devi",
    phone: "7112233445",
    serviceName: "Ayushman Card",
    status: "Completed",
    fee: 50,
    notes: "Golden e-KYC card generated and printed.",
    createdAt: new Date(Date.now() - 1200000).toISOString(),
  }
];

let settingsDb: ShopSettings = {
  shopName: "CyberFlow AI & Digital Center",
  address: "Shop No. 12, Shopping Complex, Gandhi Road, Sector 4",
  phone: "+91 98765 43210",
  email: "admin@cyberflow.ai",
  pricePerBWPage: 5,
  pricePerColorPage: 15,
  pricePerScan: 10,
  pricePerLamination: 25,
  pricePassportPhoto: 50,
  defaultExpiryMinutes: 60, // default 1 hour
  autoPrint: false,
  deleteAfterPrint: true,
  gstPercent: 18,
};

// --- GEMINI CLIENT LAZY INITIALIZATION ---
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// --- SMART ROUTER LOGIC ---
function routePrinterAndEstimatePrice(
  serviceType: string,
  fileName: string | undefined,
  colorMode: "bw" | "color",
  copies: number,
  pages: number = 1
): { printer: string; price: number } {
  let printer = "Black & White Laser";
  let price = 5;

  if (serviceType === "Lamination") {
    printer = "Hot Roll Laminator";
    price = settingsDb.pricePerLamination * copies;
    return { printer, price };
  } else if (serviceType === "Passport Photo") {
    printer = "Color Photo Printer";
    price = settingsDb.pricePassportPhoto * copies;
    return { printer, price };
  } else if (serviceType === "Scanning") {
    printer = "Flatbed Color Scanner";
    price = settingsDb.pricePerScan * copies;
    return { printer, price };
  }

  // File Heuristic Routing
  const isImage = fileName ? /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName) : false;
  const isPdf = fileName ? /\.pdf$/i.test(fileName) : false;

  const resolvedColor = colorMode === "color" || isImage ? "color" : "bw";
  const finalPages = pages || (isPdf ? 5 : 1); // default estimate if unknown

  if (resolvedColor === "color") {
    printer = "Color Inkjet Pro";
    price = settingsDb.pricePerColorPage * finalPages * copies;
  } else {
    if (finalPages >= 15) {
      printer = "Heavy-Duty Duplex Printer";
    } else {
      printer = "Black & White Laser";
    }
    price = settingsDb.pricePerBWPage * finalPages * copies;
  }

  return { printer, price };
}

// --- BACKGROUND EXPIRY & PRINT SIMULATION LOOPS ---
setInterval(() => {
  const expiryLimitMs = settingsDb.defaultExpiryMinutes * 60000;
  const now = Date.now();

  jobsDb = jobsDb.map((job) => {
    if (job.status === "Waiting" || job.status === "Printing") {
      const jobTime = new Date(job.createdAt).getTime();
      if (now - jobTime > expiryLimitMs) {
        console.log(`Job ${job.id} has expired.`);
        return {
          ...job,
          status: "Expired",
          fileData: undefined, // remove file to save space/memory
        };
      }
    }
    return job;
  });
}, 30000); // Check every 30 seconds

// Simulated Windows Print Client Background Loop
// If settingsDb.autoPrint is true, automatically process Waiting jobs in the queue
setInterval(() => {
  if (!settingsDb.autoPrint) return;

  const nextWaitingJob = jobsDb.find((job) => job.status === "Waiting");
  if (nextWaitingJob) {
    nextWaitingJob.status = "Printing";
    console.log(`[Virtual Print Client] Auto-Printing job ${nextWaitingJob.id}...`);

    // Simulate print taking 5 seconds
    setTimeout(() => {
      const updatedJob = jobsDb.find((j) => j.id === nextWaitingJob.id);
      if (updatedJob && updatedJob.status === "Printing") {
        updatedJob.status = "Completed";
        if (settingsDb.deleteAfterPrint) {
          updatedJob.fileData = undefined; // Delete file content immediately after successful print
          console.log(`[Virtual Print Client] Printed and deleted file for job ${updatedJob.id}`);
        } else {
          console.log(`[Virtual Print Client] Printed job ${updatedJob.id}`);
        }
      }
    }, 5000);
  }
}, 8000);

// --- REST API ENDPOINTS ---

// Jobs List
app.get("/api/jobs", (req, res) => {
  res.json(jobsDb);
});

// Create Job (Customer upload)
app.post("/api/jobs", (req, res) => {
  const {
    customerName,
    phone,
    serviceType,
    fileName,
    fileSize,
    fileData,
    fileType,
    copies,
    colorMode,
    paperSize,
    sideMode,
    notes,
    isPriority,
  } = req.body;

  if (!customerName || !phone) {
    return res.status(400).json({ error: "Customer Name and Phone are required." });
  }

  // Generate unique token
  const tokenPrefix = "A";
  const numStr = String(nextTokenNumber++).padStart(3, "0");
  const id = `${tokenPrefix}${numStr}`;

  // Smart Heuristics
  let estimatedPages = 1;
  if (fileName && fileName.toLowerCase().endsWith(".pdf")) {
    // mock estimated pages
    estimatedPages = fileSize && parseFloat(fileSize) > 2 ? Math.floor(Math.random() * 8) + 3 : 2;
  }

  const { printer, price } = routePrinterAndEstimatePrice(
    serviceType || "Print",
    fileName,
    colorMode || "bw",
    parseInt(copies) || 1,
    estimatedPages
  );

  const newJob: Job = {
    id,
    customerName,
    phone,
    serviceType: serviceType || "Print",
    fileName,
    fileSize,
    fileData,
    fileType,
    copies: parseInt(copies) || 1,
    colorMode: colorMode || "bw",
    paperSize: paperSize || "A4",
    sideMode: sideMode || "single",
    notes,
    status: "Waiting",
    createdAt: new Date().toISOString(),
    pagesCount: estimatedPages,
    assignedPrinter: printer,
    price,
    isPriority: !!isPriority,
  };

  jobsDb.unshift(newJob); // Put at front of array for admin view

  // If auto print is triggered synchronously, begin print cycle
  if (settingsDb.autoPrint) {
    setTimeout(() => {
      const job = jobsDb.find((j) => j.id === id);
      if (job && job.status === "Waiting") {
        job.status = "Printing";
        setTimeout(() => {
          const printableJob = jobsDb.find((j) => j.id === id);
          if (printableJob && printableJob.status === "Printing") {
            printableJob.status = "Completed";
            if (settingsDb.deleteAfterPrint) {
              printableJob.fileData = undefined;
            }
          }
        }, 5000);
      }
    }, 1000);
  }

  res.json({
    success: true,
    token: id,
    job: newJob,
    queuePosition: jobsDb.filter((j) => j.status === "Waiting").length,
    estimatedWaitMinutes: jobsDb.filter((j) => j.status === "Waiting" || j.status === "Printing").length * 2,
  });
});

// Single Job Details / Token Status Check
app.get("/api/jobs/:id", (req, res) => {
  const job = jobsDb.find((j) => j.id.toLowerCase() === req.params.id.toLowerCase());
  if (!job) {
    return res.status(404).json({ error: "Token not found." });
  }

  // Calculate current real-time queue position
  const waitingJobs = jobsDb.filter((j) => j.status === "Waiting");
  let queuePos = 0;
  if (job.status === "Waiting") {
    // Find index of this job among waiting jobs (since jobsDb is sorted unshifted, newest first, queue operates oldest first)
    const waitingReversed = [...waitingJobs].reverse();
    const idx = waitingReversed.findIndex((j) => j.id === job.id);
    queuePos = idx !== -1 ? idx + 1 : 1;
  }

  res.json({
    ...job,
    queuePosition: job.status === "Waiting" ? queuePos : 0,
    estimatedWaitMinutes: job.status === "Waiting" ? queuePos * 3 : job.status === "Printing" ? 1 : 0,
  });
});

// Update Job Status / Properties (Admin)
app.patch("/api/jobs/:id", (req, res) => {
  const jobIndex = jobsDb.findIndex((j) => j.id === req.params.id);
  if (jobIndex === -1) {
    return res.status(404).json({ error: "Job not found." });
  }

  const updatedJob = { ...jobsDb[jobIndex], ...req.body };
  
  // If status changed to Completed and deleteAfterPrint is enabled, remove fileData
  if (req.body.status === "Completed" && settingsDb.deleteAfterPrint) {
    updatedJob.fileData = undefined;
  }

  jobsDb[jobIndex] = updatedJob;
  res.json(updatedJob);
});

// Delete Job
app.delete("/api/jobs/:id", (req, res) => {
  const jobIndex = jobsDb.findIndex((j) => j.id === req.params.id);
  if (jobIndex === -1) {
    return res.status(404).json({ error: "Job not found." });
  }

  jobsDb.splice(jobIndex, 1);
  res.json({ success: true, message: "Job deleted successfully." });
});

// --- CSC LOGS ---
app.get("/api/csc-logs", (req, res) => {
  res.json(cscLogsDb);
});

app.post("/api/csc-logs", (req, res) => {
  const { customerName, phone, serviceName, status, fee, notes } = req.body;
  if (!customerName || !phone || !serviceName) {
    return res.status(400).json({ error: "Customer, Phone, and Service Name are required." });
  }

  const newLog: CSCLog = {
    id: `CSC${Math.floor(Math.random() * 900) + 100}`,
    customerName,
    phone,
    serviceName,
    status: status || "Pending",
    fee: parseFloat(fee) || 100,
    notes,
    createdAt: new Date().toISOString(),
  };

  cscLogsDb.unshift(newLog);
  res.json(newLog);
});

// Update CSC Log
app.patch("/api/csc-logs/:id", (req, res) => {
  const logIndex = cscLogsDb.findIndex((l) => l.id === req.params.id);
  if (logIndex === -1) {
    return res.status(404).json({ error: "Log not found." });
  }

  const updatedLog = { ...cscLogsDb[logIndex], ...req.body };
  cscLogsDb[logIndex] = updatedLog;
  res.json(updatedLog);
});

// --- SETTINGS ---
app.get("/api/settings", (req, res) => {
  res.json(settingsDb);
});

app.post("/api/settings", (req, res) => {
  settingsDb = { ...settingsDb, ...req.body };
  res.json(settingsDb);
});

// --- STATS / REPORTS ---
app.get("/api/stats", (req, res) => {
  // Aggregate stats
  const totalCustomers = jobsDb.length + cscLogsDb.length;
  
  // Completed revenue
  const printRevenue = jobsDb
    .filter((j) => j.status === "Completed")
    .reduce((sum, j) => sum + j.price, 0);
  const cscRevenue = cscLogsDb
    .filter((l) => l.status === "Completed")
    .reduce((sum, l) => sum + l.fee, 0);
  const totalRevenue = printRevenue + cscRevenue;

  const pendingJobs = jobsDb.filter((j) => j.status === "Waiting" || j.status === "Printing").length;
  const completedJobsCount = jobsDb.filter((j) => j.status === "Completed").length;

  // Group services
  const serviceCounts: { [key: string]: number } = {};
  jobsDb.forEach((j) => {
    serviceCounts[j.serviceType] = (serviceCounts[j.serviceType] || 0) + 1;
  });
  cscLogsDb.forEach((l) => {
    serviceCounts[l.serviceName] = (serviceCounts[l.serviceName] || 0) + 1;
  });

  const topServices = Object.entries(serviceCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Daily revenue timeline (last 7 days simulation based on created dates)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  }).reverse();

  const dailyRevenue = last7Days.map((date) => {
    const pRev = jobsDb
      .filter((j) => j.status === "Completed" && j.createdAt.startsWith(date))
      .reduce((sum, j) => sum + j.price, 0);
    const cRev = cscLogsDb
      .filter((l) => l.status === "Completed" && l.createdAt.startsWith(date))
      .reduce((sum, l) => sum + l.fee, 0);
    
    // Add stable mock randomizer for older dates to make charts gorgeous
    const isToday = date === new Date().toISOString().split("T")[0];
    const baseP = isToday ? pRev : Math.floor(Math.sin(new Date(date).getDate()) * 100 + 200);
    const baseC = isToday ? cRev : Math.floor(Math.cos(new Date(date).getDate()) * 150 + 300);

    return {
      date: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      "Print Revenue": Math.max(0, baseP),
      "CSC Revenue": Math.max(0, baseC),
      "Total": Math.max(0, baseP + baseC),
    };
  });

  res.json({
    totalCustomers,
    totalRevenue,
    pendingJobs,
    completedJobsCount,
    topServices,
    dailyRevenue,
  });
});

// --- SIMULATED PRINT ACTION ---
app.post("/api/jobs/:id/print", (req, res) => {
  const job = jobsDb.find((j) => j.id === req.params.id);
  if (!job) {
    return res.status(404).json({ error: "Job not found." });
  }

  job.status = "Printing";
  console.log(`[Virtual Client] Commencing manual print for token ${job.id}`);

  // Simulating the printing process
  setTimeout(() => {
    const printableJob = jobsDb.find((j) => j.id === req.params.id);
    if (printableJob && printableJob.status === "Printing") {
      printableJob.status = "Completed";
      if (settingsDb.deleteAfterPrint) {
        printableJob.fileData = undefined;
      }
      console.log(`[Virtual Client] Finished manual print for token ${printableJob.id}`);
    }
  }, 4000);

  res.json({ success: true, message: "Print command sent to client.", job });
});

// --- AI / GEMINI API ENDPOINTS ---

// AI Document Analyzer
app.post("/api/ai/analyze-document", async (req, res) => {
  const { fileName, description, serviceType } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    // Graceful fallback when API key is missing
    const isImage = fileName ? /\.(jpg|jpeg|png|webp)$/i.test(fileName) : false;
    const isLarge = description && description.length > 500;
    return res.json({
      estimatedPages: isImage ? 1 : 3,
      colorMode: isImage ? "color" : "bw",
      suggestedPrinter: isLarge ? "Heavy-Duty Duplex Printer" : isImage ? "Color Inkjet Pro" : "Black & White Laser",
      priceQuote: isImage ? settingsDb.pricePerColorPage : settingsDb.pricePerBWPage * 3,
      aiAnalysis: `[Simulated AI - API Key Pending] analyzed file: "${fileName}". Identified as ${isImage ? "image" : "document"}. Auto-routed to standard printer. Set up your Gemini API Key in Settings > Secrets to unlock true vision capabilities!`,
    });
  }

  try {
    const prompt = `Analyze this digital print job request:
    File Name: "${fileName || "Unknown"}"
    Customer Description/Notes: "${description || "No notes provided"}"
    Requested Service: "${serviceType || "Print"}"
    
    Tasks:
    1. Estimate the most likely number of pages.
    2. Determine if it requires Black & White ("bw") or "color" printing.
    3. Choose the optimal printer among: "Black & White Laser", "Color Inkjet Pro", "Heavy-Duty Duplex Printer".
    4. Provide a helpful, friendly 2-sentence summary/recommendation for the shop owner on how to print or handle this specific item.

    Respond with a raw JSON object strictly conforming to this schema:
    {
      "estimatedPages": number,
      "colorMode": "bw" | "color",
      "suggestedPrinter": string,
      "explanation": string
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedPages: { type: Type.INTEGER },
            colorMode: { type: Type.STRING },
            suggestedPrinter: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ["estimatedPages", "colorMode", "suggestedPrinter", "explanation"],
        },
      },
    });

    const result = JSON.parse(response.text.trim());
    const finalPages = result.estimatedPages || 1;
    const finalColor = result.colorMode || "bw";
    
    // Estimate price based on Gemini's derived pages
    const basePrice = finalColor === "color" ? settingsDb.pricePerColorPage : settingsDb.pricePerBWPage;
    const priceQuote = basePrice * finalPages;

    res.json({
      estimatedPages: finalPages,
      colorMode: finalColor,
      suggestedPrinter: result.suggestedPrinter,
      priceQuote,
      aiAnalysis: result.explanation,
    });
  } catch (error) {
    console.error("Gemini Document Analyzer Error:", error);
    res.status(500).json({ error: "Gemini analysis failed." });
  }
});

// CSC AI Assisted Form Extractor
app.post("/api/ai/csc-form-extract", async (req, res) => {
  const { rawText } = req.body;
  if (!rawText) {
    return res.status(400).json({ error: "Raw text or data is required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Elegant fallback mock when API key is missing
    return res.json({
      firstName: "John",
      lastName: "Doe",
      dob: "1992-05-15",
      aadhaar: "1234-5678-9012",
      mobile: "9876543210",
      income: "250000",
      certificateType: "Income Certificate",
      address: "123 Main Street, Sector 2, New Delhi",
      rawExtracted: true,
      aiAnalysis: "[Simulated AI Extraction - Setup Gemini Key in Settings > Secrets to enable live extraction] Extracted standard placeholder details from your document context.",
    });
  }

  try {
    const prompt = `You are a high-speed data extraction assistant for CSC Online Form Filing.
    Read the following messy, scan-ocr, or raw customer information:
    """
    ${rawText}
    """

    Extract all relevant details to help the admin autofill governmental CSC application forms (such as PAN, Aadhaar, Income, Caste, Birth, Death Certificate).
    Output a JSON object conforming exactly to this schema. If any field is not found in the text, leave it blank or guess intelligently:
    {
      "firstName": string,
      "lastName": string,
      "dob": string (format YYYY-MM-DD),
      "aadhaar": string,
      "mobile": string,
      "income": string (numeric value if present),
      "certificateType": string (e.g. Income, Caste, Birth, Death, Voter ID, PAN),
      "address": string,
      "aiAnalysis": string (a 1-sentence tips/instructions for filling the governmental form)
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstName: { type: Type.STRING },
            lastName: { type: Type.STRING },
            dob: { type: Type.STRING },
            aadhaar: { type: Type.STRING },
            mobile: { type: Type.STRING },
            income: { type: Type.STRING },
            certificateType: { type: Type.STRING },
            address: { type: Type.STRING },
            aiAnalysis: { type: Type.STRING },
          },
          required: ["firstName", "lastName", "dob", "aadhaar", "mobile", "income", "certificateType", "address", "aiAnalysis"],
        },
      },
    });

    const result = JSON.parse(response.text.trim());
    res.json(result);
  } catch (error) {
    console.error("Gemini Form Extractor Error:", error);
    res.status(500).json({ error: "Gemini extraction failed." });
  }
});

// AI Business & Queue Consultant
app.post("/api/ai/analytics-insights", async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      insight: "Setup your Gemini API Key in AI Studio to get custom daily optimization guidelines, queue predictions, and marketing suggestions based on your cafe's real service trends!",
    });
  }

  try {
    // Compile some context
    const queueStatus = jobsDb.map(j => `${j.id}: ${j.serviceType} (${j.status})`).join(", ");
    const cscSummary = cscLogsDb.map(l => `${l.serviceName}: ${l.status}`).join(", ");
    
    const prompt = `You are a professional retail and digital shop consultant.
    Analyze the current state of our digital center "CyberFlow AI":
    - Current printer queue: ${queueStatus}
    - CSC governmental applications: ${cscSummary}
    - Prices: B&W Page (Rs. ${settingsDb.pricePerBWPage}), Color Page (Rs. ${settingsDb.pricePerColorPage}), Lamination (Rs. ${settingsDb.pricePerLamination}).
    
    Provide 3 high-impact, professional, and actionable business optimization bullet points for the cafe owner. Keep them short, concise, and focused on maximizing profits, handling waiting lines, and routing printing work efficiently.
    Do not use complex formatting. Just return a clean string with 3 bulleted insights.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ insight: response.text });
  } catch (error) {
    console.error("Gemini Analytics Consultant Error:", error);
    res.status(500).json({ error: "Gemini insights failed." });
  }
});

// --- VITE DEV / PRODUCTION MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
