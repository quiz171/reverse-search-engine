import React, { useState } from "react";
import { User } from "../types.js";
import { LogIn, UserPlus, Shield, GraduationCap, Mail, Lock, User as UserIcon, BookOpen } from "lucide-react";

interface AuthViewProps {
  onLoginSuccess: (user: User) => void;
  onCancel: () => void;
  initialMode?: "student-login" | "student-register" | "admin-login";
}

export default function AuthView({ onLoginSuccess, onCancel, initialMode = "student-login" }: AuthViewProps) {
  const [mode, setMode] = useState<"student-login" | "student-register" | "admin-login">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("100 Level");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "student-register") {
        if (!email || !password || !name) {
          throw new Error("Please fill in all required fields.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, department, level })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to register student.");
        onLoginSuccess(data.user);
      } else {
        // Logins (student or admin)
        if (!email || !password) {
          throw new Error("Please enter your email and password.");
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to login.");

        if (mode === "admin-login" && data.user.role !== "admin") {
          // If a student tries to login via the admin gate, allow it but update role,
          // or alert them. Let's redirect properly based on the returned role.
          onLoginSuccess(data.user);
        } else {
          onLoginSuccess(data.user);
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden" id="auth_view_container">
      {/* Header Accent */}
      <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

      <div className="p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold font-display text-slate-800 dark:text-slate-100 text-center">
            {mode === "student-login" && "Student Sign In"}
            {mode === "student-register" && "Create Student Account"}
            {mode === "admin-login" && "Administrator Portal"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center">
            {mode === "student-login" && "Find notes, past papers & projects by description"}
            {mode === "student-register" && "Join your fellow students to save resources"}
            {mode === "admin-login" && "Manage school learning resources and stats"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-sm rounded-lg flex items-start gap-2">
            <span className="font-semibold text-xs mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Demo credentials removed for production */}

        {/* Demo admin credentials removed */}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "student-register" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-750 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white dark:bg-slate-950"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === "admin-login" ? "admin@yourdomain.edu" : "student@university.edu"}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-750 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-750 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          {mode === "student-register" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-750 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="100 Level">100 Level</option>
                  <option value="200 Level">200 Level</option>
                  <option value="300 Level">300 Level</option>
                  <option value="400 Level">400 Level</option>
                  <option value="500 Level">500 Level</option>
                  <option value="Postgraduate">Postgraduate</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            id="auth_submit_btn"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {mode === "student-login" && <LogIn className="w-4 h-4" />}
                {mode === "student-register" && <UserPlus className="w-4 h-4" />}
                {mode === "admin-login" && <Shield className="w-4 h-4" />}
                <span>
                  {mode === "student-login" && "Sign In as Student"}
                  {mode === "student-register" && "Create Account"}
                  {mode === "admin-login" && "Sign In as Admin"}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Tab Switchers */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3 text-xs text-center text-slate-500 dark:text-slate-400">
          {mode === "student-login" && (
            <>
              <div>
                Don't have an account?{" "}
                <button
                  onClick={() => { setMode("student-register"); setError(null); }}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                >
                  Register Now
                </button>
              </div>
              <div>
                Are you an Administrator?{" "}
                <button
                  onClick={() => { setMode("admin-login"); setError(null); }}
                  className="text-slate-700 dark:text-slate-300 font-semibold hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto mt-1"
                >
                  <Shield className="w-3 h-3" /> Admin Portal
                </button>
              </div>
            </>
          )}

          {mode === "student-register" && (
            <div>
              Already have an account?{" "}
              <button
                onClick={() => { setMode("student-login"); setError(null); }}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}

          {mode === "admin-login" && (
            <div>
              Back to student access?{" "}
              <button
                onClick={() => { setMode("student-login"); setError(null); }}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto mt-1"
              >
                <GraduationCap className="w-3.5 h-3.5" /> Student Login
              </button>
            </div>
          )}

          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mt-2 font-medium transition-colors"
          >
            Cancel and Return Home
          </button>
        </div>
      </div>
    </div>
  );
}
