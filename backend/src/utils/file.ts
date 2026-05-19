import fs from "fs";
import path from "path";

export const moveTempFolder = (tempFolder: string, targetFolder: string) => {
  const basePath = path.join(process.cwd(), "backend", "src", "uploads");

  const tempPath = path.join(basePath, "temp", tempFolder);
  const targetPath = path.join(basePath, targetFolder);

  if (!fs.existsSync(tempPath)) return;

  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }

  fs.readdirSync(tempPath).forEach((file) => {
    fs.renameSync(path.join(tempPath, file), path.join(targetPath, file));
  });

  fs.rmSync(tempPath, { recursive: true, force: true });
};
