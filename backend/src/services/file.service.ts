import fs from "fs";
import path from "path";

const baseUploadDir = path.join(process.cwd(), "backend", "src", "uploads");

export const moveFileToApplicationFolder = (
  file: Express.Multer.File,
  applicationId: string,
) => {
  const appFolder = path.join(baseUploadDir, applicationId);

  if (!fs.existsSync(appFolder)) {
    fs.mkdirSync(appFolder, { recursive: true });
  }

  const ext = path.extname(file.originalname);
  const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();

  const newFileName = `${Date.now()}-${safeName}`;
  const newPath = path.join(appFolder, newFileName);

  // Pindahkan file dari temp ke folder final
  fs.renameSync(file.path, newPath);

  return `uploads/${applicationId}/${newFileName}`;
};
