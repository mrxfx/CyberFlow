export interface Job {
  id: string;
  customerName: string;
  phone: string;
  serviceType: string;
  fileName?: string;
  fileSize?: string;
  fileData?: string;
  fileType?: string;
  copies: number;
  colorMode: "bw" | "color";
  paperSize: "A4" | "A3" | "Legal" | "Letter";
  sideMode: "single" | "double";
  notes?: string;
  status: "Waiting" | "Printing" | "Completed" | "Cancelled" | "Expired";
  createdAt: string;
  pagesCount: number;
  assignedPrinter: string;
  price: number;
  isPriority?: boolean;
}

export interface CSCLog {
  id: string;
  customerName: string;
  phone: string;
  serviceName: string;
  status: "Pending" | "In Progress" | "Completed" | "Failed";
  fee: number;
  notes?: string;
  createdAt: string;
}

export interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
  email: string;
  pricePerBWPage: number;
  pricePerColorPage: number;
  pricePerScan: number;
  pricePerLamination: number;
  pricePassportPhoto: number;
  defaultExpiryMinutes: number;
  autoPrint: boolean;
  deleteAfterPrint: boolean;
  gstPercent: number;
}

export interface AnalyticsStats {
  totalCustomers: number;
  totalRevenue: number;
  pendingJobs: number;
  completedJobsCount: number;
  topServices: { name: string; count: number }[];
  dailyRevenue: { date: string; "Print Revenue": number; "CSC Revenue": number; Total: number }[];
}

export type ViewState = "home" | "admin" | "upload" | "status";
