import { Router } from "express";
import { getInternalDashboard } from "../../controllers/dashboard/dashboardController.js";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../middlewares/auth/authorizeMiddleware.js";

const router = Router();

router.get(
  "/",
  authenticateUser,
  authorizeRole("ADMIN", "RECRUITER", "HIRING_MANAGER", "IT_VENDOR"),
  getInternalDashboard,
);

export default router;
