import React, { useState, useEffect } from "react";
import { User, Resource } from "./types.js";
import AuthView from "./components/AuthView.js";
import StudentDashboard from "./components/StudentDashboard.js";
import AdminDashboard from "./components/AdminDashboard.js";
import ResourceDetailsModal from "./components/ResourceDetailsModal.js";
import ReactMarkdown from "react-markdown";
import { 
  BookOpen, LogIn, UserPlus, LogOut, Compass, Sparkles, Star, 
  GraduationCap, Shield, ChevronRight, Search, FileText, ExternalLink, HelpCircle,
  Sun, Moon
} from "lucide-react";

export default function App() {
  // Session State
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Modal / Auth Controls
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<"student-login" | "student-register" | "admin-login">("student-login");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Landing Page Search States (Guests or logged-in users search here too)
  const [landingQuery, setLandingQuery] = useState("");
  const [landingResources, setLandingResources] = useState<Resource[]>([]);
  const [landingLoading, setLandingLoading] = useState(false);
  const [hasSearchedLanding, setHasSearchedLanding] = useState(false);
  const [landingMessage, setLandingMessage] = useState<string | null>(null);
  const [landingAiFeedback, setLandingAiFeedback] = useState<string | null>(null);
  const [landingAiResources, setLandingAiResources] = useState<Resource[]>([]);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") {
        return saved;
      }
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // On mount, check if there's an active cookie-session
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error("Session check failed", err);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setShowAuthModal(false);
    setLandingMessage(null);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      // Reset search lists
      setLandingQuery("");
      setLandingResources([]);
      setHasSearchedLanding(false);
      setLandingAiFeedback(null);
      setLandingAiResources([]);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleLandingSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!landingQuery.trim()) return;

    setLandingLoading(true);
    setLandingMessage(null);
    setLandingAiFeedback(null);
    setLandingAiResources([]);
    try {
      const res = await fetch(`/api/resources?q=${encodeURIComponent(landingQuery)}`);
      const data = await res.json();
      if (res.ok) {
        setLandingResources(data.resources || []);
        setLandingAiFeedback(data.aiFeedback || null);
        setLandingAiResources(data.aiResources || []);
        setHasSearchedLanding(true);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLandingLoading(false);
    }
  };

  const openAuthGate = (mode: "student-login" | "student-register" | "admin-login") => {
    setAuthInitialMode(mode);
    setShowAuthModal(true);
  };

  const handleFavoriteLandingResult = async (resource: Resource) => {
    if (!user) {
      setLandingMessage("Please sign in or register a Student account to save favorites and view your history!");
      openAuthGate("student-login");
      return;
    }
    if (user.role !== "student") {
      setLandingMessage("Only registered student accounts can favorite learning materials.");
      return;
    }

    const isFav = resource.isFavorite;
    const method = isFav ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/student/favorites/${resource.id}`, { method });
      if (res.ok) {
        setLandingResources(landingResources.map(r => r.id === resource.id ? { ...r, isFavorite: !isFav } : r));
        setLandingMessage(isFav ? "Removed from favorites." : "Added to your favorites collection!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300" id="main_app_wrapper">
      
      {/* ----------------------------- NAVIGATION HEADER ----------------------------- */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-sm" id="main_navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Compass className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-100 font-display text-base block tracking-tight">Reverse Search</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">For Students</span>
            </div>
          </div>

          {/* Nav Controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer mr-1"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
              id="theme_toggle_btn"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {sessionLoading ? (
              <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-display">{user.name}</span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    user.role === "admin" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {user.role}
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  id="navbar_logout_btn"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthGate("student-login")}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  id="navbar_signin_btn"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthGate("student-register")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  id="navbar_register_btn"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Join / Register</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* ----------------------------- MAIN CONTAINER STAGE ----------------------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="main_content_stage">
        
        {sessionLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-400">Restoring academic credentials...</span>
          </div>
        ) : user ? (
          // Logged-in Dashboard Routing
          user.role === "admin" ? (
            <AdminDashboard 
              user={user} 
              onLogout={handleLogout} 
              onSelectResource={(r) => setSelectedResource(r)} 
            />
          ) : (
            <StudentDashboard 
              user={user} 
              onLogout={handleLogout} 
              onSelectResource={(r) => setSelectedResource(r)}
              onUpdateProfileSuccess={(updatedUser) => setUser(updatedUser)}
            />
          )
        ) : (
          // ------------------------------------ GUEST LANDING PAGE ------------------------------------
          <div className="space-y-12" id="guest_landing_view">
            
            {/* Hero Splash Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4 pt-4 pb-2">
              <h1 className="text-4xl sm:text-5xl font-black font-display text-slate-900 dark:text-white tracking-tight leading-none">
                Find Study Materials by <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 px-2 rounded-lg">Meaning</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Describe your research topic, assignments, or coding challenges in natural language instead of exact course titles. Our system matches keywords to tags and description scoring!
              </p>
            </div>

            {/* Natural Landing Search Input Card */}
            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-md">
              {landingMessage && (
                <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-800 dark:text-indigo-300 text-xs rounded-lg text-center font-medium">
                  {landingMessage}
                </div>
              )}

              <form onSubmit={handleLandingSearchSubmit} className="space-y-4">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <Search className="w-5 h-5 text-indigo-500" />
                  </span>
                  <input
                    type="text"
                    value={landingQuery}
                    onChange={(e) => setLandingQuery(e.target.value)}
                    placeholder='e.g. "I need a final year project on machine learning" or "C++ stacks"'
                    className="w-full pl-12 pr-28 py-4 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-display text-base"
                    id="guest_natural_input"
                  />
                  <div className="absolute inset-y-1.5 right-1.5 flex items-center">
                    <button
                      type="submit"
                      disabled={landingLoading}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      {landingLoading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Compass className="w-4 h-4" />
                          <span>Search</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Landing Search Results Loading Skeleton */}
            {landingLoading && (
              <div className="max-w-5xl mx-auto space-y-6" id="landing_ai_search_loading">
                <div className="bg-gradient-to-r from-indigo-50/40 to-blue-50/40 dark:from-indigo-950/20 dark:to-blue-950/20 border border-indigo-100/50 dark:border-indigo-900/50 rounded-xl p-6 shadow-sm space-y-3 animate-pulse">
                  <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold text-sm">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                    <span>AI Reverse Search Engine is fetching grounded online resources...</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-200/80 dark:bg-slate-800 rounded w-5/6"></div>
                    <div className="h-3 bg-slate-200/80 dark:bg-slate-800 rounded w-full"></div>
                    <div className="h-3 bg-slate-200/80 dark:bg-slate-800 rounded w-4/5"></div>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono italic">
                    Mapping natural language meaning, scouring open-courseware databases, and matching categories...
                  </p>
                </div>
              </div>
            )}

            {/* Landing Search Results stage */}
            {hasSearchedLanding && (
              <div className="max-w-5xl mx-auto space-y-6" id="landing_results_stage">
                
                {/* Advisor Feedback Card */}
                {landingAiFeedback && (
                  <div className="bg-gradient-to-r from-indigo-50/70 to-blue-50/70 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold text-sm">
                      <Sparkles className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                      <span>Academic Advisor Feedback & Guidance</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-sans font-medium whitespace-pre-line [&_a]:text-indigo-600 [&_a]:dark:text-indigo-400 [&_a]:underline [&_a]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_p]:mb-2">
                      <ReactMarkdown>{landingAiFeedback}</ReactMarkdown>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Left Column: Local Curriculum Materials */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                      <h3 className="font-bold font-display text-slate-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Local Curriculum Materials</span>
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {landingResources.length} files
                      </span>
                    </div>

                    {landingResources.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center border border-slate-100/60 dark:border-slate-800/80 shadow-sm">
                        <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">No local matches</h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                          No matching local resources are currently uploaded in the school database.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {landingResources.map((r) => (
                          <div 
                            key={r.id} 
                            className="bg-white dark:bg-slate-900 rounded-xl p-4.5 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md dark:hover:shadow-black/30 transition-all flex flex-col justify-between gap-3"
                          >
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider">
                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded">
                                  {r.category_name}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono rounded">
                                  {r.course_code}
                                </span>
                              </div>
                              
                              <div>
                                <h4 
                                  className="font-bold text-slate-800 dark:text-slate-100 font-display text-sm sm:text-base hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                  onClick={() => setSelectedResource(r)}
                                >
                                  {r.title}
                                </h4>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed line-clamp-2">
                                  {r.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-850 mt-1">
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                                Relevance: {r.relevance_score || 5}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleFavoriteLandingResult(r)}
                                  className="p-1 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:text-amber-500 transition-colors cursor-pointer"
                                  title="Save Favorite"
                                >
                                  <Star className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setSelectedResource(r)}
                                  className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] rounded transition-all cursor-pointer flex items-center gap-0.5"
                                >
                                  <span>Details</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Curated Online Materials */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                      <h3 className="font-bold font-display text-slate-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Curated Online Resources</span>
                      </h3>
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/60">
                        {landingAiResources.length} items
                      </span>
                    </div>

                    {landingAiResources.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center border border-slate-100/60 dark:border-slate-800/80 shadow-sm flex flex-col items-center justify-center">
                        <Compass className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2 animate-spin-slow" />
                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">No online matches found</h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                          Try searching for specific academic terms to trigger real-time educational web grounding.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {landingAiResources.map((r) => (
                          <div 
                            key={r.id} 
                            className="bg-gradient-to-br from-white dark:from-slate-900 to-emerald-50/10 dark:to-emerald-950/5 rounded-xl p-4.5 border border-emerald-100/50 dark:border-emerald-900/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
                          >
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider">
                                <span className="px-2 py-0.5 bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-100 dark:border-emerald-900/60">
                                  {r.category_name}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono rounded">
                                  {r.course_code}
                                </span>
                                <span className="px-1.5 py-0.5 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 rounded text-[8px] font-extrabold uppercase ml-auto">
                                  Verified Web link
                                </span>
                              </div>
                              
                              <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 font-display text-sm sm:text-base">
                                  {r.title}
                                </h4>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed line-clamp-2">
                                  {r.description}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-1 mt-1">
                                {r.tags.map((tag, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-500 font-mono text-[9px] rounded">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100/60 dark:border-slate-850 mt-1">
                              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                Level: {r.level}
                              </span>
                              {r.external_link ? (
                                <a
                                  href={r.external_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                >
                                  <span>Open Material</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">Link Unavailable</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* Standard static feature showcase section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="font-bold font-display text-slate-800 dark:text-slate-100 text-lg">Keyword Relevance Mapping</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  Our custom reverse scoring engine scores resources: +5 if terms match titles, +3 if tags match, and +2 for descriptions. Finding materials has never been easier.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Star className="w-5 h-5 fill-emerald-500/10" />
                </div>
                <h3 className="font-bold font-display text-slate-800 dark:text-slate-100 text-lg">Favorite Vault</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  Students can save lectures, books, past questions, and project templates into their personal profiles for fast reference anytime.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold font-display text-slate-800 dark:text-slate-100 text-lg">Administrative Control</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  School administrators can upload material PDF files, add external resource references, audit category lists, and review search telemetry.
                </p>
              </div>
            </div>

            {/* Quick demo sign-in instructions footer banner */}
            <div className="bg-gradient-to-r from-indigo-900 dark:from-indigo-950 to-indigo-800 dark:to-indigo-900 text-white rounded-2xl p-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-xl font-bold font-display">Ready to test the full system?</h3>
                <p className="text-indigo-200 text-xs">Register a new Student account, or sign in as an Administrator using the default credentials.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => openAuthGate("student-register")}
                  className="px-5 py-2.5 bg-white text-indigo-900 hover:bg-slate-50 font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Create Student Account
                </button>
                <button
                  onClick={() => openAuthGate("admin-login")}
                  className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg border border-indigo-500/50 shadow-sm transition-all cursor-pointer"
                >
                  Admin Portal demo
                </button>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ----------------------------- PERSISTENT DIALOGS / MODALS ----------------------------- */}

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <AuthView 
            initialMode={authInitialMode}
            onLoginSuccess={handleLoginSuccess}
            onCancel={() => setShowAuthModal(false)}
          />
        </div>
      )}

      {/* Resource Details Modal */}
      {selectedResource && (
        <ResourceDetailsModal 
          resource={selectedResource}
          isLoggedInStudent={!!user && user.role === "student"}
          isFavorited={user?.role === "student" && selectedResource.isFavorite === true}
          onToggleFavorite={async () => {
            const isFav = selectedResource.isFavorite;
            const method = isFav ? "DELETE" : "POST";
            try {
              const res = await fetch(`/api/student/favorites/${selectedResource.id}`, { method });
              if (res.ok) {
                // Sync detailed state
                const updated = { ...selectedResource, isFavorite: !isFav };
                setSelectedResource(updated);
                // Sync list if matching
                if (hasSearchedLanding) {
                  setLandingResources(landingResources.map(r => r.id === selectedResource.id ? updated : r));
                }
              }
            } catch (err) {
              console.error(err);
            }
          }}
          onClose={() => setSelectedResource(null)}
        />
      )}

      {/* ----------------------------- FOOTER SIGNATURE ----------------------------- */}
      <footer className="bg-white dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80 py-6 mt-16 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Academic Reverse Search Platform. Design by Nelson</p>
        </div>
      </footer>

    </div>
  );
}
