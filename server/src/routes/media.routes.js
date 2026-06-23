const multer = require("multer");
const router = require("express").Router();
const ctrl = require("../controllers/media.controller");
const validate = require("../middleware/validate.middleware");
const v = require("../validations/media.validation");
const { requireAdmin } = require("../middleware/auth.middleware");

// In-memory upload for images (small files), 10 MB cap.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Public: resolve a playable HLS URL for a finished video.
router.get("/play/:videoId", validate(v.byVideoId), ctrl.playUrl);
// Public: proxy HLS playlists/segments (no S3 CORS needed). Express 5 wildcard.
router.get("/hls/:videoId/*path", ctrl.streamHls);

// Admin-only media management + upload pipeline.
router.use(requireAdmin("ADMIN", "EDITOR"));
router.get("/", ctrl.list);
router.post("/upload-url", validate(v.createUpload), ctrl.createUpload);
router.post("/image", upload.single("file"), ctrl.uploadImage); // server-side image upload (no S3 CORS needed)
router.post("/:id/complete", validate(v.byId), ctrl.complete);
router.get("/:id/status", validate(v.byId), ctrl.status);
router.delete("/:id", validate(v.byId), ctrl.remove);

module.exports = router;
