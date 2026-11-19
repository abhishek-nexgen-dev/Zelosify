import { register as registerImpl } from "./register/localRegister.js";
import { verifyLogin as verifyLoginImpl } from "./login/localLogin.js";
import { verifyTOTP as verifyTOTPImpl } from "./login/verifyTOTP.js";
import { getTOTPSetupQR as getTOTPSetupQRImpl } from "./login/setupTOTP.js";
import { Request, Response, NextFunction } from "express";








export const register = async (
  req: Request,
  res: Response,
  next?: NextFunction
) => {
  try {

    const safeNext: NextFunction = next || (() => {});
    await registerImpl(req, res, safeNext);
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: "Internal server error",
    });
  }
};






export const verifyLogin = async (req: Request, res: Response) => {
  try {
    await verifyLoginImpl(req, res);
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: "Internal server error",
    });
  }
};






export const verifyTOTP = async (req: Request, res: Response) => {
  try {
    await verifyTOTPImpl(req, res);
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: "Internal server error",
    });
  }
};

export const getTOTPSetupQR = async (req: Request, res: Response) => {
  try {
    await getTOTPSetupQRImpl(req, res);
  } catch {
    res.status(500).json({ message: "Could not generate the authenticator setup QR." });
  }
};
