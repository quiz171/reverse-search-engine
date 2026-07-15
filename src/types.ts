export interface User {
  id: number;
  email: string;
  role: "student" | "admin";
  name: string;
  department?: string;
  level?: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Resource {
  id: number;
  title: string;
  description: string;
  category_id: number;
  category_name: string;
  department: string;
  level: string;
  course_code: string;
  file_path: string | null;
  external_link: string | null;
  created_at: string;
  tags: string[];
  relevance_score?: number;
  isFavorite?: boolean;
  isOnline?: boolean;
}

export interface SearchHistory {
  id: number;
  student_id: number;
  search_text: string;
  search_date: string;
  results_count: number;
}

export interface StudentDetail {
  id: number;
  name: string;
  email: string;
  department: string;
  level: string;
  created_at: string;
  favorites_count: number;
  searches_count: number;
}

export interface Stats {
  totalStudents: number;
  totalResources: number;
  totalCategories: number;
  totalSearches: number;
  mostSearched: Array<{ topic: string; count: number }>;
  mostSaved: Array<{ id: number; title: string; course_code: string; saves_count: number }>;
  categoryDistribution: Array<{ category_name: string; resource_count: number }>;
}
