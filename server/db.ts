import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const dbPath = path.resolve(process.cwd(), "reverse_search_db.json");

interface DbData {
  users: any[];
  students: any[];
  admins: any[];
  categories: any[];
  resources: any[];
  resource_tags: any[];
  favorites: any[];
  search_history: any[];
}

let data: DbData = {
  users: [],
  students: [],
  admins: [],
  categories: [],
  resources: [],
  resource_tags: [],
  favorites: [],
  search_history: []
};

// Helper to save current state to file
async function saveDb() {
  try {
    await fs.promises.writeFile(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to JSON DB file:", err);
  }
}

// Helper to load state from file
async function loadDb() {
  try {
    if (fs.existsSync(dbPath)) {
      const content = await fs.promises.readFile(dbPath, "utf-8");
      data = JSON.parse(content);
    }
  } catch (err) {
    console.error("Failed to read JSON DB file, starting fresh:", err);
  }
}

function getNextId(arr: any[]): number {
  if (arr.length === 0) return 1;
  const ids = arr.map(item => item.id || item.user_id || 0);
  return Math.max(...ids) + 1;
}

export const dbQuery = {
  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    const cleanSql = sql.trim().replace(/\s+/g, " ");
    
    // 1. Ignore setup queries
    if (cleanSql.startsWith("CREATE TABLE") || cleanSql.startsWith("CREATE INDEX") || cleanSql.startsWith("PRAGMA")) {
      return { lastID: 0, changes: 0 };
    }

    // 2. INSERT INTO users
    if (cleanSql.includes("INSERT INTO users")) {
      const email = params[0];
      const password = params[1];
      const role = params[2] || "student";
      const nextId = getNextId(data.users);
      data.users.push({
        id: nextId,
        email,
        password,
        role,
        created_at: new Date().toISOString()
      });
      await saveDb();
      return { lastID: nextId, changes: 1 };
    }

    // 3. INSERT INTO students
    if (cleanSql.includes("INSERT INTO students")) {
      const [userId, name, department, level] = params;
      data.students.push({
        user_id: userId,
        name,
        department: department || "",
        level: level || ""
      });
      await saveDb();
      return { lastID: userId, changes: 1 };
    }

    // 4. INSERT INTO admins
    if (cleanSql.includes("INSERT INTO admins")) {
      const [userId, name] = params;
      data.admins.push({
        user_id: userId,
        name
      });
      await saveDb();
      return { lastID: userId, changes: 1 };
    }

    // 5. INSERT OR IGNORE INTO categories or INSERT INTO categories
    if (cleanSql.includes("INSERT OR IGNORE INTO categories") || cleanSql.includes("INSERT INTO categories")) {
      const name = params[0];
      const existing = data.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        return { lastID: existing.id, changes: 0 };
      }
      const nextId = getNextId(data.categories);
      data.categories.push({ id: nextId, name });
      await saveDb();
      return { lastID: nextId, changes: 1 };
    }

    // 6. INSERT INTO resources
    if (cleanSql.includes("INSERT INTO resources")) {
      let nextId = getNextId(data.resources);
      if (params.length === 7) {
        const [title, description, category_id, department, level, course_code, external_link] = params;
        data.resources.push({
          id: nextId,
          title,
          description,
          category_id: parseInt(category_id),
          department,
          level,
          course_code,
          file_path: null,
          external_link,
          created_at: new Date().toISOString()
        });
      } else {
        const [title, description, category_id, department, level, course_code, file_path, external_link] = params;
        data.resources.push({
          id: nextId,
          title,
          description,
          category_id: parseInt(category_id),
          department,
          level,
          course_code,
          file_path,
          external_link,
          created_at: new Date().toISOString()
        });
      }
      await saveDb();
      return { lastID: nextId, changes: 1 };
    }

    // 7. INSERT OR IGNORE INTO resource_tags
    if (cleanSql.includes("INSERT OR IGNORE INTO resource_tags")) {
      const [resource_id, tag] = params;
      const exists = data.resource_tags.some(rt => rt.resource_id === resource_id && rt.tag.toLowerCase() === tag.toLowerCase());
      if (!exists) {
        const nextId = getNextId(data.resource_tags);
        data.resource_tags.push({ id: nextId, resource_id, tag });
        await saveDb();
        return { lastID: nextId, changes: 1 };
      }
      return { lastID: 0, changes: 0 };
    }

    // 8. UPDATE students
    if (cleanSql.includes("UPDATE students SET")) {
      const [name, department, level, userId] = params;
      const student = data.students.find(s => s.user_id === userId);
      if (student) {
        student.name = name;
        student.department = department || "";
        student.level = level || "";
        await saveDb();
        return { lastID: userId, changes: 1 };
      }
      return { lastID: 0, changes: 0 };
    }

    // 9. INSERT OR IGNORE INTO favorites
    if (cleanSql.includes("INSERT OR IGNORE INTO favorites")) {
      const [studentId, resourceId] = params;
      const exists = data.favorites.some(f => f.student_id === studentId && f.resource_id === resourceId);
      if (!exists) {
        data.favorites.push({ student_id: studentId, resource_id: resourceId });
        await saveDb();
        return { lastID: 0, changes: 1 };
      }
      return { lastID: 0, changes: 0 };
    }

    // 10. DELETE FROM favorites
    if (cleanSql.includes("DELETE FROM favorites WHERE")) {
      const [studentId, resourceId] = params;
      const initialLength = data.favorites.length;
      data.favorites = data.favorites.filter(f => !(f.student_id === studentId && f.resource_id === resourceId));
      await saveDb();
      return { lastID: 0, changes: initialLength - data.favorites.length };
    }

    // 11. INSERT INTO search_history
    if (cleanSql.includes("INSERT INTO search_history")) {
      const [studentId, search_text, results_count] = params;
      const nextId = getNextId(data.search_history);
      data.search_history.push({
        id: nextId,
        student_id: studentId,
        search_text,
        results_count,
        search_date: new Date().toISOString()
      });
      await saveDb();
      return { lastID: nextId, changes: 1 };
    }

    // 12. DELETE FROM categories WHERE id = ?
    if (cleanSql.includes("DELETE FROM categories WHERE id =")) {
      const id = parseInt(params[0]);
      data.categories = data.categories.filter(c => c.id !== id);
      await saveDb();
      return { lastID: 0, changes: 1 };
    }

    // 13. UPDATE resources
    if (cleanSql.includes("UPDATE resources SET")) {
      const [title, description, category_id, department, level, course_code, file_path, external_link, id] = params;
      const r = data.resources.find(res => res.id === parseInt(id));
      if (r) {
        r.title = title;
        r.description = description;
        r.category_id = parseInt(category_id);
        r.department = department;
        r.level = level;
        r.course_code = course_code;
        r.file_path = file_path;
        r.external_link = external_link;
        await saveDb();
        return { lastID: parseInt(id), changes: 1 };
      }
      return { lastID: 0, changes: 0 };
    }

    // 14. DELETE FROM resource_tags WHERE resource_id = ?
    if (cleanSql.includes("DELETE FROM resource_tags WHERE resource_id =")) {
      const id = parseInt(params[0]);
      data.resource_tags = data.resource_tags.filter(rt => rt.resource_id !== id);
      await saveDb();
      return { lastID: 0, changes: 1 };
    }

    // 15. DELETE FROM resources WHERE id = ?
    if (cleanSql.includes("DELETE FROM resources WHERE id =")) {
      const id = parseInt(params[0]);
      data.resources = data.resources.filter(r => r.id !== id);
      data.resource_tags = data.resource_tags.filter(rt => rt.resource_id !== id);
      data.favorites = data.favorites.filter(f => f.resource_id !== id);
      await saveDb();
      return { lastID: 0, changes: 1 };
    }

    console.warn("Unhandled run SQL pattern:", cleanSql, params);
    return { lastID: 0, changes: 0 };
  },

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const cleanSql = sql.trim().replace(/\s+/g, " ");

    // 1. SELECT id FROM users WHERE email = ?
    if (cleanSql.includes("SELECT id FROM users WHERE email =")) {
      const email = params[0]?.toLowerCase().trim();
      const user = data.users.find(u => u.email.toLowerCase().trim() === email);
      return (user ? { id: user.id } : undefined) as any;
    }

    // 2. SELECT * FROM users WHERE email = ?
    if (cleanSql.includes("SELECT * FROM users WHERE email =")) {
      const email = params[0]?.toLowerCase().trim();
      return data.users.find(u => u.email.toLowerCase().trim() === email) as any;
    }

    // 3. SELECT COUNT(*) as count FROM categories
    if (cleanSql.includes("SELECT COUNT(*) as count FROM categories")) {
      return { count: data.categories.length } as any;
    }

    // 4. SELECT COUNT(*) as count FROM resources
    if (cleanSql.includes("SELECT COUNT(*) as count FROM resources")) {
      return { count: data.resources.length } as any;
    }

    // 5. SELECT name FROM admins WHERE user_id = ?
    if (cleanSql.includes("SELECT name FROM admins WHERE user_id =")) {
      const userId = params[0];
      const admin = data.admins.find(a => a.user_id === userId);
      return (admin ? { name: admin.name } : undefined) as any;
    }

    // 6. SELECT name FROM students WHERE user_id = ?
    if (cleanSql.includes("SELECT name FROM students WHERE user_id =")) {
      const userId = params[0];
      const student = data.students.find(s => s.user_id === userId);
      return (student ? { name: student.name } : undefined) as any;
    }

    // 7. SELECT u.id, u.email, u.role, a.name FROM users u JOIN admins a WHERE u.id = ?
    if (cleanSql.includes("SELECT u.id, u.email, u.role, a.name FROM users u")) {
      const id = params[0];
      const user = data.users.find(u => u.id === id);
      const admin = data.admins.find(a => a.user_id === id);
      if (user && admin) {
        return { id: user.id, email: user.email, role: user.role, name: admin.name } as any;
      }
      return undefined;
    }

    // 8. SELECT u.id, u.email, u.role, s.name, s.department, s.level FROM users u JOIN students s WHERE u.id = ?
    if (cleanSql.includes("SELECT u.id, u.email, u.role, s.name, s.department, s.level FROM users u")) {
      const id = params[0];
      const user = data.users.find(u => u.id === id);
      const student = data.students.find(s => s.user_id === id);
      if (user && student) {
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          name: student.name,
          department: student.department,
          level: student.level
        } as any;
      }
      return undefined;
    }

    // 9. SELECT r.*, c.name as category_name FROM resources r JOIN categories c WHERE r.id = ?
    if (cleanSql.includes("resources r JOIN categories c") && cleanSql.includes("WHERE r.id =")) {
      const resourceId = parseInt(params[0]);
      const r = data.resources.find(res => res.id === resourceId);
      if (r) {
        const cat = data.categories.find(c => c.id === r.category_id);
        return {
          ...r,
          category_name: cat ? cat.name : "Uncategorized"
        } as any;
      }
      return undefined;
    }

    // 10. SELECT 1 FROM favorites WHERE student_id = ? AND resource_id = ?
    if (cleanSql.includes("SELECT 1 FROM favorites WHERE student_id =")) {
      const [studentId, resourceId] = params;
      const fav = data.favorites.find(f => f.student_id === studentId && f.resource_id === resourceId);
      return (fav ? { 1: 1 } : undefined) as any;
    }

    // 11. SELECT id FROM categories WHERE name = ?
    if (cleanSql.includes("SELECT id FROM categories WHERE name =")) {
      const name = params[0];
      const cat = data.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
      return (cat ? { id: cat.id } : undefined) as any;
    }

    // 12. SELECT 1 FROM resources WHERE category_id = ?
    if (cleanSql.includes("SELECT 1 FROM resources WHERE category_id =")) {
      const catId = parseInt(params[0]);
      const exists = data.resources.some(r => r.category_id === catId);
      return (exists ? { 1: 1 } : undefined) as any;
    }

    // 13. SELECT id FROM resources WHERE title = ? AND category_id = ? AND course_code = ?
    if (cleanSql.includes("SELECT id FROM resources WHERE title =")) {
      const [title, category_id, course_code] = params;
      const r = data.resources.find(res => res.title === title && res.category_id === parseInt(category_id) && res.course_code === course_code);
      return (r ? { id: r.id } : undefined) as any;
    }

    // 14. SELECT * FROM resources WHERE id = ?
    if (cleanSql.includes("SELECT * FROM resources WHERE id =")) {
      const id = parseInt(params[0]);
      return data.resources.find(r => r.id === id) as any;
    }

    // 15. SELECT COUNT(*) as count FROM students
    if (cleanSql.includes("SELECT COUNT(*) as count FROM students")) {
      return { count: data.students.length } as any;
    }

    // 16. SELECT COUNT(*) as count FROM search_history
    if (cleanSql.includes("SELECT COUNT(*) as count FROM search_history")) {
      return { count: data.search_history.length } as any;
    }

    console.warn("Unhandled get SQL pattern:", cleanSql, params);
    return undefined;
  },

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const cleanSql = sql.trim().replace(/\s+/g, " ");

    // 1. SELECT * FROM categories ORDER BY name ASC
    if (cleanSql.includes("SELECT * FROM categories")) {
      return [...data.categories].sort((a, b) => a.name.localeCompare(b.name)) as any[];
    }

    // 2. Resource complete details list (with tags string)
    if (cleanSql.includes("tags_string") && cleanSql.includes("resources r JOIN categories c")) {
      return data.resources.map(r => {
        const cat = data.categories.find(c => c.id === r.category_id);
        const tags = data.resource_tags.filter(rt => rt.resource_id === r.id).map(rt => rt.tag);
        return {
          ...r,
          category_name: cat ? cat.name : "Uncategorized",
          tags_string: tags.join(",")
        };
      }) as any[];
    }

    // 3. SELECT tag FROM resource_tags WHERE resource_id = ?
    if (cleanSql.includes("SELECT tag FROM resource_tags WHERE resource_id =")) {
      const resourceId = parseInt(params[0]);
      return data.resource_tags.filter(rt => rt.resource_id === resourceId).map(rt => ({ tag: rt.tag })) as any[];
    }

    // 4. Favorites joined with categories and tags
    if (cleanSql.includes("FROM favorites f JOIN resources r")) {
      const studentId = params[0];
      const favs = data.favorites.filter(f => f.student_id === studentId);
      const results = [];
      for (const f of favs) {
        const r = data.resources.find(res => res.id === f.resource_id);
        if (r) {
          const cat = data.categories.find(c => c.id === r.category_id);
          results.push({
            ...r,
            category_name: cat ? cat.name : "Uncategorized"
          });
        }
      }
      return results as any[];
    }

    // 5. SELECT * FROM search_history WHERE student_id = ? ORDER BY search_date DESC
    if (cleanSql.includes("SELECT * FROM search_history WHERE student_id =")) {
      const studentId = params[0];
      return [...data.search_history]
        .filter(sh => sh.student_id === studentId)
        .sort((a, b) => b.search_date.localeCompare(a.search_date)) as any[];
    }

    // 6. Registered Students with lists
    if (cleanSql.includes("searches_count") && cleanSql.includes("JOIN students s")) {
      const results = data.students.map(s => {
        const user = data.users.find(u => u.id === s.user_id);
        const favorites_count = data.favorites.filter(f => f.student_id === s.user_id).length;
        const searches_count = data.search_history.filter(sh => sh.student_id === s.user_id).length;
        return {
          id: s.user_id,
          email: user ? user.email : "",
          created_at: user ? user.created_at : "",
          name: s.name,
          department: s.department,
          level: s.level,
          favorites_count,
          searches_count
        };
      });
      return results.sort((a, b) => a.name.localeCompare(b.name)) as any[];
    }

    // 7. Stats: mostSearched
    if (cleanSql.includes("GROUP BY topic") || cleanSql.includes("search_history GROUP BY")) {
      const counts: Record<string, number> = {};
      for (const sh of data.search_history) {
        const topic = sh.search_text.trim().toLowerCase();
        counts[topic] = (counts[topic] || 0) + 1;
      }
      const list = Object.entries(counts).map(([topic, count]) => ({ topic, count }));
      return list.sort((a, b) => b.count - a.count).slice(0, 5) as any[];
    }

    // 8. Stats: mostSaved
    if (cleanSql.includes("COUNT(f.student_id) as saves_count")) {
      const counts: Record<number, number> = {};
      for (const f of data.favorites) {
        counts[f.resource_id] = (counts[f.resource_id] || 0) + 1;
      }
      const list = Object.entries(counts).map(([idStr, count]) => {
        const id = parseInt(idStr);
        const r = data.resources.find(res => res.id === id);
        return {
          id,
          title: r ? r.title : "Unknown",
          course_code: r ? r.course_code : "N/A",
          saves_count: count
        };
      });
      return list.sort((a, b) => b.saves_count - a.saves_count).slice(0, 5) as any[];
    }

    // 9. Stats: categoryDistribution
    if (cleanSql.includes("resource_count")) {
      const results = data.categories.map(c => {
        const resource_count = data.resources.filter(r => r.category_id === c.id).length;
        return {
          category_name: c.name,
          resource_count
        };
      });
      return results.sort((a, b) => b.resource_count - a.resource_count) as any[];
    }

    console.warn("Unhandled all SQL pattern:", cleanSql, params);
    return [];
  }
};

export async function initDatabase() {
  console.log("Initializing pure-JS JSON database...");
  await loadDb();
  console.log(`Loaded data: ${data.users.length} users, ${data.students.length} students, ${data.resources.length} resources`);

  // Seed default admin if not exists
  const defaultAdminEmail = process.env.ADMIN_EMAIL || "admin@yourdomain.edu";
  const existingAdmin = data.users.find(u => u.email.toLowerCase().trim() === defaultAdminEmail.toLowerCase().trim());
  if (!existingAdmin) {
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
    if (adminPassword) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const userId = getNextId(data.users);
      data.users.push({
        id: userId,
        email: defaultAdminEmail,
        password: hashedPassword,
        role: "admin",
        created_at: new Date().toISOString()
      });
      data.admins.push({
        user_id: userId,
        name: "Super Administrator"
      });
      await saveDb();
      console.log("Seeded default admin account");
    } else {
      console.log("No ADMIN_INITIAL_PASSWORD set — default admin not created.");
    }
  }

  // Demo student seeding removed for production

  // Seed default categories if empty
  if (data.categories.length === 0) {
    const defaultCategories = [
      "Lecture Notes",
      "Books",
      "Past Questions",
      "Final Year Projects",
      "Video Tutorials",
      "Research Papers",
      "Programming Tutorials"
    ];
    for (const name of defaultCategories) {
      data.categories.push({
        id: getNextId(data.categories),
        name
      });
    }
    console.log("Seeded default categories");
  }

  // Seed default resources if empty
  if (data.resources.length === 0) {
    const seedResources = [
      {
        title: "Introduction to Stacks, Queues and Lists",
        category: "Lecture Notes",
        department: "Computer Science",
        level: "200 Level",
        course_code: "CSC201",
        description: "A comprehensive set of notes covering linear data structures, sequential allocations, dynamic queues, and stack push/pop operations with C++ implementations.",
        tags: ["stack", "queue", "list", "dynamic", "data structure", "C++", "recursion", "tutorial"],
        external_link: "https://opendsa-server.cs.vt.edu/ODSA/Books/CS3/html/StackArray.html"
      },
      {
        title: "Binary Search Trees and Balanced AVL Trees",
        category: "Programming Tutorials",
        department: "Computer Science",
        level: "300 Level",
        course_code: "CSC302",
        description: "Learn how to construct and balance binary search trees. This resource covers AVL tree rotations, tree traversals (inorder, preorder, postorder), and binary tree height calculation.",
        tags: ["binary tree", "bst", "avl", "tree traversal", "recursion", "algorithm", "balanced tree"],
        external_link: "https://www.geeksforgeeks.org/binary-search-tree-data-structure/"
      },
      {
        title: "Predictive Analytics and Machine Learning with Python",
        category: "Final Year Projects",
        department: "Computer Science",
        level: "400 Level",
        course_code: "CSC499",
        description: "A past student's graduation project building an end-to-end predictive machine learning model. Uses supervised learning regression and classification models built on pandas, numpy, and scikit-learn.",
        tags: ["machine learning", "python", "supervised learning", "regression", "classification", "pandas", "data science", "ai", "artificial intelligence"],
        external_link: "https://github.com/topics/machine-learning-project"
      },
      {
        title: "Advanced Node.js Backend Framework Design",
        category: "Programming Tutorials",
        department: "Software Engineering",
        level: "400 Level",
        course_code: "SEN401",
        description: "Master backend systems with Node.js, Express, and databases. Covers asynchronous middleware patterns, request sanitization, routing architecture, and building rest apis.",
        tags: ["nodejs", "backend", "express", "rest api", "server", "javascript", "database", "systems"],
        external_link: "https://expressjs.com/"
      },
      {
        title: "Principles of Computer Networks and IP Routing",
        category: "Books",
        department: "Computer Engineering",
        level: "300 Level",
        course_code: "CPE305",
        description: "Standard textbook on computer networking. Covers TCP/IP model, network layer routing protocols, packet switching, subnets, and standard port configurations.",
        tags: ["networking", "tcp", "ip", "router", "packet", "subnet", "computer network", "protocol"],
        external_link: "https://www.ietf.org/"
      },
      {
        title: "CSC101 Introduction to Programming Past Questions",
        category: "Past Questions",
        department: "Computer Science",
        level: "100 Level",
        course_code: "CSC101",
        description: "Compiled collection of past exams from CSC101 (Introduction to Computer Science and Programming). Includes theory questions on loops, conditional statements, basic algorithms, and functions.",
        tags: ["programming", "exam", "past question", "csc101", "basics", "coding", "python"],
        external_link: null
      },
      {
        title: "Deep Learning Architectures for Image Recognition",
        category: "Research Papers",
        department: "Artificial Intelligence",
        level: "400 Level",
        course_code: "AI402",
        description: "Research paper discussing convolutional neural networks (CNNs), deep learning models, image recognition benchmarks, and tensor computations.",
        tags: ["deep learning", "cnn", "image recognition", "ai", "machine learning", "neural networks"],
        external_link: null
      }
    ];

    for (const r of seedResources) {
      const catRow = data.categories.find(c => c.name === r.category);
      if (catRow) {
        const resId = getNextId(data.resources);
        data.resources.push({
          id: resId,
          title: r.title,
          description: r.description,
          category_id: catRow.id,
          department: r.department,
          level: r.level,
          course_code: r.course_code,
          file_path: null,
          external_link: r.external_link,
          created_at: new Date().toISOString()
        });
        for (const tag of r.tags) {
          data.resource_tags.push({
            id: getNextId(data.resource_tags),
            resource_id: resId,
            tag
          });
        }
      }
    }
    console.log("Seeded default resources and tags");
  }

  await saveDb();
  console.log("Database initialized successfully!");
}
