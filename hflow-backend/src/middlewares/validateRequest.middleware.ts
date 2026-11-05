import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export function validateRequest(schema: ZodType): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      response.status(400).json({
        error: {
          message: "Request validation failed",
          details: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
      return;
    }

    request.body = result.data;
    next();
  };
}
