import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../utils/http-error.js";

export function validateBody<T>(schema: ZodType<T>) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(
        new HttpError(
          422,
          "VALIDATION_ERROR",
          result.error.issues[0]?.message ?? "The request body is invalid.",
        ),
      );
      return;
    }
    request.body = result.data;
    next();
  };
}
