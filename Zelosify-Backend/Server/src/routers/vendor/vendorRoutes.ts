import express, { type RequestHandler } from "express";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../middlewares/auth/authorizeMiddleware.js";
import { asyncHandler } from "../../utils/handler/asyncHandler.js";
import { requirePermission } from "../../middlewares/auth/requirePermission.js";
import {
  getVendorOpenings,
  getVendorOpeningDetail,
  presignVendorProfileUpload,
  submitVendorProfiles,
  previewVendorProfile,
  softDeleteVendorProfile,
} from "../../controllers/vendor/contractOpeningsController.js";

const router = express.Router();








router.get(
  "/openings",
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
  requirePermission("JOBS_VIEW"),
  asyncHandler(getVendorOpenings as any)
);


router.get(
  "/openings/:id",
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
  requirePermission("JOBS_VIEW"),
  asyncHandler(getVendorOpeningDetail as any)
);


router.post(
  "/openings/:id/profiles/presign",
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
  requirePermission("VENDOR_PROFILES_SUBMIT"),
  asyncHandler(presignVendorProfileUpload as any)
);


router.post(
  "/openings/:id/profiles/upload",
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
  requirePermission("VENDOR_PROFILES_SUBMIT"),
  asyncHandler(submitVendorProfiles as any)
);


router.get(
  "/profiles/:id/preview",
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
  requirePermission("VENDOR_PROFILES_VIEW"),
  asyncHandler(previewVendorProfile as any)
);


router.delete(
  "/profiles/:id",
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
  requirePermission("VENDOR_PROFILES_DELETE"),
  asyncHandler(softDeleteVendorProfile as any)
);


router.get(
  "/",
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
  requirePermission("JOBS_VIEW"),
  asyncHandler(getVendorOpenings as any)
);

export default router;
