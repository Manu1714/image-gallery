// ── DOM References ───────────────────────────────────────────────────────────
const dropZone      = document.getElementById("dropZone");
const fileInput     = document.getElementById("fileInput");
const previewStrip  = document.getElementById("previewStrip");
const previewThumbs = document.getElementById("previewThumbs");
const clearBtn      = document.getElementById("clearBtn");
const uploadBtn     = document.getElementById("uploadBtn");
const progressWrap  = document.getElementById("progressWrap");
const progressBar   = document.getElementById("progressBar");
const progressText  = document.getElementById("progressText");
const toast         = document.getElementById("toast");
const galleryGrid   = document.getElementById("galleryGrid");
const galleryCount  = document.getElementById("galleryCount");
const skeletonGrid  = document.getElementById("skeletonGrid");
const emptyState    = document.getElementById("emptyState");
const lightbox      = document.getElementById("lightbox");
const lightboxImg   = document.getElementById("lightboxImg");
const lightboxClose = document.getElementById("lightboxClose");
const modalOverlay  = document.getElementById("modalOverlay");
const cancelDelete  = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");

let selectedFiles  = [];   // files staged for upload
let pendingDelete  = null; // filename awaiting confirmation

// ── API Helpers ──────────────────────────────────────────────────────────────
const API = {
  getImages: () => fetch("/api/images").then(r => r.json()),

  upload(formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");

      xhr.upload.addEventListener("progress", e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });

      xhr.addEventListener("load", () => {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || "Upload failed."));
      });

      xhr.addEventListener("error", () => reject(new Error("Network error.")));
      xhr.send(formData);
    });
  },

  deleteImage: filename =>
    fetch(`/api/images/${encodeURIComponent(filename)}`, { method: "DELETE" })
      .then(r => r.json()),
};

// ── File Validation ──────────────────────────────────────────────────────────
function validateFile(file) {
  const allowed = ["image/jpeg", "image/png"];
  if (!allowed.includes(file.type)) return "Only JPG and PNG files are allowed.";
  if (file.size > 10 * 1024 * 1024)  return `${file.name} exceeds 10 MB limit.`;
  return null;
}

// ── Preview Strip ────────────────────────────────────────────────────────────
function stageFiles(files) {
  const errors = [];
  const valid  = [];

  Array.from(files).forEach(f => {
    const err = validateFile(f);
    if (err) errors.push(err);
    else valid.push(f);
  });

  if (errors.length) showToast(errors[0], "error");
  if (!valid.length)  return;

  selectedFiles = [...selectedFiles, ...valid];

  previewThumbs.innerHTML = "";
  selectedFiles.forEach(f => {
    const img = document.createElement("img");
    img.className = "preview-thumb";
    img.alt = f.name;
    const reader = new FileReader();
    reader.onload = e => (img.src = e.target.result);
    reader.readAsDataURL(f);
    previewThumbs.appendChild(img);
  });

  previewStrip.hidden = false;
}

function clearStaging() {
  selectedFiles = [];
  previewThumbs.innerHTML = "";
  previewStrip.hidden = true;
  fileInput.value = "";
  hideProgress();
}

// ── Upload Flow ──────────────────────────────────────────────────────────────
async function handleUpload() {
  if (!selectedFiles.length) return;

  uploadBtn.disabled = true;
  clearBtn.disabled  = true;
  progressWrap.hidden = false;
  progressBar.style.width = "0%";
  progressText.textContent = "Uploading…";

  const formData = new FormData();
  selectedFiles.forEach(f => formData.append("images", f));

  try {
    await API.upload(formData, pct => {
      progressBar.style.width = pct + "%";
      progressText.textContent = `Uploading… ${pct}%`;
    });

    progressBar.style.width = "100%";
    progressText.textContent = "Done!";

    showToast(`✅  ${selectedFiles.length} image${selectedFiles.length > 1 ? "s" : ""} uploaded successfully!`, "success");
    clearStaging();
    await loadGallery();
  } catch (err) {
    showToast("❌  " + err.message, "error");
  } finally {
    uploadBtn.disabled = false;
    clearBtn.disabled  = false;
  }
}

function hideProgress() {
  setTimeout(() => {
    progressWrap.hidden = true;
    progressBar.style.width = "0%";
  }, 800);
}

// ── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(message, type = "success") {
  toast.textContent = message;
  toast.className = "toast " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = "toast"; }, 4500);
}

// ── Gallery ──────────────────────────────────────────────────────────────────
async function loadGallery() {
  skeletonGrid.hidden = false;
  galleryGrid.innerHTML = "";
  emptyState.hidden = true;

  try {
    const images = await API.getImages();

    skeletonGrid.hidden = true;

    if (!images.length) {
      emptyState.hidden = false;
      galleryCount.textContent = "";
      return;
    }

    galleryCount.textContent = `${images.length} photo${images.length !== 1 ? "s" : ""}`;

    images.forEach((img, i) => {
      const item = document.createElement("div");
      item.className = "gallery-item";
      item.style.animationDelay = `${i * 40}ms`;

      item.innerHTML = `
        <img src="${img.url}" alt="${img.filename}" loading="lazy" />
        <div class="gallery-item-overlay">
          <button class="delete-btn" data-filename="${img.filename}">🗑 Delete</button>
        </div>
      `;

      // Open lightbox on image click
      item.querySelector("img").addEventListener("click", () => openLightbox(img.url));

      // Delete button → confirmation modal
      item.querySelector(".delete-btn").addEventListener("click", e => {
        e.stopPropagation();
        openDeleteModal(img.filename);
      });

      galleryGrid.appendChild(item);
    });
  } catch {
    skeletonGrid.hidden = true;
    showToast("Could not load gallery. Is the server running?", "error");
  }
}

// ── Lightbox ─────────────────────────────────────────────────────────────────
function openLightbox(src) {
  lightboxImg.src = src;
  lightbox.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  lightbox.classList.remove("open");
  document.body.style.overflow = "";
}

// ── Delete Modal ─────────────────────────────────────────────────────────────
function openDeleteModal(filename) {
  pendingDelete = filename;
  modalOverlay.classList.add("open");
}
function closeDeleteModal() {
  pendingDelete = null;
  modalOverlay.classList.remove("open");
}

async function doDelete() {
  if (!pendingDelete) return;
  const filename = pendingDelete;
  closeDeleteModal();

  try {
    await API.deleteImage(filename);
    showToast("🗑  Image deleted.", "success");
    await loadGallery();
  } catch {
    showToast("Could not delete image.", "error");
  }
}

// ── Event Listeners ──────────────────────────────────────────────────────────

// Drop zone click → open file picker
dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => stageFiles(fileInput.files));

// Drag and drop
dropZone.addEventListener("dragover",  e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  stageFiles(e.dataTransfer.files);
});

// Upload & Clear buttons
uploadBtn.addEventListener("click", handleUpload);
clearBtn.addEventListener("click", clearStaging);

// Lightbox close (button + backdrop)
lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });

// Keyboard Escape → close any overlay
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeLightbox(); closeDeleteModal(); }
});

// Delete modal buttons
cancelDelete.addEventListener("click",  closeDeleteModal);
confirmDelete.addEventListener("click", doDelete);

// ── Init ─────────────────────────────────────────────────────────────────────
loadGallery();
