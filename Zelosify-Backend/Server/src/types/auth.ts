








export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  department?: string;
}




export interface LoginCredentials {

  email: string;

  password: string;
}




export interface TokenResponse {

  access_token: string;

  refresh_token: string;
}




export interface RegisterResponse {

  message: string;

  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    department: string;
    role: string;
    tenantId: string;
    provider: string;
  };

  totpSessionReady: boolean;

  expiresIn: number;
}




export interface LoginTOTPRequiredResponse {

  message: string;
}




export interface LoginSuccessResponse {

  success: boolean;

  message: string;

  user: {
    id: string;
    username: string | null;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    role: string;
    department: string | null;
    provider: string;
    tenantId: string | null;
  };

  redirectTo: string;
}
