import fs from "fs";
import crypto from "crypto";
import { PaymentStatus } from "../generated/prisma/enums.js";

export const serializeBigInt = (data: any) => {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
};

export const imageToBase64 = (filePath: string) => {
  const image = fs.readFileSync(filePath);
  return `data:image/png;base64,${image.toString("base64")}`;
};

export function generateRandomPassword(length = 12) {
  return crypto.randomBytes(length).toString("base64").slice(0, length);
}

export const toCapitalize = (text: string): string => {
  if (!text) return "";

  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const formatDateIndonesia = (date: string | Date): string => {
  const d = new Date(date);

  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export const decimalToFraction = (decimal: number) => {
  if (!decimal) return "0";

  if (decimal === 1) return "1";
  if (decimal === 0.5) return "1/2";
  if (decimal === 0.25) return "1/4";
  if (decimal === 0.75) return "3/4";

  const tolerance = 1.0e-6;
  let numerator = 1;
  let denominator = 1;

  while (Math.abs(decimal - numerator / denominator) > tolerance) {
    if (numerator / denominator < decimal) {
      numerator++;
    } else {
      denominator++;
    }
  }

  return `${numerator}/${denominator}`;
};

export const mapPaymentStatus = (midtransStatus: string): PaymentStatus => {
  const status = midtransStatus.toLowerCase();

  switch (status) {
    case 'settlement':
      return PaymentStatus.SUCCESS;

    case 'pending':
      return PaymentStatus.PENDING;

    case 'expire':
      return PaymentStatus.EXPIRED;

    case 'cancel':
      return PaymentStatus.CANCELED;

    case 'refund':
      return PaymentStatus.REFUND;

    default:
      return PaymentStatus.PENDING;
  }
};