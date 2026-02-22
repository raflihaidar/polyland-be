import multer from "multer";
import fs from "fs";
import path from "path";
import { Request } from "express";
const baseUploadDir = path.join(process.cwd(), "backend", "src", "uploads");

export const upload = multer({
  storage: multer.diskStorage({
    destination: function (req: Request, file, cb) {
      // buat temp folder hanya sekali
      if (!req.body._tempFolder) {
        req.body._tempFolder = Date.now().toString();
      }

      const uploadPath = path.join(baseUploadDir, "temp", req.body._tempFolder);

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();

      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
});

export const uploadUpdate = (applicationId: string) =>
  multer({
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadPath = path.join(baseUploadDir, applicationId);

        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
      },
      filename: function (req, file, cb) {
        const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();

        cb(null, `${Date.now()}-${safeName}`);
      },
    }),
  });
