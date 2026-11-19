
import { Router } from "express";
import localAuthRoutes from "./local/localAuthRoutes.js";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";
import { getUserDetails } from "../../controllers/controllers.js";





const router = Router();











router.use("/", localAuthRoutes);





router.get("/user", authenticateUser, getUserDetails);

export default router;
