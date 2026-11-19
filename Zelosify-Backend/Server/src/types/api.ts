








export interface ErrorResponse {

  error: string;

  details?: string;

  statusCode?: number;
}





export interface SuccessResponse<T = any> {

  message: string;

  data?: T;

  statusCode?: number;
}
