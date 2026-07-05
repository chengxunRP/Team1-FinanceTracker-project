const path = require("path");
const fs = require("fs");
const multer = require("multer");

const uploadDir = path.join(
  __dirname,
  "..",
  "public",
  "uploads",
  "category-icons"
);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ALLOWED_EXT.includes(ext) ? ext : ".png";
    cb(
      null,
      `category-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`
    );
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ALLOWED_MIME.includes(file.mimetype) && ALLOWED_EXT.includes(ext)) {
    cb(null, true);
    return;
  }
  cb(new Error("Only PNG, JPG, JPEG, and WEBP files are allowed."), false);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1 * 1024 * 1024 },
});

function uploadCategoryIcon(req, _res, next) {
  upload.single("categoryIcon")(req, _res, (err) => {
    if (err) req.uploadError = err.message || "Image upload failed.";
    next();
  });
}

module.exports = uploadCategoryIcon;
