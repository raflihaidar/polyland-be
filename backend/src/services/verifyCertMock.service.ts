import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/error.js";

export const mockIsVerified = async (certCode: string): Promise<boolean> => {
  const latency = Math.floor(Math.random() * 250 + 50);
  await new Promise((resolve) => setTimeout(resolve, latency));
  return true;
};

export const verifyCertificate = async (certCode: string) => {
  const certificate = await prisma.certificate.findUnique({
    where: { code: certCode },
    include: {
      land: {
        include: {
          province: true,
          regency: true,
          district: true,
          village: true,
        },
      },
      owners: {
        include: {
          person: true,
        },
      },
      notes: {
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!certificate) {
    throw new AppError("Data sertifikat tidak ditemukan", 200);
    console.log("oke");
  }

  let isVerified: boolean;

  try {
    isVerified = await mockIsVerified(certCode);
  } catch (error) {
    console.log("gagal");
    throw new AppError("Gagal melakukan verifikasi ke blockchain", 502);
  }

  if (!isVerified) {
    throw new AppError("Sertifikat tidak valid atau telah dicabut", 200);
    console.log("oke");
  }

  return {
    isVerified: true,
    certificate: {
      id: certificate.id,
      code: certificate.code,
      nib: certificate.nib,
      type: certificate.type,
      status: certificate.status,
      token_id: certificate.token_id,
      tx_hash: certificate.tx_hash,
      hash: certificate.hash,
      cid: certificate.cid,
      createdAt: certificate.createdAt,
      land: {
        area_size: certificate.land.area_size,
        street_address: certificate.land.street_address,
        village: certificate.land.village.name,
        district: certificate.land.district.name,
        regency: certificate.land.regency.name,
        province: certificate.land.province.name,
      },
      owners: certificate.owners.map((o: any) => ({
        name: o.person.name,
        nik: o.person.nik,
        share: o.ownership_pct,
      })),
      notes: certificate.notes.map((n: any) => n.note),
    },
  };
};
