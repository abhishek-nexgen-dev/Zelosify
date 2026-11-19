import { Router, type RequestHandler } from "express";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../middlewares/auth/authorizeMiddleware.js";
import { asyncHandler } from "../../utils/handler/asyncHandler.js";
import { requirePermission } from "../../middlewares/auth/requirePermission.js";
import {
  getHiringManagerOpenings,
  getHiringManagerOpeningProfiles,
  shortlistCandidateProfile,
  rejectCandidateProfile,
} from "../../controllers/hiring/contractHiringManagerController.js";

const router = Router();








router.get(
  "/openings",
  authenticateUser as RequestHandler,
  authorizeRole("ADMIN", "HIRING_MANAGER") as RequestHandler,
  requirePermission("JOBS_VIEW"),
  asyncHandler(getHiringManagerOpenings as any)
);


router.get(
  "/openings/:id/profiles",
  authenticateUser as RequestHandler,
  authorizeRole("ADMIN", "HIRING_MANAGER") as RequestHandler,
  requirePermission("CANDIDATES_VIEW"),
  asyncHandler(getHiringManagerOpeningProfiles as any)
);


router.post(
  "/profiles/:id/shortlist",
  authenticateUser as RequestHandler,
  authorizeRole("ADMIN", "HIRING_MANAGER") as RequestHandler,
  requirePermission("CANDIDATES_SHORTLIST"),
  asyncHandler(shortlistCandidateProfile as any)
);


router.post(
  "/profiles/:id/reject",
  authenticateUser as RequestHandler,
  authorizeRole("ADMIN", "HIRING_MANAGER") as RequestHandler,
  requirePermission("CANDIDATES_REJECT"),
  asyncHandler(rejectCandidateProfile as any)
);


router.get(
  "/",
  authenticateUser as RequestHandler,
  authorizeRole("ADMIN", "HIRING_MANAGER") as RequestHandler,
  requirePermission("JOBS_VIEW"),
  asyncHandler(getHiringManagerOpenings as any)
);

export default router;
