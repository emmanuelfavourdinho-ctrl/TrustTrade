import { randomUUID } from "node:crypto";
import { chmodSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import multer from "multer";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";

export const verificationStoragePath = resolve(env.PRIVATE_STORAGE_DIR, "verification");
mkdirSync(verificationStoragePath, { recursive: true, mode: 0o700 });
chmodSync(verificationStoragePath, 0o700);

const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export const verificationUpload = multer({
  storage: multer.diskStorage({
    destination: verificationStoragePath,
    filename: (_request, _file, callback) => callback(null, `${randomUUID()}.upload`),
  }),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 2,
    fields: 1,
    fieldSize: 200,
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new HttpError(415, "UNSUPPORTED_DOCUMENT_TYPE", "Upload a PDF, JPEG or PNG document."));
      return;
    }
    callback(null, true);
  },
});

export function sniffDocumentType(bytes: Buffer, allowPdf: boolean) {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return { extension: "jpg", mime: "image/jpeg" };
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { extension: "png", mime: "image/png" };
  if (allowPdf && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return { extension: "pdf", mime: "application/pdf" };
  return null;
}
