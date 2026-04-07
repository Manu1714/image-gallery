# 📷 Image Gallery

A beginner-friendly full-stack image gallery built with **HTML/CSS/JS** (frontend) and **Node.js + Express** (backend).

---

## ✨ Features

- 📁 Drag & drop **or** click-to-browse upload
- 👁️ Instant preview thumbnails before uploading
- 📊 Real-time upload progress bar
- 🖼️ Responsive masonry-style grid gallery
- 🔍 Lightbox viewer (click any image)
- 🗑️ Delete images with confirmation modal
- ✅ Success / error toast notifications
- 🔒 File type restriction (JPG & PNG only, max 10 MB)
- 💀 Skeleton loading state while gallery loads

---

## 📂 Folder Structure

```
image-gallery/
├── server.js          ← Express backend (API)
├── package.json
├── .gitignore
├── uploads/           ← Auto-created; stores uploaded images
└── public/            ← Frontend (served as static files)
    ├── index.html
    ├── style.css
    └── app.js
```

---

## 🚀 Setup & Run

### 1. Prerequisites
Make sure you have **Node.js** installed (v14 or newer).  
Download from https://nodejs.org if needed.

### 2. Install dependencies
```bash
cd image-gallery
npm install
```

### 3. Start the server
```bash
npm start
```

You should see:
```
✅  Image Gallery server running at http://localhost:3000
```

### 4. Open in browser
Visit → **http://localhost:3000**

---

## 🛠️ Development Mode (auto-restart on save)
```bash
npm run dev
```
This uses `nodemon` so the server restarts automatically when you edit `server.js`.

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/images` | List all uploaded images |
| POST   | `/api/upload` | Upload one or more images |
| DELETE | `/api/images/:filename` | Delete an image by filename |

---

## 📌 Notes

- Uploaded images are stored in the `uploads/` folder (auto-created).
- Only `.jpg` and `.png` files are accepted.
- Maximum file size is **10 MB** per image.
- Up to **20 images** can be uploaded in a single batch.
