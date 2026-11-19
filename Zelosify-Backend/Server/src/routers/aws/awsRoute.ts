

import express from "express";
import { listOfObjects } from "../../controllers/controllers.js";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";

const router = express.Router();








router.get("/list", authenticateUser, listOfObjects as any);

export default router;
