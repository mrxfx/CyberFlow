import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Key, Eye, EyeOff, AlertCircle, Loader2, Sparkles, User, Mail, Lock } from "lucide-react";
import CustomerUploadView from "./components/CustomerUploadView";
import AdminDashboardView from "./components/AdminDashboardView";

export default function App() {
  // Simple path-based client router
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  // Persist admin authentication status in localStorage for premium session preservation
  const [isAdminAuth, setIsAdminAuth] = useState<boolean>(() => {
    return localStorage.getItem("cyberflow_admin_auth") === "true";
  });

  const [email, setEmail] = useState("admin@cyberflow.ai");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Sync state with back/forward browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (newPath: string) => {
    window.history.pushState({}, "", newPath);
    setCurrentPath(newPath);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setAuthError("Please fill out all credentials.");
      return;
    }

    setIsVerifying(true);
    setAuthError("");

    // Simulate Firebase Authentication response
    setTimeout(() => {
      if (email.trim().toLowerCase() === "admin@cyberflow.ai" && password === "admin123") {
        setIsAdminAuth(true);
        localStorage.setItem("cyberflow_admin_auth", "true");
        setAuthError("");
        navigateTo("/admin");
      } else {
        setAuthError("Firebase Auth: Invalid email or password. Please use admin@cyberflow.ai and admin123");
      }
      setIsVerifying(false);
    }, 1000);
  };

  const handleAdminLogout = () => {
    setIsAdminAuth(false);
    localStorage.removeItem("cyberflow_admin_auth");
    navigateTo("/");
  };

  // Determine current active view based on path and auth status
  const isAdminPath = currentPath === "/admin" || currentPath === "/login";

  return (
    <div className="bg-white min-h-screen text-slate-900 selection:bg-blue-500/10 selection:text-blue-600 font-sans">
      <AnimatePresence mode="wait">
        {isAdminPath ? (
          isAdminAuth ? (
            /* Protected Admin Console */
            <motion.div
              key="admin-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AdminDashboardView onLogout={handleAdminLogout} />
            </motion.div>
          ) : (
            /* Firebase Login view for unauthorized Admin access */
            <motion.div
              key="admin-login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden"
            >
              {/* Subtle background glow */}
              <div className="absolute top-[-10%] right-[-10%] w-[35%] h-[35%] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[35%] h-[35%] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

              <div className="w-full max-w-md space-y-6 text-center z-10">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/10 mx-auto mb-2">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to Admin Console</h2>
                  <p className="text-xs text-slate-500">
                    Access your cyber cafe workflow, printing queue, and CSC tools.
                  </p>
                  
                  {/* Premium Badge indicating Firebase protection */}
                  <div className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium font-mono mt-1 bg-white shadow-xs border border-slate-200/80 py-1 px-3 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Secure Firebase Auth
                  </div>
                </div>

                {authError && (
                  <div className="p-3 bg-red-50 border border-red-200/60 rounded-xl text-xs text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-left font-medium">{authError}</p>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4 text-left bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="admin@cyberflow.ai"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Password</label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-900 transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Helpful Quick Login Helper Box */}
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-[11px] text-blue-800 leading-normal">
                    <strong>Demo Admin Access:</strong> Email <code className="font-semibold">admin@cyberflow.ai</code> and password <code className="font-semibold">admin123</code> are pre-loaded for easy testing.
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Verifying Admin credentials...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>

                <button
                  onClick={() => navigateTo("/")}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Go back to Customer Document Portal
                </button>
              </div>
            </motion.div>
          )
        ) : (
          /* Primary Customer Document Portal Landing Page */
          <motion.div
            key="customer-upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CustomerUploadView onNavigateToAdmin={() => navigateTo("/login")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
