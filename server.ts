import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import session from "express-session";
import { createServer as createViteServer } from "vite";
import { initDatabase } from "./server/db.js";
import { router as apiRouter } from "./server/routes.js";

async function startServer() {
  // Initialize the SQLite database and seed initial tables & records
  try {
    await initDatabase();
  } catch (err) {
    console.error("Database initialization failed!", err);
    process.exit(1);
  }

  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "reverse_search_key_session_secure_2026",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to false since we run behind standard proxy in dev/test
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      }
    })
  );

  // Serve physical uploaded files (e.g. uploaded PDFs)
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Register all backend API routes
  app.use("/api", apiRouter);

  // Health-check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", database: "sqlite", time: new Date().toISOString() });
  });

  // Vite development integration or static serving
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite HMR...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on host 0.0.0.0 and port ${PORT}`);
  });
}

startServer();
