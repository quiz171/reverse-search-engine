import React from "react";
import { Resource } from "../types.js";
import { X, FileText, ExternalLink, Calendar, Star, GraduationCap, ArrowRight } from "lucide-react";

interface ResourceDetailsModalProps {
  resource: Resource;
  onClose: () => void;
  isLoggedInStudent: boolean;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

export default function ResourceDetailsModal({ 
  resource, 
  onClose, 
  isLoggedInStudent, 
  isFavorited, 
  onToggleFavorite 
}: ResourceDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" id="resource_details_modal">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header decoration */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[9px] uppercase tracking-wider rounded">
              {resource.category_name}
            </span>
            <span className="font-mono text-xs text-slate-400 font-bold uppercase">{resource.course_code}</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-800 font-display text-xl leading-snug">
              {resource.title}
            </h3>
            
            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                {resource.department}
              </span>
              <span>•</span>
              <span>{resource.level}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(resource.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100/50 rounded-xl space-y-1.5">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Resource Description</h4>
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
              {resource.description}
            </p>
          </div>

          {/* Tags list */}
          {resource.tags.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Search Keywords & Tags</h4>
              <div className="flex flex-wrap gap-1.5">
                {resource.tags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="px-2.5 py-0.5 bg-slate-100 border border-slate-200/50 text-slate-600 font-mono text-[10px] rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Download and file attachments section */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            {resource.file_path && (
              <div className="flex items-center justify-between p-3.5 border border-emerald-100 bg-emerald-50/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Curriculum Lecture Material</h5>
                    <p className="text-[10px] text-slate-400">PDF Document attachment</p>
                  </div>
                </div>
                <a 
                  href={resource.file_path} 
                  download 
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Download</span>
                </a>
              </div>
            )}

            {resource.external_link && (
              <div className="flex items-center justify-between p-3.5 border border-indigo-100 bg-indigo-50/10 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">External Web reference</h5>
                    <p className="text-[10px] text-slate-400">Validated third-party educational link</p>
                  </div>
                </div>
                <a 
                  href={resource.external_link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Visit Link</span>
                </a>
              </div>
            )}

            {!resource.file_path && !resource.external_link && (
              <p className="text-xs text-slate-400 italic text-center py-2">No physical PDF or link is attached to this resource record.</p>
            )}
          </div>
        </div>

        {/* Footer buttons */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          {isLoggedInStudent && (
            <button
              onClick={onToggleFavorite}
              className={`px-4 py-2 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                isFavorited 
                  ? "bg-amber-50 border-amber-200 text-amber-600" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isFavorited ? "fill-amber-500" : ""}`} />
              <span>{isFavorited ? "Saved to Favorites" : "Save to Favorites"}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
}
