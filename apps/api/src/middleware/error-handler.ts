import type { ErrorRequestHandler } from "express";
import { Prisma } from "../generated/prisma/client.js";
import multer from "multer";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    response.status(400).json({
      success: false,
      error: { code: "INVALID_UPLOAD", message: "Upload one identity document and one selfie, each no larger than 8 MB." },
    });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "The request is invalid.",
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      response.status(409).json({
        success: false,
        error: { code: "RESOURCE_CONFLICT", message: "That information is already in use." },
      });
      return;
    }
    if (error.code === "P2025") {
      response.status(404).json({
        success: false,
        error: { code: "RESOURCE_NOT_FOUND", message: "The requested record could not be found." },
      });
      return;
    }
    if (error.code === "P2003") {
      response.status(422).json({
        success: false,
        error: { code: "INVALID_REFERENCE", message: "One of the referenced records is unavailable." },
      });
      return;
    }
    if (error.code === "P2010" && error.meta?.code === "42501") {
      response.status(403).json({
        success: false,
        error: { code: "ARTISAN_VERIFICATION_REQUIRED", message: "An active approved artisan verification is required before publishing." },
      });
      return;
    }
    if (error.code === "P2010" && error.meta?.code === "23514") {
      response.status(422).json({
        success: false,
        error: { code: "INVALID_SERVICE_LOCATION", message: "Select an active locality in your service areas." },
      });
      return;
    }
  }

  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "The request body must be valid JSON." },
    });
    return;
  }

  if (response.headersSent) {
    _next(error);
    return;
  }

  console.error("Unhandled API error", error);
  response.status(500).json({
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." },
  });
};
