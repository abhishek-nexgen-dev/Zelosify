import type { Request, Response, RequestHandler, NextFunction } from "express";






























export const asyncHandler = (
  fn: ((req: Request, res: Response) => Promise<void>) |
      ((req: Request, res: Response, next: NextFunction) => Promise<void>)
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
