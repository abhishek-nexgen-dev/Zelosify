import { Router, type RequestHandler } from "express";
import {
  listJobs,
  listManagedJobs,
  getManagedJob,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  listJobAssignees,
} from "../../controllers/jobs/jobsController.js";
import { getCandidatesForJob } from "../../controllers/recruiter/recruiterController.js";
import { applyForJob } from "../../controllers/candidate/candidateController.js";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../middlewares/auth/authorizeMiddleware.js";
import { validateRequest } from "../../middlewares/validation/validateRequest.js";
import {
  createJobSchema,
  updateJobSchema,
  queryJobsSchema,
  jobCandidatesQuerySchema,
} from "../../validations/jobValidation.js";
import { applyJobSchema } from "../../validations/candidateValidation.js";
import { requireAnyPermission, requirePermission } from "../../middlewares/auth/requirePermission.js";
import multer from "multer";

const router = Router();
const resumeUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 4 } });
const parseResumeUpload: RequestHandler = (req, res, next) => {
  resumeUpload.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ success: false, message: error.code === "LIMIT_FILE_SIZE" ? "Resume must be 10 MB or smaller." : "Upload one resume file using the file field." });
      return;
    }
    if (error) { next(error); return; }
    next();
  });
};

router.get(
  "/managed",
  authenticateUser,
  authorizeRole("ADMIN", "RECRUITER", "HIRING_MANAGER"),
  requirePermission("JOBS_VIEW"),
  validateRequest(queryJobsSchema),
  listManagedJobs,
);

router.get(
  "/managed/:id",
  authenticateUser,
  authorizeRole("ADMIN", "RECRUITER", "HIRING_MANAGER"),
  requirePermission("JOBS_VIEW"),
  getManagedJob,
);

router.get(
  "/assignees",
  authenticateUser,
  authorizeRole("ADMIN", "RECRUITER", "HIRING_MANAGER"),
  requireAnyPermission("JOBS_CREATE", "JOBS_UPDATE"),
  listJobAssignees,
);






router.get("/", validateRequest(queryJobsSchema), listJobs);






router.get("/:id", getJobById);






router.post(
  "/",
  authenticateUser,
  authorizeRole("ADMIN", "RECRUITER", "HIRING_MANAGER"),
  requirePermission("JOBS_CREATE"),
  validateRequest(createJobSchema),
  createJob
);






router.put(
  "/:id",
  authenticateUser,
  authorizeRole("ADMIN", "RECRUITER"),
  requirePermission("JOBS_UPDATE"),
  validateRequest(updateJobSchema),
  updateJob
);






router.delete(
  "/:id",
  authenticateUser,
  authorizeRole("ADMIN", "RECRUITER"),
  requirePermission("JOBS_UPDATE"),
  deleteJob
);






router.get(
  "/:id/candidates",
  authenticateUser,
  authorizeRole("ADMIN", "RECRUITER", "HIRING_MANAGER"),
  requirePermission("CANDIDATES_VIEW"),
  validateRequest(jobCandidatesQuerySchema),
  getCandidatesForJob
);






router.post(
  "/:id/apply",
  authenticateUser,
  authorizeRole("CANDIDATE"),
  parseResumeUpload,
  validateRequest(applyJobSchema),
  applyForJob
);

export default router;
