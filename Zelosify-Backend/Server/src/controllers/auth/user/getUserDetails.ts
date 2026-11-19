import { Response } from "express";
import { AuthenticatedRequest } from "../../../types/common.js";

export const getUserDetails = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {

    const user = req.user;
    if (!user?.id) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    const { id, username, email, firstName, lastName, role, permissions, department, tenant } = user;
    res.status(200).json({ id, username, email, firstName, lastName, role, permissions, department, tenant });
  } catch (error) {
    console.error("Error during user retrieval:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
