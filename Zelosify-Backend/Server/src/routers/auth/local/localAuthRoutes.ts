
import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import asyncHandler from "../../../utils/handler/asyncHandler.js";
import { authenticateUser } from "../../../middlewares/auth/authenticateMiddleware.js";
import {
  logout,
  register,
  verifyLogin,
  verifyTOTP,
  getTOTPSetupQR,
} from "../../../controllers/controllers.js";
import { AuthenticatedRequest } from "../../../types/common.js";
import { validateRequest } from "../../../middlewares/validation/validateRequest.js";
import { registerCandidateSchema, loginSchema, verifyTotpSchema } from "../../../validations/authValidation.js";






const wrapHandler = (handler: RequestHandler): RequestHandler =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await handler(req, res, next);
  });






const wrapProtectedHandler = (handler: RequestHandler): RequestHandler =>
  asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      await handler(req, res, next);
    }
  );

const router = Router();











router.post("/register", validateRequest(registerCandidateSchema), wrapHandler(register));
router.post("/signup", validateRequest(registerCandidateSchema), wrapHandler(register));





router.post("/verify-login", validateRequest(loginSchema), wrapHandler(verifyLogin));
router.post("/login", validateRequest(loginSchema), wrapHandler(verifyLogin));





router.post("/verify-totp", validateRequest(verifyTotpSchema), wrapHandler(verifyTOTP));

router.get("/totp/setup/qr", wrapHandler(getTOTPSetupQR));





router.post("/logout", authenticateUser, wrapProtectedHandler(logout));

export default router;
