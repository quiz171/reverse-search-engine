import React, { useState, useEffect, useRef } from "react";
import { User, Resource, Category, StudentDetail, Stats } from "../types.js";
import { 
  BarChart, Users, BookOpen, Search, Layers, Plus, Edit, Trash2, 
  Upload, FileText, Link as LinkIcon, FolderPlus, Compass, AlertCircle, Save, CheckCircle, X
} from "lucide-react";

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  onSelectResource: (resource: Resource) => void;
}

export default function AdminDashboard({ user, onLogout, onSelectResource }: AdminDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<"stats" | "resources" | "categories" | "students">("stats");
  
  // Data States
  const [stats, setStats] = useState<Stats | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [students, setStudents] = useState<StudentDetail[]>([]);

  // Editing / Creating resource form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("100 Level");
  const [courseCode, setCourseCode] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category Manager states
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);

  // Messaging & Loaders
  const [statsLoading, setStatsLoading] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Drag and Drop State
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchCategories();
    fetchResources();
    fetchStudents();
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (res.ok) setStats(data.stats);
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (res.ok) setCategories(data.categories);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchResources = async () => {
    setResourcesLoading(true);
    try {
      const res = await fetch("/api/resources");
      const data = await res.json();
      if (res.ok) setResources(data.resources);
    } catch (err) {
      console.error("Error fetching resources:", err);
    } finally {
      setResourcesLoading(false);
    }
  };

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const res = await fetch("/api/admin/students");
      const data = await res.json();
      if (res.ok) setStudents(data.students);
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Drag-and-drop triggers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setFileError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== "application/pdf") {
        setFileError("Only PDF files are supported!");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        setFileError("Only PDF files are supported!");
        return;
      }
      setSelectedFile(file);
    }
  };

  // Open Add Resource form
  const handleOpenCreateForm = () => {
    setFormMode("create");
    setSelectedResourceId(null);
    setTitle("");
    setDescription("");
    setCategoryId(categories[0]?.id.toString() || "");
    setDepartment("");
    setLevel("100 Level");
    setCourseCode("");
    setExternalLink("");
    setTagsInput("");
    setSelectedFile(null);
    setFileError(null);
    setFormError(null);
    setFormSuccess(null);
    setIsFormOpen(true);
  };

  // Open Edit Resource form
  const handleOpenEditForm = async (resource: Resource) => {
    setFormMode("edit");
    setSelectedResourceId(resource.id);
    setTitle(resource.title);
    setDescription(resource.description);
    setCategoryId(resource.category_id.toString());
    setDepartment(resource.department);
    setLevel(resource.level);
    setCourseCode(resource.course_code);
    setExternalLink(resource.external_link || "");
    
    // Fetch individual resource tags
    try {
      const res = await fetch(`/api/resources/${resource.id}`);
      const data = await res.json();
      if (res.ok) {
        setTagsInput(data.resource.tags.join(", "));
      }
    } catch (err) {
      setTagsInput(resource.tags.join(", "));
    }

    setSelectedFile(null);
    setFileError(null);
    setFormError(null);
    setFormSuccess(null);
    setIsFormOpen(true);
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitLoading(true);

    try {
      if (!title || !description || !categoryId || !department || !level || !courseCode) {
        throw new Error("Please fill in all required fields.");
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category_id", categoryId);
      formData.append("department", department);
      formData.append("level", level);
      formData.append("course_code", courseCode);
      formData.append("external_link", externalLink);
      formData.append("tags", tagsInput);
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const url = formMode === "create" 
        ? "/api/admin/resources" 
        : `/api/admin/resources/${selectedResourceId}`;
      
      const method = formMode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        body: formData
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${formMode} resource.`);
      }

      setFormSuccess(`Resource ${formMode === "create" ? "created" : "updated"} successfully!`);
      setTimeout(() => {
        setIsFormOpen(false);
        fetchResources();
        fetchStats();
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteResource = async (id: number) => {
    if (!window.confirm("Are you absolutely sure you want to delete this resource? This will permanently remove its record, uploaded physical file, and students' saved favorites references.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/resources/${id}`, { method: "DELETE" });
      if (res.ok) {
        setResources(resources.filter(r => r.id !== id));
        fetchStats();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete resource");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    setCategorySuccess(null);

    if (!newCategoryName.trim()) {
      setCategoryError("Category name cannot be blank.");
      return;
    }

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName })
      });
      const data = await res.json();
      if (res.ok) {
        setCategorySuccess("Category created successfully!");
        setNewCategoryName("");
        fetchCategories();
        fetchStats();
      } else {
        throw new Error(data.error || "Failed to create category");
      }
    } catch (err: any) {
      setCategoryError(err.message);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this category? (Only empty categories can be deleted).")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setCategories(categories.filter(c => c.id !== id));
        fetchStats();
      } else {
        alert(data.error || "Failed to delete category");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8" id="admin_dashboard_layout">
      {/* Sub tabs bar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubTab("stats")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "stats" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <BarChart className="w-4 h-4" />
          <span>Dashboard Overview</span>
        </button>
        <button
          onClick={() => { setActiveSubTab("resources"); fetchResources(); }}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "resources" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Manage Resources ({resources.length})</span>
        </button>
        <button
          onClick={() => { setActiveSubTab("categories"); fetchCategories(); }}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "categories" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Course Categories ({categories.length})</span>
        </button>
        <button
          onClick={() => { setActiveSubTab("students"); fetchStudents(); }}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "students" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Students ({students.length})</span>
        </button>
      </div>

      {/* ------------------------------- STATS TAB ------------------------------- */}
      {activeSubTab === "stats" && (
        <div className="space-y-8" id="admin_overview_stage">
          {statsLoading ? (
            <div className="p-12 text-center animate-pulse text-slate-400 text-sm">Loading database statistics...</div>
          ) : !stats ? (
            <div className="p-12 text-center text-slate-400">Unable to load database metrics.</div>
          ) : (
            <>
              {/* Statistics cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Students</span>
                    <h3 className="text-2xl font-bold font-display text-slate-800">{stats.totalStudents}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Resources</span>
                    <h3 className="text-2xl font-bold font-display text-slate-800">{stats.totalResources}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Categories</span>
                    <h3 className="text-2xl font-bold font-display text-slate-800">{stats.totalCategories}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Searches</span>
                    <h3 className="text-2xl font-bold font-display text-slate-800">{stats.totalSearches}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Search className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Advanced Analytics Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Popular searches list */}
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 font-display text-base">Popular Reverse Searches</h4>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded uppercase">Search Telemetry</span>
                  </div>
                  
                  {stats.mostSearched.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No natural language query data recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.mostSearched.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg border border-slate-100/30">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-slate-300">#0{idx + 1}</span>
                            <span className="text-sm font-medium text-slate-700">"{s.topic}"</span>
                          </div>
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                            {s.count} searches
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Most Favorited / Saved Resources */}
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 font-display text-base">Most Saved Resources</h4>
                    <span className="text-[10px] bg-amber-50 text-amber-600 font-bold px-2 py-0.5 rounded uppercase">Engagement Stats</span>
                  </div>

                  {stats.mostSaved.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No resources have been saved by students yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.mostSaved.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg border border-slate-100/30">
                          <div className="flex-1 min-w-0 pr-4">
                            <h5 className="text-sm font-semibold text-slate-800 truncate">{s.title}</h5>
                            <span className="font-mono text-[10px] text-slate-400">{s.course_code}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded flex items-center gap-1.5 whitespace-nowrap shrink-0">
                            ★ {s.saves_count} saves
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Categories Distribution chart simulation */}
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
                  <h4 className="font-bold text-slate-800 font-display text-base">Resource Distribution by Category</h4>
                  
                  <div className="space-y-4 pt-2">
                    {stats.categoryDistribution.map((c, idx) => {
                      const maxCount = Math.max(...stats.categoryDistribution.map(item => item.resource_count), 1);
                      const pct = (c.resource_count / maxCount) * 100;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{c.category_name}</span>
                            <span className="font-bold text-slate-500">{c.resource_count} resources</span>
                          </div>
                          <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ------------------------------- RESOURCES TAB ------------------------------- */}
      {activeSubTab === "resources" && (
        <div className="space-y-6" id="admin_resources_stage">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-slate-800 font-display text-lg">Curriculum Resources</h3>
              <p className="text-slate-500 text-xs">Upload, edit, and organize lecture slides, textbooks, past exam papers, and reports.</p>
            </div>
            <button
              onClick={handleOpenCreateForm}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Learning Resource</span>
            </button>
          </div>

          {/* Form Modal for Creating/Editing Resource */}
          {isFormOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full overflow-hidden my-8 max-h-[90vh] flex flex-col">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <h3 className="font-bold text-slate-800 font-display text-lg">
                    {formMode === "create" ? "Add New Resource" : "Modify Resource Details"}
                  </h3>
                  <button onClick={() => setIsFormOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleResourceSubmit} className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Resource Title *</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Binary Search Trees and Balanced AVL Trees"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Resource Description / Content *</label>
                      <textarea
                        required
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Summarize what this resource teaches or solves so the reverse search algorithm can match it."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Category */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Category *</label>
                        <select
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Course Code */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Course Code *</label>
                        <input
                          type="text"
                          required
                          value={courseCode}
                          onChange={(e) => setCourseCode(e.target.value)}
                          placeholder="e.g. CSC302"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Department */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Department *</label>
                        <input
                          type="text"
                          required
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="e.g. Computer Science"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </div>

                      {/* Level */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Level *</label>
                        <select
                          value={level}
                          onChange={(e) => setLevel(e.target.value)}
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

                    {/* External Link */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">External Web Link (Optional)</label>
                      <input
                        type="url"
                        value={externalLink}
                        onChange={(e) => setExternalLink(e.target.value)}
                        placeholder="https://example.com/notes-resource"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Search Keywords / Tags (Comma-separated)</label>
                      <input
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="stack, queue, linear arrays, C++ (used for concept matches)"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    {/* File Upload drag/drop area */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Attach Course Material PDF</label>
                      
                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                          dragActive ? "border-indigo-500 bg-indigo-50/20" : "border-slate-200 hover:border-indigo-400 bg-slate-50/50"
                        }`}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="application/pdf"
                          className="hidden"
                        />
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <span className="text-xs font-semibold text-indigo-600 block hover:underline">
                          {selectedFile ? selectedFile.name : "Click to browse or drag & drop course PDF file"}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">PDF documents only, max 10MB</span>
                      </div>

                      {fileError && (
                        <span className="text-xs text-red-500 mt-1 block font-medium">⚠️ {fileError}</span>
                      )}
                    </div>

                    {/* Submit buttons */}
                    <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitLoading}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        {submitLoading ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>{formMode === "create" ? "Add Resource" : "Update Resource"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Resources Table list */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {resourcesLoading ? (
              <div className="p-12 text-center animate-pulse text-slate-400 text-sm">Loading curriculum materials...</div>
            ) : resources.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No educational materials created yet. Click "Add Learning Resource" to begin.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                      <th className="px-6 py-3.5">Title & Course</th>
                      <th className="px-6 py-3.5">Category</th>
                      <th className="px-6 py-3.5">Department & Level</th>
                      <th className="px-6 py-3.5">Att. PDF</th>
                      <th className="px-6 py-3.5">External Link</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {resources.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <span 
                              className="font-bold text-slate-800 text-sm font-display hover:text-indigo-600 cursor-pointer block"
                              onClick={() => onSelectResource(r)}
                            >
                              {r.title}
                            </span>
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-500 font-semibold">{r.course_code}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 font-bold uppercase rounded">
                            {r.category_name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5 text-slate-500 font-medium">
                            <div>{r.department}</div>
                            <div className="text-[10px] text-slate-400">{r.level}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {r.file_path ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" /> PDF
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {r.external_link ? (
                            <a 
                              href={r.external_link} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-indigo-500 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <LinkIcon className="w-3 h-3" /> Web
                            </a>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditForm(r)}
                            className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded text-slate-500 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteResource(r.id)}
                            className="p-1.5 bg-slate-50 hover:bg-red-50 hover:text-red-600 rounded text-slate-500 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* ------------------------------- CATEGORIES TAB ------------------------------- */}
      {activeSubTab === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8" id="admin_categories_stage">
          {/* Add Category Form */}
          <div className="md:col-span-4 space-y-4">
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-indigo-500" />
                <span>Create Category</span>
              </h3>
              
              {categoryError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">
                  {categoryError}
                </div>
              )}

              {categorySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
                  {categorySuccess}
                </div>
              )}

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Research Papers"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50/50"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Create Category
                </button>
              </form>
            </div>
          </div>

          {/* Categories List */}
          <div className="md:col-span-8 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3.5">ID</th>
                  <th className="px-6 py-3.5">Category Name</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4 font-mono text-slate-400">#0{c.id}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{c.name}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="text-red-500 hover:text-red-700 font-semibold hover:underline cursor-pointer text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------- STUDENTS TAB ------------------------------- */}
      {activeSubTab === "students" && (
        <div className="space-y-6" id="admin_students_stage">
          <div>
            <h3 className="font-bold text-slate-800 font-display text-lg">Enrolled Students</h3>
            <p className="text-slate-500 text-xs font-medium">Audit registered student majors, departments, academic classes, and engagement counts.</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {studentsLoading ? (
              <div className="p-12 text-center animate-pulse text-slate-400 text-sm">Loading students registry...</div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No registered student accounts in the database yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                      <th className="px-6 py-3.5">Student Name</th>
                      <th className="px-6 py-3.5">Email Contact</th>
                      <th className="px-6 py-3.5">Department & Level</th>
                      <th className="px-6 py-3.5">Favorites Stored</th>
                      <th className="px-6 py-3.5">Total Searches</th>
                      <th className="px-6 py-3.5">Date Enrolled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4 font-bold text-slate-800 text-sm font-display">{s.name}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{s.email}</td>
                        <td className="px-6 py-4 text-slate-500">
                          <span className="font-semibold">{s.department || "N/A"}</span>
                          <span className="text-[10px] text-slate-400 block">{s.level || "N/A"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 font-bold rounded">
                            ★ {s.favorites_count} favorited
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 font-bold rounded">
                            {s.searches_count} queries
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-mono">
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
