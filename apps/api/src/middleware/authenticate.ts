import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { getSession } from "../modules/auth/service.js";
import { HttpError } from "../utils/http-error.js";

export async function authenticate(request: Request, _response: Response, next: NextFunction) {
  const token = request.cookies?.[env.SESSION_COOKIE_NAME];
  if (typeof token !== "string" || token.length < 32) {
    next(new HttpError(401, "AUTHENTICATION_REQUIRED", "Sign in to continue."));
    return;
  }

  try {
    const session = await getSession(token);
    if (!session) {
      next(new HttpError(401, "SESSION_INVALID", "Your session has expired. Sign in again."));
      return;
    }
    request.auth = { sessionId: session.id, user: session.user };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireActiveAccount(request: Request, _response: Response, next: NextFunction) {
  if (request.auth?.user.accountStatus !== "ACTIVE") {
    next(new HttpError(403, "ACCOUNT_RESTRICTED", "This account cannot perform that action."));
    return;
  }
  next();
}

export function requireRole(...roles: Array<"CUSTOMER" | "ARTISAN" | "ADMIN">) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.auth || !roles.includes(request.auth.user.role)) {
      next(new HttpError(403, "FORBIDDEN", "You do not have permission to perform this action."));
      return;
    }
    next();
  };
}
