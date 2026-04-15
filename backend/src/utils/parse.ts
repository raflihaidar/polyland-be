import fs from "fs";
import crypto from "crypto";

export const serializeBigInt = (data: any) => {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  )
}

export const imageToBase64 = (filePath: string) => {
  const image = fs.readFileSync(filePath);
  return `data:image/png;base64,${image.toString("base64")}`;
};

export function generateRandomPassword(length = 12) {
  return crypto
    .randomBytes(length)
    .toString("base64")
    .slice(0, length);
}