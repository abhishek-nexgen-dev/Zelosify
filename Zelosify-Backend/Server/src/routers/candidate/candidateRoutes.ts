import { Router, type NextFunction, type Request, type Response } from "express";
import {
  getMyApplications,
  getMyApplicationScore,
  retryMyApplicationAnalysis,
  updateResume,
  revokeApplication,
} from "../../controllers/candidate/candidateController.js";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../middlewares/auth/authorizeMiddleware.js";
import { validateRequest } from "../../middlewares/validation/validateRequest.js";
import { updateResumeSchema } from "../../validations/candidateValidation.js";
import multer from "multer";

const router = Router();
const resumeReplacementUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 1 },
});

function parseResumeReplacement(req: Request, res: Response, next: NextFunction): void {
  resumeReplacementUpload.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
        success: false,
        message: error.code === "LIMIT_FILE_SIZE" ? "Resume must be 10 MB or smaller." : "Upload one resume file using the file field.",
      });
      return;
    }
    if (error) { next(error); return; }
    next();
  });
}


router.use(authenticateUser);
router.use(authorizeRole("CANDIDATE"));






router.get("/applications", getMyApplications);
router.get("/applications/:id/score", getMyApplicationScore);
router.post("/applications/:id/retry-analysis", retryMyApplicationAnalysis);

router.put(
  "/applications/:id/resume",
  parseResumeReplacement,
  validateRequest(updateResumeSchema),
  updateResume
);

router.delete("/applications/:id", revokeApplication);

export default router;
