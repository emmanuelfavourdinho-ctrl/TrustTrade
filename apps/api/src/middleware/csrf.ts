import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireSameOrigin(request: Request, _response: Response, next: NextFunction) {
  if (SAFE_METHODS.has(request.method)) {
    next();
    return;
  }

  const origin = request.get("origin");
  if (origin !== env.WEB_ORIGIN) {
    next(new HttpError(403, "CSRF_ORIGIN_REJECTED", "The request origin is not allowed."));
    return;
  }
  next();
}
