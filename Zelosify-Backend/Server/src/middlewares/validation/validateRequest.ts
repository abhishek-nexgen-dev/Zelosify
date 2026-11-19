import { Request, Response, NextFunction, RequestHandler } from "express";
import { z, ZodError } from "zod";





export const validateRequest = (schema: z.ZodTypeAny): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed: any = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });


      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query as any;
      if (parsed.params !== undefined) req.params = parsed.params as any;

      next();
    } catch (error: any) {
      if (error instanceof ZodError || error?.issues) {
        const rawIssues: any[] = error.issues || (error as any).errors || [];
        const issues = rawIssues.map((err: any) => ({
          field: Array.isArray(err.path)
            ? err.path.join(".").replace(/^(body|query|params)\.?/, "")
            : String(err.path || ""),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: issues,
        });
        return;
      }
      next(error);
    }
  };
};
