const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static("public"));          // serves index.html, CSS, JS
app.use("/uploads", express.static("uploads")); // serves uploaded images

// ── Ensure uploads folder exists ────────────────────────────────────────────
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// ── Multer storage config ───────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    // Prefix with timestamp to avoid name collisions
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  },
});

// Allow only jpg / png
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG and PNG files are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

// ── Routes ──────────────────────────────────────────────────────────────────

// GET /api/images  → list all uploaded images
app.get("/api/images", (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) return res.status(500).json({ error: "Could not read uploads folder." });

    const images = files
      .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
      .map((f) => ({
        filename: f,
        url: `/uploads/${f}`,
        uploadedAt: fs.statSync(path.join(uploadsDir, f)).mtime,
      }))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)); // newest first

    res.json(images);
  });
});

// POST /api/upload  → upload one or more images
app.post("/api/upload", upload.array("images", 20), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded." });
  }

  const uploaded = req.files.map((f) => ({
    filename: f.filename,
    url: `/uploads/${f.filename}`,
  }));

  res.json({ message: "Upload successful!", files: uploaded });
});

// DELETE /api/images/:filename  → delete a single image
app.delete("/api/images/:filename", (req, res) => {
  const filename = req.params.filename;

  // Basic security: reject any path traversal attempts
  if (filename.includes("..") || filename.includes("/")) {
    return res.status(400).json({ error: "Invalid filename." });
  }

  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found." });
  }

  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).json({ error: "Could not delete file." });
    res.json({ message: "Image deleted successfully." });
  });
});

// ── Multer error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// ── Start server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Image Gallery server running at http://localhost:${PORT}`);
});
