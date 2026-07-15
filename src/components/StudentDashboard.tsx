import React, { useState, useEffect } from "react";
import { User, Resource, Category, SearchHistory } from "../types.js";
import ReactMarkdown from "react-markdown";
import { 
  Search, Star, History, UserCheck, BookOpen, Compass, Filter, 
  ExternalLink, FileText, ChevronRight, X, Sparkles, RefreshCw, BookmarkCheck
} from "lucide-react";

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
  onSelectResource: (resource: Resource) => void;
  onUpdateProfileSuccess: (updatedUser: User) => void;
}

export default function StudentDashboard({ user, onLogout, onSelectResource, onUpdateProfileSuccess }: StudentDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<Resource[]>([]);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiResources, setAiResources] = useState<Resource[]>([]);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedCourseCode, setSelectedCourseCode] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("");

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<"search" | "favorites" | "history" | "profile">("search");
  
  // Profile Form
  const [profileName, setProfileName] = useState(user.name);
  const [profileDept, setProfileDept] = useState(user.department || "");
  const [profileLevel, setProfileLevel] = useState(user.level || "100 Level");

  const [loading, setLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Recommendations (latest or highly rated resources when query is empty)
  const [recommendations, setRecommendations] = useState<Resource[]>([]);

  // Unique list of departments and levels for filters (extracted from resources)
  const [uniqueDepts, setUniqueDepts] = useState<string[]>([]);

  // Fetch categories, resources, favorites, and history on mount
  useEffect(() => {
    fetchCategories();
    fetchResources();
    fetchFavorites();
    fetchHistory();
  }, []);

  // Update unique departments whenever resources list changes
  useEffect(() => {
    if (resources.length > 0) {
      const depts = Array.from(new Set(resources.map(r => r.department).filter(d => d)));
      setUniqueDepts(depts);
    }
  }, [resources]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (res.ok) setCategories(data.categories);
    } catch (err) {
      console.error("Error fetching categories", err);
    }
  };

  const fetchResources = async (queryStr = searchQuery) => {
    setLoading(true);
    setAiFeedback(null);
    setAiResources([]);
    try {
      // Construct query parameters
      const params = new URLSearchParams();
      if (queryStr) params.append("q", queryStr);
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (selectedDept) params.append("department", selectedDept);
      if (selectedLevel) params.append("level", selectedLevel);
      if (selectedCourseCode) params.append("courseCode", selectedCourseCode);
      if (selectedFileType) params.append("fileType", selectedFileType);

      const res = await fetch(`/api/resources?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setResources(data.resources || []);
        setAiFeedback(data.aiFeedback || null);
        setAiResources(data.aiResources || []);
        // If query is empty, treat these as standard/recommendation list
        if (!queryStr && !selectedCategory && !selectedDept && !selectedLevel && !selectedCourseCode && !selectedFileType) {
          setRecommendations((data.resources || []).slice(0, 3)); // Top 3 as recommendations
        }
      }
    } catch (err) {
      console.error("Error fetching resources", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    setFavoritesLoading(true);
    try {
      const res = await fetch("/api/student/favorites");
      const data = await res.json();
      if (res.ok) setFavorites(data.favorites);
    } catch (err) {
      console.error("Error fetching favorites", err);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/student/search-history");
      const data = await res.json();
      if (res.ok) setHistory(data.history);
    } catch (err) {
      console.error("Error fetching history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResources();
    fetchHistory(); // Refresh history since we added a query log
  };

  const handleClearFilters = () => {
    setSelectedCategory("");
    setSelectedDept("");
    setSelectedLevel("");
    setSelectedCourseCode("");
    setSelectedFileType("");
    // Re-fetch instantly with empty filters
    setTimeout(() => {
      fetchResources("");
    }, 50);
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    setActiveTab("search");
    fetchResources(tag);
  };

  const handleHistoryClick = (queryText: string) => {
    setSearchQuery(queryText);
    setActiveTab("search");
    fetchResources(queryText);
  };

  const toggleFavorite = async (resource: Resource) => {
    const isFav = favorites.some(f => f.id === resource.id);
    const method = isFav ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/student/favorites/${resource.id}`, { method });
      if (res.ok) {
        // Toggle in state
        if (isFav) {
          setFavorites(favorites.filter(f => f.id !== resource.id));
        } else {
          setFavorites([...favorites, resource]);
        }
        // Sync original resources array
        setResources(resources.map(r => r.id === resource.id ? { ...r, isFavorite: !isFav } : r));
      }
    } catch (err) {
      console.error("Error toggling favorite", err);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, department: profileDept, level: profileLevel })
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMessage({ type: "success", text: "Profile updated successfully!" });
        onUpdateProfileSuccess(data.user);
      } else {
        throw new Error(data.error || "Failed to update profile");
      }
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err.message });
    }
  };

  // Run search when filters update
  useEffect(() => {
    fetchResources();
  }, [selectedCategory, selectedDept, selectedLevel, selectedFileType]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="student_dashboard_layout">
      {/* Sidebar navigation */}
      <div className="lg:col-span-3 space-y-6">
        {/* Welcome Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-600 font-display text-xl font-bold mb-3">
            {user.name.split(" ").map(n => n[0]).join("")}
          </div>
          <h3 className="font-bold text-slate-800 font-display">{user.name}</h3>
          <p className="text-slate-500 text-xs mt-0.5">{user.email}</p>
          
          <div className="mt-4 pt-4 border-t border-slate-100 w-full grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-slate-800">{favorites.length}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Saved</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">{history.length}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Searches</div>
            </div>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <nav className="flex flex-col">
            <button
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-3 px-5 py-4 text-sm font-medium transition-all text-left cursor-pointer border-l-4 ${
                activeTab === "search" 
                  ? "bg-indigo-50/50 border-indigo-600 text-indigo-700 font-semibold" 
                  : "border-transparent text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Reverse Search Desk</span>
            </button>
            <button
              onClick={() => { setActiveTab("favorites"); fetchFavorites(); }}
              className={`flex items-center gap-3 px-5 py-4 text-sm font-medium transition-all text-left cursor-pointer border-l-4 ${
                activeTab === "favorites" 
                  ? "bg-indigo-50/50 border-indigo-600 text-indigo-700 font-semibold" 
                  : "border-transparent text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Star className="w-4 h-4" />
              <span>Saved Favorites ({favorites.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("history"); fetchHistory(); }}
              className={`flex items-center gap-3 px-5 py-4 text-sm font-medium transition-all text-left cursor-pointer border-l-4 ${
                activeTab === "history" 
                  ? "bg-indigo-50/50 border-indigo-600 text-indigo-700 font-semibold" 
                  : "border-transparent text-slate-600 hover:bg-slate-50"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Search Log ({history.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3 px-5 py-4 text-sm font-medium transition-all text-left cursor-pointer border-l-4 ${
                activeTab === "profile" 
                  ? "bg-indigo-50/50 border-indigo-600 text-indigo-700 font-semibold" 
                  : "border-transparent text-slate-600 hover:bg-slate-50"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Personal Profile</span>
            </button>
          </nav>
        </div>

        {/* Quick Tips */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-5 text-white shadow-md">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Search Concept Hint</span>
          </div>
          <p className="text-xs text-indigo-100 leading-relaxed">
            Instead of typing standard subjects, describe what you are looking to build or solve! 
          </p>
          <div className="mt-3 p-2 bg-white/10 rounded text-[11px] font-mono text-indigo-200">
            "I need an AI project using computer vision"
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="lg:col-span-9">
        {/* ------------------------------------ SEARCH VIEW ------------------------------------ */}
        {activeTab === "search" && (
          <div className="space-y-6" id="student_search_panel">
            {/* Search Input Card */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
              <form onSubmit={handleSearchSubmit} className="space-y-4">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <Search className="w-5 h-5 text-indigo-500" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Describe your learning problem, project requirements, or question..."
                    className="w-full pl-12 pr-28 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-display shadow-inner text-base"
                    id="natural_search_input"
                  />
                  <div className="absolute inset-y-1.5 right-1.5 flex items-center gap-1">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(""); fetchResources(""); }}
                        className="p-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-all shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Search</span>
                    </button>
                  </div>
                </div>

                {/* Horizontal Advanced Filters Accordion */}
                <div className="pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span>Resource Filters</span>
                    {(selectedCategory || selectedDept || selectedLevel || selectedCourseCode || selectedFileType) && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="ml-auto text-indigo-600 font-bold normal-case hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3 animate-spin" /> Clear All Filters
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {/* Category */}
                    <div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-100 rounded-lg text-xs bg-slate-50 hover:bg-slate-100/70 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">All Categories</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Department */}
                    <div>
                      <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-100 rounded-lg text-xs bg-slate-50 hover:bg-slate-100/70 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">All Departments</option>
                        {uniqueDepts.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Level */}
                    <div>
                      <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-100 rounded-lg text-xs bg-slate-50 hover:bg-slate-100/70 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">All Levels</option>
                        <option value="100 Level">100 Level</option>
                        <option value="200 Level">200 Level</option>
                        <option value="300 Level">300 Level</option>
                        <option value="400 Level">400 Level</option>
                        <option value="500 Level">500 Level</option>
                        <option value="Postgraduate">Postgraduate</option>
                      </select>
                    </div>

                    {/* Course Code input */}
                    <div>
                      <input
                        type="text"
                        placeholder="Course Code"
                        value={selectedCourseCode}
                        onChange={(e) => setSelectedCourseCode(e.target.value)}
                        onBlur={() => fetchResources()}
                        className="w-full px-2.5 py-1.5 border border-slate-100 rounded-lg text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* File Type */}
                    <div>
                      <select
                        value={selectedFileType}
                        onChange={(e) => setSelectedFileType(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-100 rounded-lg text-xs bg-slate-50 hover:bg-slate-100/70 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">All Formats</option>
                        <option value="pdf">PDF Uploads</option>
                        <option value="link">Web References</option>
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Results Grid Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 font-display text-lg">
                  {searchQuery ? "Search Results" : "All Available Resources"}
                  {loading && <span className="text-xs font-normal text-slate-400 ml-2 animate-pulse">Loading...</span>}
                </h4>
                <p className="text-xs text-slate-500">
                  Showing <strong>{resources.length}</strong> resources found
                </p>
              </div>

              {/* Academic Advisor Feedback */}
              {aiFeedback && (
                <div className="bg-gradient-to-r from-indigo-50/70 to-blue-50/70 border border-indigo-100 rounded-xl p-5 shadow-sm space-y-3" id="student_ai_advisor_card">
                  <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                    <span>Academic Advisor Feedback & Guidance</span>
                  </div>
                  <div className="text-slate-700 text-xs sm:text-sm leading-relaxed font-sans font-medium whitespace-pre-line [&_a]:text-indigo-600 [&_a]:dark:text-indigo-400 [&_a]:underline [&_a]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_p]:mb-2">
                    <ReactMarkdown>{aiFeedback}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Academic Advisor Feedback Loading Skeleton */}
              {loading && searchQuery && (
                <div className="bg-gradient-to-r from-indigo-50/40 to-blue-50/40 border border-indigo-100/50 rounded-xl p-5 shadow-sm space-y-3 animate-pulse" id="student_ai_advisor_loading_card">
                  <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-600 animate-spin" />
                    <span>AI Advisor is matching study materials on the web...</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-200/80 rounded w-5/6"></div>
                    <div className="h-3 bg-slate-200/80 rounded w-full"></div>
                    <div className="h-3 bg-slate-200/80 rounded w-4/5"></div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono italic">
                    Consulting academic indexes, retrieving grounded tutorials, and compiling learning feedback...
                  </p>
                </div>
              )}

              {searchQuery ? (
                // Dual Columns when there is a search query active
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Local Curriculum Materials Column */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-slate-800 font-display text-sm sm:text-base flex items-center gap-1.5">
                        <BookOpen className="w-4.5 h-4.5 text-indigo-600" />
                        <span>Local School Materials</span>
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {resources.length} local files
                      </span>
                    </div>

                    {resources.length === 0 ? (
                      <div className="bg-white rounded-xl p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3 border border-dashed border-slate-200">
                          <Search className="w-5 h-5" />
                        </div>
                        <h4 className="text-slate-700 font-bold font-display text-sm">No local curriculum files</h4>
                        <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
                          No matching materials are currently in the school's local registry.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4" id="search_results_list_local">
                        {resources.map((r) => {
                          const isFav = favorites.some(f => f.id === r.id);
                          return (
                            <div 
                              key={r.id} 
                              className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
                            >
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider">
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                                    {r.category_name}
                                  </span>
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-mono rounded">
                                    {r.course_code}
                                  </span>
                                </div>

                                <div>
                                  <h3 className="font-bold text-slate-800 font-display text-sm sm:text-base hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => onSelectResource(r)}>
                                    {r.title}
                                  </h3>
                                  <p className="text-slate-500 text-xs mt-1 leading-relaxed line-clamp-2">
                                    {r.description}
                                  </p>
                                </div>

                                {r.tags.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1 pt-1">
                                    {r.tags.map((tag, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => handleTagClick(tag)}
                                        className="px-1.5 py-0.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 font-mono text-[9px] rounded border border-slate-100 transition-colors cursor-pointer"
                                      >
                                        #{tag}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-2.5 border-t border-slate-50 mt-1">
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                  Score: {r.relevance_score || 0} pts
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => toggleFavorite(r)}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      isFav 
                                        ? "bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100/50" 
                                        : "bg-slate-50 border-slate-100 text-slate-400 hover:text-amber-500 hover:bg-amber-50/20"
                                    }`}
                                    title={isFav ? "Remove Favorite" : "Save Favorite"}
                                  >
                                    <Star className={`w-3.5 h-3.5 ${isFav ? "fill-amber-500" : ""}`} />
                                  </button>

                                  <button
                                    onClick={() => onSelectResource(r)}
                                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-0.5"
                                  >
                                    <span>Details</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Online Resources Column */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-slate-800 font-display text-sm sm:text-base flex items-center gap-1.5">
                        <Sparkles className="w-4.5 h-4.5 text-emerald-600" />
                        <span>Curated Online Resources</span>
                      </h4>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        {aiResources.length} items
                      </span>
                    </div>

                    {aiResources.length === 0 ? (
                      <div className="bg-white rounded-xl p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                        <Compass className="w-10 h-10 text-slate-300 mb-2 animate-spin-slow" />
                        <h4 className="text-slate-700 font-bold font-display text-sm">No online materials found</h4>
                        <p className="text-slate-500 text-xs mt-1 max-w-xs leading-relaxed">
                          Academic advisor is searching... Describe your topic explicitly to trigger online study matches!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4" id="search_results_list_online">
                        {aiResources.map((or) => (
                          <div 
                            key={or.id} 
                            className="bg-gradient-to-br from-white to-emerald-50/5 rounded-xl p-5 border border-emerald-100/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
                          >
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                                  {or.category_name}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-mono rounded">
                                  {or.course_code}
                                </span>
                                <span className="px-1.5 py-0.5 bg-teal-50/70 text-teal-700 rounded text-[8px] font-extrabold uppercase ml-auto tracking-wide">
                                  Web reference
                                </span>
                              </div>

                              <div>
                                <h3 className="font-bold text-slate-800 font-display text-sm sm:text-base">
                                  {or.title}
                                </h3>
                                <p className="text-slate-500 text-xs mt-1 leading-relaxed line-clamp-2">
                                  {or.description}
                                </p>
                              </div>

                              {or.tags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 pt-1">
                                  {or.tags.map((tag: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.5 bg-slate-50 text-slate-400 font-mono text-[9px] rounded border border-slate-100"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100/60 mt-1">
                              <span className="text-[10px] font-semibold text-slate-400">
                                Level: {or.level}
                              </span>
                              {or.external_link ? (
                                <a
                                  href={or.external_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                >
                                  <span>Open Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">Unavailable</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Single-column traditional list when no query (e.g. general directory view)
                resources.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-dashed border-slate-200">
                      <Search className="w-6 h-6" />
                    </div>
                    <h3 className="text-slate-800 font-bold font-display text-lg">No resources matched your query</h3>
                    <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                      Try using broader descriptions or fewer constraints. You can search concepts like "trees", "machine learning", or "stack".
                    </p>
                    <button
                      onClick={() => { setSearchQuery(""); handleClearFilters(); }}
                      className="mt-5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Reset Search Parameters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4" id="search_results_list">
                    {resources.map((r) => {
                      const isFav = favorites.some(f => f.id === r.id);
                      return (
                        <div 
                          key={r.id} 
                          className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
                        >
                          <div className="space-y-3 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold text-[10px] uppercase rounded-full tracking-wider">
                                {r.category_name}
                              </span>
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-mono text-[10px] uppercase rounded-full">
                                {r.course_code}
                              </span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-500">{r.level}</span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-500">{r.department}</span>
                            </div>

                            <div>
                              <h3 className="font-bold text-slate-800 font-display text-lg hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => onSelectResource(r)}>
                                {r.title}
                              </h3>
                              <p className="text-slate-600 text-sm mt-1.5 leading-relaxed line-clamp-2">
                                {r.description}
                              </p>
                            </div>

                            {/* Resource Tags */}
                            {r.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {r.tags.map((tag, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleTagClick(tag)}
                                    className="px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 font-mono text-[10px] rounded border border-slate-100 transition-colors cursor-pointer"
                                  >
                                    #{tag}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Relevance Score & Action block */}
                          <div className="flex md:flex-col items-end justify-between md:justify-start gap-4 md:border-l md:border-slate-50 md:pl-6 min-w-[140px]">
                            {/* Score indicator */}
                            {r.relevance_score !== undefined && r.relevance_score > 0 && (
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5">
                                  <Sparkles className="w-4 h-4 text-amber-500" />
                                  <span className="text-sm font-bold text-slate-700 font-display">Score: {r.relevance_score} pts</span>
                                </div>
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                                  <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                                    style={{ width: `${Math.min(r.relevance_score * 5, 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2 w-full justify-end md:mt-4">
                              <button
                                onClick={() => toggleFavorite(r)}
                                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                                  isFav 
                                    ? "bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100/50" 
                                    : "bg-slate-50 border-slate-100 text-slate-400 hover:text-amber-500 hover:bg-amber-50/20"
                                }`}
                                title={isFav ? "Remove Favorite" : "Save Favorite"}
                              >
                                <Star className={`w-4 h-4 ${isFav ? "fill-amber-500" : ""}`} />
                              </button>

                              <button
                                onClick={() => onSelectResource(r)}
                                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <span>Details</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------ FAVORITES TAB ------------------------------------ */}
        {activeTab === "favorites" && (
          <div className="space-y-6" id="student_favorites_panel">
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                  <Star className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 font-display text-lg">My Favorited Resources</h3>
                  <p className="text-slate-500 text-xs">A personalized collection of your saved notes, papers, and projects.</p>
                </div>
              </div>
            </div>

            {favoritesLoading ? (
              <div className="p-12 text-center animate-pulse text-slate-400 text-sm">Loading favorites...</div>
            ) : favorites.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-100 shadow-sm">
                <BookmarkCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-800 font-display">No saved favorites yet</h4>
                <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                  Browse or search learning materials and click the star icon to save resources here for offline reference.
                </p>
                <button
                  onClick={() => setActiveTab("search")}
                  className="mt-4 px-4 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Explore Resources
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {favorites.map((r) => (
                  <div key={r.id} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[9px] uppercase rounded">
                          {r.category_name}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{r.course_code}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 font-display text-base hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => onSelectResource(r)}>
                        {r.title}
                      </h4>
                      <p className="text-slate-500 text-xs line-clamp-2">{r.description}</p>
                    </div>
                    
                    <div className="pt-4 mt-4 border-t border-slate-50 flex items-center justify-between">
                      <button
                        onClick={() => toggleFavorite(r)}
                        className="text-red-500 hover:text-red-700 font-semibold text-xs cursor-pointer"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => onSelectResource(r)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------ HISTORY TAB ------------------------------------ */}
        {activeTab === "history" && (
          <div className="space-y-6" id="student_history_panel">
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 font-display text-lg">My Search Log</h3>
                  <p className="text-slate-500 text-xs">Review and re-run your previous reverse queries instantly.</p>
                </div>
              </div>
            </div>

            {historyLoading ? (
              <div className="p-12 text-center animate-pulse text-slate-400 text-sm">Loading search history...</div>
            ) : history.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-100 shadow-sm">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-800 font-display">No search history</h4>
                <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                  Every search you perform using natural language descriptions is recorded here to help you trace back your learnings.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                      <th className="px-6 py-3.5">Query Text</th>
                      <th className="px-6 py-3.5">Results Returned</th>
                      <th className="px-6 py-3.5">Search Date</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4 font-medium text-slate-800">
                          "{h.search_text}"
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold ${h.results_count > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                            {h.results_count} resources
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(h.search_date).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleHistoryClick(h.search_text)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs cursor-pointer hover:underline"
                          >
                            Re-run Search
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------ PROFILE TAB ------------------------------------ */}
        {activeTab === "profile" && (
          <div className="space-y-6" id="student_profile_panel">
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 font-display text-lg">Update Academic Profile</h3>
                  <p className="text-slate-500 text-xs">Keep your department and class details accurate for smart recommendations.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm max-w-2xl">
              {profileMessage && (
                <div className={`mb-6 p-4 rounded-lg text-sm font-medium border ${
                  profileMessage.type === "success" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-red-50 border-red-200 text-red-800"
                }`}>
                  {profileMessage.text}
                </div>
              )}

              <form onSubmit={handleProfileUpdate} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Email Address (Read-only)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-3 py-2 border border-slate-100 bg-slate-50 rounded-lg text-sm text-slate-400 outline-none cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Department / Major
                    </label>
                    <input
                      type="text"
                      value={profileDept}
                      onChange={(e) => setProfileDept(e.target.value)}
                      placeholder="e.g. Computer Science"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Academic Level
                    </label>
                    <select
                      value={profileLevel}
                      onChange={(e) => setProfileLevel(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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

                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
