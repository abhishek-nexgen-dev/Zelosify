




import { AuthProvider } from "@prisma/client";
import { Request } from "express";





export interface ApiResponse<T = any> {

  message?: string;

  error?: string;

  data?: T;

  [key: string]: any;
}




export interface UserTenant {

  tenantId: string;

  companyName: string;
}





export interface AuthenticatedUser {

  id: string;

  username: string;

  email: string;

  firstName?: string | null;

  lastName?: string | null;

  role: string;
  permissions: string[];

  department: string;

  provider: AuthProvider;

  tenant: UserTenant;
}

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}





export interface AuthenticatedRequest extends Request {

  user_id?: string;

  user?: AuthenticatedUser;
}




export interface DigitalInitiativeRequest {

  initiativeTitle: string;

  businessRationale: string;

  enterpriseResourceCount: number;

  resourceDuration: number;

  successCriteria: string | object;

  timeline: string | object;

  additionalComments?: string;
}




export interface DigitalInitiativeResponse {

  requestIdentifier: string;

  message?: string;
}




export interface FormValidationError {

  error: string;

  details?: any[];
}
