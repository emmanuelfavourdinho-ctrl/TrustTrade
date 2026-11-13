import type { Response } from "express";

export function apiSuccess<T>(
  response: Response,
  data: T,
  message?: string,
  status = 200,
) {
  response.status(status).json({
    success: true,
    data,
    ...(message ? { message } : {}),
  });
}
