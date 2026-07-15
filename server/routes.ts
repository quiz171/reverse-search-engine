import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { dbQuery } from "./db.js";

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration for PDF files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export const router = Router();

// Extend session type for TS safety
declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      email: string;
      role: "student" | "admin";
      name: string;
    };
  }
}

// Authentication Middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }
  next();
}

// Common words to ignore in reverse search
const COMMON_WORDS = new Set([
  "the", "and", "of", "is", "a", "to", "in", "for", "on", "with", "at", "by", 
  "an", "this", "that", "i", "need", "help", "want", "understand", "show", 
  "me", "project", "projects", "tutorial", "tutorials", "course", "courses",
  "some", "any", "how", "why", "what", "where", "who", "which", "are", "was",
  "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "about", "please"
]);

// -------------------------------------------------------------------------
// AUTHENTICATION ROUTES
// -------------------------------------------------------------------------

// Student Registration
router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { email: rawEmail, password, name, department, level } = req.body;

    if (!rawEmail || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required." });
    }

    const email = rawEmail.toLowerCase().trim();

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    // Check unique email
    const existingUser = await dbQuery.get("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser) {
      return res.status(400).json({ error: "Email address is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users
    const { lastID: userId } = await dbQuery.run(
      "INSERT INTO users (email, password, role) VALUES (?, ?, 'student')",
      [email, hashedPassword]
    );

    // Insert into students
    await dbQuery.run(
      "INSERT INTO students (user_id, name, department, level) VALUES (?, ?, ?, ?)",
      [userId, name, department || "", level || ""]
    );

    // Auto-login after registration
    req.session.user = {
      id: userId,
      email,
      role: "student",
      name
    };

    res.status(201).json({ message: "Registration successful!", user: req.session.user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Server registration error" });
  }
});

// Login (handles both student and admin login)
router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email: rawEmail, password } = req.body;

    if (!rawEmail || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const email = rawEmail.toLowerCase().trim();

    const user = await dbQuery.get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    let name = "User";
    if (user.role === "admin") {
      const adminDetails = await dbQuery.get("SELECT name FROM admins WHERE user_id = ?", [user.id]);
      if (adminDetails) name = adminDetails.name;
    } else {
      const studentDetails = await dbQuery.get("SELECT name FROM students WHERE user_id = ?", [user.id]);
      if (studentDetails) name = studentDetails.name;
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name
    };

    res.json({ message: "Login successful!", user: req.session.user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Server login error" });
  }
});

// Logout
router.post("/auth/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout session." });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logout successful!" });
  });
});

// Get Current User
router.get("/auth/me", async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const { id, role } = req.session.user;
    if (role === "admin") {
      const details = await dbQuery.get(
        "SELECT u.id, u.email, u.role, a.name FROM users u JOIN admins a ON u.id = a.user_id WHERE u.id = ?",
        [id]
      );
      res.json({ user: details });
    } else {
      const details = await dbQuery.get(
        "SELECT u.id, u.email, u.role, s.name, s.department, s.level FROM users u JOIN students s ON u.id = s.user_id WHERE u.id = ?",
        [id]
      );
      res.json({ user: details });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Student Profile
router.put("/auth/profile", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, department, level } = req.body;
    const userId = req.session.user!.id;
    const userRole = req.session.user!.role;

    if (userRole !== "student") {
      return res.status(400).json({ error: "Only students can update profile parameters." });
    }

    if (!name) {
      return res.status(400).json({ error: "Name is required." });
    }

    await dbQuery.run(
      "UPDATE students SET name = ?, department = ?, level = ? WHERE user_id = ?",
      [name, department || "", level || "", userId]
    );

    req.session.user!.name = name;

    res.json({ message: "Profile updated successfully!", user: { id: userId, email: req.session.user!.email, role: "student", name, department, level } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// -------------------------------------------------------------------------
// CATEGORY ROUTES
// -------------------------------------------------------------------------

router.get("/categories", async (req, res) => {
  try {
    const categories = await dbQuery.all("SELECT * FROM categories ORDER BY name ASC");
    res.json({ categories });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// -------------------------------------------------------------------------
// RESOURCE ROUTES (Including Reverse Search Algorithm!)
// -------------------------------------------------------------------------

router.get("/resources", async (req: Request, res: Response) => {
  try {
    const { q, categoryId, department, level, courseCode, fileType } = req.query;

    // Fetch all resources with category details
    const resources = await dbQuery.all(`
      SELECT r.*, c.name as category_name,
        (SELECT GROUP_CONCAT(tag) FROM resource_tags WHERE resource_id = r.id) as tags_string
      FROM resources r
      JOIN categories c ON r.category_id = c.id
    `);

    // Parse tags_string into an array for each resource
    let processedResources = resources.map(r => ({
      ...r,
      tags: r.tags_string ? r.tags_string.split(",") : []
    }));

    // Filter resources
    if (categoryId) {
      processedResources = processedResources.filter(r => r.category_id.toString() === categoryId.toString());
    }
    if (department) {
      processedResources = processedResources.filter(r => r.department.toLowerCase() === (department as string).toLowerCase());
    }
    if (level) {
      processedResources = processedResources.filter(r => r.level.toLowerCase() === (level as string).toLowerCase());
    }
    if (courseCode) {
      processedResources = processedResources.filter(r => r.course_code.toLowerCase().includes((courseCode as string).toLowerCase()));
    }
    if (fileType) {
      processedResources = processedResources.filter(r => {
        if (fileType === "pdf") return !!r.file_path;
        if (fileType === "link") return !!r.external_link;
        return true;
      });
    }

    // Check if we need to do Reverse Search Relevance Match
    let results = [];
    const queryString = q ? (q as string).trim() : "";

    if (queryString) {
      // 1. Convert query to lowercase & remove punctuation
      const cleanQuery = queryString.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ");
      
      // 2. Split query into keywords
      const rawKeywords = cleanQuery.split(/\s+/);
      
      // 3. Filter out ignore-listed common words
      const keywords = rawKeywords.filter(kw => kw && !COMMON_WORDS.has(kw));

      // If no valid keywords left, default to rawKeywords (fallback to ensure we search something)
      const finalKeywords = keywords.length > 0 ? keywords : rawKeywords.filter(kw => kw);

      // 4. Calculate relevance scores
      const scoredResources = processedResources.map(r => {
        let score = 0;
        const title = r.title.toLowerCase();
        const desc = r.description.toLowerCase();
        const tags = r.tags.map((t: string) => t.toLowerCase());

        for (const kw of finalKeywords) {
          // Rule 1: title matches keyword (+5)
          if (title.includes(kw)) {
            score += 5;
          }
          // Rule 2: tag matches keyword (+3 per tag)
          tags.forEach(tag => {
            if (tag.includes(kw) || kw.includes(tag)) {
              score += 3;
            }
          });
          // Rule 3: description matches keyword (+2)
          if (desc.includes(kw)) {
            score += 2;
          }
        }

        return { ...r, relevance_score: score };
      });

      // 5. Filter out resources with 0 relevance score during direct searches
      results = scoredResources
        .filter(r => r.relevance_score > 0)
        .sort((a, b) => b.relevance_score - a.relevance_score);

      // Log to Search History if a student is logged in
      if (req.session.user && req.session.user.role === "student") {
        await dbQuery.run(
          "INSERT INTO search_history (student_id, search_text, results_count) VALUES (?, ?, ?)",
          [req.session.user.id, queryString, results.length]
        );
      }
    } else {
      // No search query, return list sorted by date added
      results = processedResources.sort((a, b) => b.id - a.id);
    }

    let aiFeedback: string | null = null;
    let aiResources: any[] = [];

    if (queryString && process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI, Type } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        console.log("Calling Gemini search grounding for topic:", queryString);
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: `Find real-world active online resources, reference sites, books, videos, or course materials on the internet for: "${queryString}". Provide personalized concept definitions, academic guidance, and tips. Recommend specific website links that students can click to read more about this.`,
          config: {
            systemInstruction: "You are an advanced academic advisor. Search the web using googleSearch to find highly helpful, valid educational resources, tutorials, and portals on the internet. In the studentFeedback, you MUST write an engaging response and include at least 2 or 3 direct markdown links to reliable websites (e.g. [Wikipedia](https://...) or [MIT OCW](https://...)) so the student can click on them directly.",
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                studentFeedback: {
                  type: Type.STRING,
                  description: "Personalized study guide, concept definition, tips and academic advice for the student based on their query. You MUST explicitly embed 2-3 real, active markdown hyperlinked website URLs (such as [MDN Web Docs](https://developer.mozilla.org) or [Wikipedia](https://wikipedia.org)) inside this feedback so the student can click them directly."
                },
                onlineResources: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: "Detailed title of the online tutorial, book, lecture notes, or project." },
                      description: { type: Type.STRING, description: "Brief description of what this resource covers and why it is useful." },
                      category_name: { type: Type.STRING, description: "Resource type: 'Lecture Notes', 'Programming Tutorials', 'Video Tutorials', 'Books', 'Research Papers', or 'Programming Tutorials'" },
                      external_link: { type: Type.STRING, description: "A valid, active HTTPS URL on the internet (e.g. Wikipedia, GeeksforGeeks, Coursera, MIT OCW, GitHub, standard tech docs)." },
                      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                      department: { type: Type.STRING, description: "Relevant department, e.g. Computer Science, Mathematics, Engineering" },
                      level: { type: Type.STRING, description: "Suggested level, e.g. 100 Level, 200 Level, 300 Level, 400 Level" },
                      course_code: { type: Type.STRING, description: "Suggested code or ONLINE" }
                    },
                    required: ["title", "description", "category_name", "external_link", "tags", "department", "level", "course_code"]
                  }
                }
              },
              required: ["studentFeedback", "onlineResources"]
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          aiFeedback = parsed.studentFeedback || null;
          if (Array.isArray(parsed.onlineResources)) {
            aiResources = parsed.onlineResources.map((or: any, index: number) => ({
              id: 20000 + index,
              title: or.title,
              description: or.description,
              category_id: 999,
              category_name: or.category_name || "Online Material",
              department: or.department || "General",
              level: or.level || "Any",
              course_code: or.course_code || "ONLINE",
              file_path: null,
              external_link: or.external_link,
              created_at: new Date().toISOString(),
              tags: or.tags || [],
              isOnline: true,
              relevance_score: 10
            }));
          }
        }
      } catch (err) {
        console.error("Gemini search grounding failed, trying fallback:", err);
        try {
          const { GoogleGenAI, Type } = await import("@google/genai");
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });
          const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: `The student is searching for "${queryString}". Provide educational guidance feedback, recommend specific website links (e.g. Wikipedia, MDN, YouTube) inside the feedback, and curate 3 helpful online tutorial/reference URLs.`,
            config: {
              systemInstruction: "You are an advanced academic advisor. Search your knowledge base and provide direct study advice. In studentFeedback, you MUST include 2-3 direct markdown links to reliable websites so the student can click on them directly.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  studentFeedback: { 
                    type: Type.STRING,
                    description: "Engaging feedback with 2-3 direct markdown website links embedded."
                  },
                  onlineResources: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        category_name: { type: Type.STRING },
                        external_link: { type: Type.STRING },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        department: { type: Type.STRING },
                        level: { type: Type.STRING },
                        course_code: { type: Type.STRING }
                      },
                      required: ["title", "description", "category_name", "external_link", "tags", "department", "level", "course_code"]
                    }
                  }
                },
                required: ["studentFeedback", "onlineResources"]
              }
            }
          });
          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            aiFeedback = parsed.studentFeedback || null;
            if (Array.isArray(parsed.onlineResources)) {
              aiResources = parsed.onlineResources.map((or: any, index: number) => ({
                id: 20000 + index,
                title: or.title,
                description: or.description,
                category_id: 999,
                category_name: or.category_name || "Online Material",
                department: or.department || "General",
                level: or.level || "Any",
                course_code: or.course_code || "ONLINE",
                file_path: null,
                external_link: or.external_link,
                created_at: new Date().toISOString(),
                tags: or.tags || [],
                isOnline: true,
                relevance_score: 9
              }));
            }
          }
        } catch (fallbackErr) {
          console.error("Gemini standard fallback search failed too:", fallbackErr);
        }
      }
    } else if (queryString) {
      // Robust simulated fallback when GEMINI_API_KEY is not defined
      console.log("GEMINI_API_KEY is not set. Using rule-based fallback academic advisor guidance.");
      aiFeedback = `Hello! I am your AI-Assisted Academic Advisor. 

To experience live, real-time internet-grounded concept search and curated online resources, please ensure that your Google Gemini API Key is configured in Settings > Secrets. 

In the meantime, I've analyzed your search for "${queryString}":
- **Key Concepts Detected**: ${queryString.split(" ").filter(w => w.length > 3).slice(0, 4).join(", ") || queryString}.
- **Study Guide**: Try focusing on the core principles of this topic. Look up standard reference textbooks, search for academic open-course portals like [MIT OpenCourseWare](https://ocw.mit.edu/search/?q=${encodeURIComponent(queryString)}), or check interactive tech documentation (such as [MDN Web Docs](https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(queryString)}) for web tech, or [Wikipedia Reference](https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(queryString)})).
- **Video Tutorials**: For step-by-step visual learning, search for [YouTube Tutorials on ${queryString}](https://www.youtube.com/results?search_query=${encodeURIComponent(queryString)}).
- **Curriculum Match**: If there are local curriculum files listed on the left, we recommend starting with those as they align directly with your school syllabus.

Stay curious and keep learning!`;

      // Generate 3 helpful mock-online materials matching keywords
      aiResources = [
        {
          id: 20001,
          title: `Online Reference Guide for ${queryString}`,
          description: `A highly curated reference page and cheat sheet explaining key concepts, implementation guides, and study examples for "${queryString}".`,
          category_id: 999,
          category_name: "Web Reference",
          department: "General Science",
          level: "Any Level",
          course_code: "ONLINE",
          file_path: null,
          external_link: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(queryString)}`,
          created_at: new Date().toISOString(),
          tags: ["study-guide", "reference", queryString.toLowerCase().split(" ")[0]],
          isOnline: true,
          relevance_score: 10
        },
        {
          id: 20002,
          title: `MIT OpenCourseWare Search on ${queryString}`,
          description: `Browse lectures, assignments, and exams on MIT OCW related to learning and mastering "${queryString}".`,
          category_id: 999,
          category_name: "Lecture Notes",
          department: "Higher Education",
          level: "Postgraduate",
          course_code: "MIT-OCW",
          file_path: null,
          external_link: `https://ocw.mit.edu/search/?q=${encodeURIComponent(queryString)}`,
          created_at: new Date().toISOString(),
          tags: ["lecture", "open-source", "mit"],
          isOnline: true,
          relevance_score: 9
        },
        {
          id: 20003,
          title: `YouTube Educational Videos on ${queryString}`,
          description: `Visual walkthroughs, concept lectures, and programming tutorials for university students learning "${queryString}".`,
          category_id: 999,
          category_name: "Video Tutorials",
          department: "Multimedia Study",
          level: "Any Level",
          course_code: "ONLINE",
          file_path: null,
          external_link: `https://www.youtube.com/results?search_query=${encodeURIComponent(queryString)}`,
          created_at: new Date().toISOString(),
          tags: ["video", "tutorial", "visualization"],
          isOnline: true,
          relevance_score: 8
        }
      ];
    }

    res.json({ resources: results, aiFeedback, aiResources });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Single Resource details
router.get("/resources/:id", async (req: Request, res: Response) => {
  try {
    const resourceId = parseInt(req.params.id);
    const resource = await dbQuery.get(`
      SELECT r.*, c.name as category_name
      FROM resources r
      JOIN categories c ON r.category_id = c.id
      WHERE r.id = ?
    `, [resourceId]);

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    const tags = await dbQuery.all("SELECT tag FROM resource_tags WHERE resource_id = ?", [resourceId]);
    resource.tags = tags.map(t => t.tag);

    // Is favorited if user is student
    let isFavorite = false;
    if (req.session.user && req.session.user.role === "student") {
      const fav = await dbQuery.get("SELECT 1 FROM favorites WHERE student_id = ? AND resource_id = ?", [req.session.user.id, resourceId]);
      isFavorite = !!fav;
    }
    resource.isFavorite = isFavorite;

    res.json({ resource });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// -------------------------------------------------------------------------
// STUDENT FAVORITES & HISTORY
// -------------------------------------------------------------------------

// List Favorites
router.get("/student/favorites", requireAuth, async (req: Request, res: Response) => {
  try {
    const studentId = req.session.user!.id;
    const favorites = await dbQuery.all(`
      SELECT r.*, c.name as category_name
      FROM favorites f
      JOIN resources r ON f.resource_id = r.id
      JOIN categories c ON r.category_id = c.id
      WHERE f.student_id = ?
    `, [studentId]);

    // Fetch tags for each favorited resource
    const processedFavorites = [];
    for (const fav of favorites) {
      const tags = await dbQuery.all("SELECT tag FROM resource_tags WHERE resource_id = ?", [fav.id]);
      processedFavorites.push({
        ...fav,
        tags: tags.map(t => t.tag)
      });
    }

    res.json({ favorites: processedFavorites });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Favorite
router.post("/student/favorites/:resourceId", requireAuth, async (req: Request, res: Response) => {
  try {
    const studentId = req.session.user!.id;
    const resourceId = parseInt(req.params.resourceId);

    // Check if resource exists
    const resource = await dbQuery.get("SELECT id FROM resources WHERE id = ?", [resourceId]);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    await dbQuery.run("INSERT OR IGNORE INTO favorites (student_id, resource_id) VALUES (?, ?)", [studentId, resourceId]);
    res.json({ message: "Resource added to favorites!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Remove Favorite
router.delete("/student/favorites/:resourceId", requireAuth, async (req: Request, res: Response) => {
  try {
    const studentId = req.session.user!.id;
    const resourceId = parseInt(req.params.resourceId);

    await dbQuery.run("DELETE FROM favorites WHERE student_id = ? AND resource_id = ?", [studentId, resourceId]);
    res.json({ message: "Resource removed from favorites!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Search History
router.get("/student/search-history", requireAuth, async (req: Request, res: Response) => {
  try {
    const studentId = req.session.user!.id;
    const history = await dbQuery.all("SELECT * FROM search_history WHERE student_id = ? ORDER BY search_date DESC", [studentId]);
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// -------------------------------------------------------------------------
// ADMINISTRATOR OPERATIONS (CRUD, Categories, Students, Stats)
// -------------------------------------------------------------------------

// Add Category (Admin only)
router.post("/admin/categories", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Category name is required" });
    }

    const trimmed = name.trim();
    const existing = await dbQuery.get("SELECT id FROM categories WHERE name = ?", [trimmed]);
    if (existing) {
      return res.status(400).json({ error: "Category already exists." });
    }

    const { lastID } = await dbQuery.run("INSERT INTO categories (name) VALUES (?)", [trimmed]);
    res.status(201).json({ message: "Category created successfully", category: { id: lastID, name: trimmed } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Category (Admin only)
router.delete("/admin/categories/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const catId = parseInt(req.params.id);

    // Check if category has resources
    const hasResources = await dbQuery.get("SELECT 1 FROM resources WHERE category_id = ?", [catId]);
    if (hasResources) {
      return res.status(400).json({ error: "Cannot delete category because it contains active resources." });
    }

    await dbQuery.run("DELETE FROM categories WHERE id = ?", [catId]);
    res.json({ message: "Category deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Resource (Admin only) - supports file upload
router.post("/admin/resources", requireAdmin, upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { title, description, category_id, department, level, course_code, external_link, tags } = req.body;

    if (!title || !description || !category_id || !department || !level || !course_code) {
      return res.status(400).json({ error: "Please provide all required fields." });
    }

    // Validate category existence
    const cat = await dbQuery.get("SELECT id FROM categories WHERE id = ?", [parseInt(category_id)]);
    if (!cat) {
      return res.status(400).json({ error: "Invalid category ID specified." });
    }

    // Check duplicates
    const duplicate = await dbQuery.get(
      "SELECT id FROM resources WHERE title = ? AND category_id = ? AND course_code = ?",
      [title, parseInt(category_id), course_code]
    );
    if (duplicate) {
      return res.status(400).json({ error: "A matching resource with this title and course code already exists in this category." });
    }

    // Retrieve file path
    const file_path = req.file ? `/uploads/${req.file.filename}` : null;

    // Insert resource
    const { lastID: resId } = await dbQuery.run(
      `INSERT INTO resources (title, description, category_id, department, level, course_code, file_path, external_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, parseInt(category_id), department, level, course_code, file_path, external_link || null]
    );

    // Insert tags
    let tagsArray: string[] = [];
    if (tags) {
      if (typeof tags === "string") {
        tagsArray = tags.split(",").map(t => t.trim()).filter(t => t);
      } else if (Array.isArray(tags)) {
        tagsArray = tags.map(t => t.trim()).filter(t => t);
      }
    }

    for (const tag of tagsArray) {
      await dbQuery.run("INSERT OR IGNORE INTO resource_tags (resource_id, tag) VALUES (?, ?)", [resId, tag]);
    }

    res.status(201).json({ message: "Resource created successfully!", resourceId: resId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Resource (Admin only)
router.put("/admin/resources/:id", requireAdmin, upload.single("file"), async (req: Request, res: Response) => {
  try {
    const resourceId = parseInt(req.params.id);
    const { title, description, category_id, department, level, course_code, external_link, tags } = req.body;

    const existing = await dbQuery.get("SELECT * FROM resources WHERE id = ?", [resourceId]);
    if (!existing) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (!title || !description || !category_id || !department || !level || !course_code) {
      return res.status(400).json({ error: "All fields are required" });
    }

    let file_path = existing.file_path;
    if (req.file) {
      // Delete old file if exists
      if (existing.file_path) {
        const oldPath = path.join(process.cwd(), existing.file_path);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      file_path = `/uploads/${req.file.filename}`;
    }

    // Update main fields
    await dbQuery.run(
      `UPDATE resources
       SET title = ?, description = ?, category_id = ?, department = ?, level = ?, course_code = ?, file_path = ?, external_link = ?
       WHERE id = ?`,
      [title, description, parseInt(category_id), department, level, course_code, file_path, external_link || null, resourceId]
    );

    // Sync tags
    await dbQuery.run("DELETE FROM resource_tags WHERE resource_id = ?", [resourceId]);

    let tagsArray: string[] = [];
    if (tags) {
      if (typeof tags === "string") {
        tagsArray = tags.split(",").map(t => t.trim()).filter(t => t);
      } else if (Array.isArray(tags)) {
        tagsArray = tags.map(t => t.trim()).filter(t => t);
      }
    }

    for (const tag of tagsArray) {
      await dbQuery.run("INSERT OR IGNORE INTO resource_tags (resource_id, tag) VALUES (?, ?)", [resourceId, tag]);
    }

    res.json({ message: "Resource updated successfully!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Resource (Admin only)
router.delete("/admin/resources/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const resourceId = parseInt(req.params.id);
    const existing = await dbQuery.get("SELECT * FROM resources WHERE id = ?", [resourceId]);
    if (!existing) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Delete associated physical file if exists
    if (existing.file_path) {
      const filePath = path.join(process.cwd(), existing.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from DB (FK cascaded deletes tags & favorites)
    await dbQuery.run("DELETE FROM resources WHERE id = ?", [resourceId]);
    res.json({ message: "Resource deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List Registered Students
router.get("/admin/students", requireAdmin, async (req: Request, res: Response) => {
  try {
    const students = await dbQuery.all(`
      SELECT u.id, u.email, u.created_at, s.name, s.department, s.level,
        (SELECT COUNT(*) FROM favorites WHERE student_id = u.id) as favorites_count,
        (SELECT COUNT(*) FROM search_history WHERE student_id = u.id) as searches_count
      FROM users u
      JOIN students s ON u.id = s.user_id
      ORDER BY s.name ASC
    `);
    res.json({ students });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard Statistics (Admin Dashboard)
router.get("/admin/stats", requireAdmin, async (req: Request, res: Response) => {
  try {
    // 1. Total counts
    const totalStudents = await dbQuery.get<{ count: number }>("SELECT COUNT(*) as count FROM students");
    const totalResources = await dbQuery.get<{ count: number }>("SELECT COUNT(*) as count FROM resources");
    const totalCategories = await dbQuery.get<{ count: number }>("SELECT COUNT(*) as count FROM categories");
    const totalSearches = await dbQuery.get<{ count: number }>("SELECT COUNT(*) as count FROM search_history");

    // 2. Most Searched Topics (queries grouped, cleaned)
    const mostSearchedRaw = await dbQuery.all(`
      SELECT LOWER(TRIM(search_text)) as topic, COUNT(*) as count
      FROM search_history
      GROUP BY topic
      ORDER BY count DESC
      LIMIT 5
    `);

    // 3. Most Saved Resources
    const mostSavedResources = await dbQuery.all(`
      SELECT r.id, r.title, r.course_code, COUNT(f.student_id) as saves_count
      FROM resources r
      JOIN favorites f ON r.id = f.resource_id
      GROUP BY r.id
      ORDER BY saves_count DESC
      LIMIT 5
    `);

    // 4. Distribution of Resources by Category
    const categoryDistribution = await dbQuery.all(`
      SELECT c.name as category_name, COUNT(r.id) as resource_count
      FROM categories c
      LEFT JOIN resources r ON c.id = r.category_id
      GROUP BY c.id
      ORDER BY resource_count DESC
    `);

    res.json({
      stats: {
        totalStudents: totalStudents?.count || 0,
        totalResources: totalResources?.count || 0,
        totalCategories: totalCategories?.count || 0,
        totalSearches: totalSearches?.count || 0,
        mostSearched: mostSearchedRaw,
        mostSaved: mostSavedResources,
        categoryDistribution
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
