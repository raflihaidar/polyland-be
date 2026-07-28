import { prisma } from "../config/prisma.js";
import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";
import CryptoJS from "crypto-js";
import { AppError } from "../utils/error.js";
import puppeteer from "puppeteer";
import {
  toCapitalize,
  formatDateIndonesia,
  imageToBase64,
} from "../utils/parse.js";
import { encrypt } from "eciesjs";
import { uploadFile } from "./pinata.service.js";
import {
  walletClient,
  publicClient,
  contractConfig,
} from "../config/wallet.js";
import { CertificateStatus } from "../generated/prisma/enums.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BuildCertificatePDFForTestingParams {
  code: string;
  nib: string;
  type: string;
  land: any;
  owners: any[];
  notes?: string[];
  headOfficeName?: string;
  headOfficeNip?: string;
}

export const searchCertificate = async (search: string) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: {
        OR: [
          {
            nib: search,
          },
          {
            code: search,
          },
        ],
        AND: {
          status: CertificateStatus.AKTIF,
        },
      },
      select: {
        id: true,
        nib: true,
        type: true,
        status: true,
        code: true,
        land: {
          select: {
            id: true,
            area_size: true,
            street_address: true,
            rt: true,
            rw: true,
            province: {
              select: {
                name: true,
              },
            },
            regency: {
              select: {
                name: true,
              },
            },
            district: {
              select: {
                name: true,
              },
            },
            village: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return certificates;
  } catch (error: any) {
    throw new AppError("Terjadi kesalahan saat mencari data", 500, error?.meta);
  }
};

export const generateUniqueCode = (length = 6): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  const randomSeed = Date.now().toString() + Math.random().toString();

  const hash = CryptoJS.SHA256(randomSeed).toString();

  let result = "";

  for (let i = 0; i < length; i++) {
    const index = parseInt(hash.substring(i * 2, i * 2 + 2), 16) % chars.length;

    result += chars[index];
  }

  return result;
};

export const generateNIB = async (
  provinceCode: number,
  regencyCode: number,
  districtCode: number,
  villageCode: number,
) => {
  const provStr = provinceCode.toString().padStart(2, "0");
  const regStr = (regencyCode % 100).toString().padStart(2, "0");
  const distStr = (districtCode % 100).toString().padStart(2, "0");
  const villStr = (villageCode % 100).toString().padStart(2, "0");

  const prefixNIB = `${provStr}.${regStr}.${distStr}.${villStr}`;

  const lastCertificate = await prisma.certificate.findFirst({
    where: {
      nib: {
        startsWith: prefixNIB,
      },
    },
    orderBy: {
      nib: "desc",
    },
    select: {
      nib: true,
    },
  });

  let nextSequence = 1;

  if (lastCertificate?.nib) {
    const parts = lastCertificate.nib.split(".");
    if (parts.length === 5) {
      const lastSequence = parseInt(parts[4], 10);
      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }
  }

  const sequenceFormatted = nextSequence.toString().padStart(5, "0");

  return `${prefixNIB}.${sequenceFormatted}`;
};

export const getCertificates = async (
  person_id: string,
  page: number = 1,
  limit: number = 10,
  status?: string,
  search?: string,
  sortOrder: "asc" | "desc" = "desc",
  sortBy: "createdAt" | "label" = "createdAt",
) => {
  try {
    const skip = (page - 1) * limit;

    const where: any = {
      owners: {
        some: {
          person_id,
        },
      },
      ...(status && { status }),
      ...(search && {
        OR: [
          { nib: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
          { label: { contains: search, mode: "insensitive" } },
          {
            owners: {
              some: {
                person: {
                  name: { contains: search, mode: "insensitive" },
                },
              },
            },
          },
          {
            land: {
              OR: [
                {
                  province: { name: { contains: search, mode: "insensitive" } },
                },
                {
                  regency: { name: { contains: search, mode: "insensitive" } },
                },
                {
                  district: { name: { contains: search, mode: "insensitive" } },
                },
                {
                  village: { name: { contains: search, mode: "insensitive" } },
                },
              ],
            },
          },
        ],
      }),
    };

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          owners: {
            select: {
              person: {
                select: {
                  name: true,
                },
              },
            },
          },
          id: true,
          code: true,
          nib: true,
          type: true,
          status: true,
          label: true,
          createdAt: true,
          land: {
            select: {
              area_size: true,
              province: { select: { name: true } },
              regency: { select: { name: true } },
              district: { select: { name: true } },
              village: { select: { name: true } },
              rt: true,
              rw: true,
            },
          },
        },
      }),
      prisma.certificate.count({ where }),
    ]);

    const result = certificates.map((item: any) => ({
      id: item.id,
      owners: item.owners.map((owner: any) => owner.person.name),
      nib: item.nib,
      code: item.code,
      type: item.type,
      status: item.status,
      label: item.label,
      area_size: item.land.area_size,
      createdAt: item.createdAt,
      address: {
        province: item.land.province.name,
        regency: item.land.regency.name,
        district: item.land.district.name,
        village: item.land.village.name,
        rt: item.land.rt,
        rw: item.land.rw,
      },
    }));

    return {
      data: result,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  } catch (err: any) {
    console.log(err);
    throw new AppError("Gagal mendapatkan sertifikat", 500, err.meta);
  }
};

export const getCertificateById = async (
  person_id: string,
  certificate_id: string,
) => {
  try {
    const data = await prisma.certificateOwner.findUnique({
      where: {
        certificate_id_person_id: {
          person_id,
          certificate_id,
        },
      },
      include: {
        person: {
          select: {
            name: true,
          },
        },
        certificate: {
          select: {
            id: true,
            code: true,
            nib: true,
            type: true,
            status: true,
            cid: true,
            label: true,
            token_id: true,
            owners: {
              select: {
                ownership_pct: true,
                person: {
                  select: { name: true },
                },
              },
            },
            createdAt: true,
            land: {
              select: {
                province: { select: { name: true } },
                regency: { select: { name: true } },
                district: { select: { name: true } },
                village: { select: { name: true } },
                rt: true,
                rw: true,
              },
            },
          },
        },
      },
    });

    if (!data) return null;

    const result = {
      id: data.certificate.id,
      code: data.certificate.code,
      nib: data.certificate.nib,
      type: data.certificate.type,
      status: data.certificate.status,
      cid: data.certificate.cid,
      createdAt: data.createdAt,
      label: data.certificate.label,
      token_id: data.certificate.token_id,

      owners: data.certificate.owners.map((owner: any) => ({
        name: owner.person?.name,
        ownership: owner.ownership_pct,
      })),

      address: {
        province: data.certificate.land.province.name,
        regency: data.certificate.land.regency.name,
        district: data.certificate.land.district.name,
        village: data.certificate.land.village.name,
        rt: data.certificate.land.rt,
        rw: data.certificate.land.rw,
      },
    };

    return result;
  } catch (err: any) {
    throw new AppError("Gagal mendapatkan sertifikat", 500, err.meta);
  }
};

// export const updatePaymentStatus = async (
//   application_id: string,
//   status: PaymentStatus,
// ) => {
//   try {
//     if (!application_id || !status) {
//       throw new AppError("application_id dan status wajib diisi", 400);
//     }

//     const paymentStatus = await prisma.certificate.update({
//       where: { application_id },
//       data: { payment_status: status },
//       select: {
//         payment_status: true,
//       },
//     });

//     return paymentStatus;
//   } catch (err: any) {
//     if (err instanceof AppError) {
//       throw err;
//     }
//     throw new AppError(
//       "Gagal memperbarui status pembayaran sertifikat",
//       500,
//       err.meta,
//     );
//   }
// };

export const verifyCertificate = async (tokenId: number) => {
  // ─── 1. Call smart contract isVerified ────────────────────────────────
  let isVerified: boolean;

  try {
    // const contract = getContract();
    // isVerified = await contract.isVerified(tokenId);

    isVerified = (await publicClient.readContract({
      ...contractConfig,
      functionName: "isVerified",
      args: [BigInt(tokenId)],
    } as any)) as boolean;
  } catch (error) {
    throw new AppError("Gagal melakukan verifikasi ke blockchain", 502);
  }

  if (!isVerified) {
    throw new AppError("Sertifikat tidak valid atau telah dicabut", 403);
  }

  // ─── 2. Ambil data sertifikat dari DB ──────────────────────────────────
  const certificate = await prisma.certificate.findFirst({
    where: { token_id: tokenId },
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
    throw new AppError("Data sertifikat tidak ditemukan", 404);
  }

  // ─── 3. Susun response ─────────────────────────────────────────────────
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

export const updateLabelCertificate = async (id: string, label: string) => {
  try {
    const certificate = await prisma.certificate.update({
      where: {
        id,
      },
      data: {
        label: label,
      },
    });

    return certificate;
  } catch (error: any) {
    throw new AppError("Update data sertifikat gagal", 500, error?.meta);
  }
};

export const generatePDF = async (html: string): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "domcontentloaded",
  });

  // Tunggu network idle secara terpisah — hasilnya setara dengan
  // waitUntil: "networkidle0" di setContent, tapi tipe-nya cocok.
  await page.waitForNetworkIdle({ idleTime: 500 });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "0px",
      right: "0px",
      bottom: "0px",
      left: "0px",
    },
  });

  await browser.close();

  return Buffer.from(pdfBuffer);
};

export const buildCertificatePDFForTesting = async ({
  code,
  nib,
  type,
  land,
  owners,
  notes = [],
  headOfficeName = "Kepala Kantor (Testing)",
  headOfficeNip = "000000000000000000",
}: BuildCertificatePDFForTestingParams): Promise<Buffer> => {
  const templatePath = path.join(__dirname, "../templates/certificate.html");
  const templateHtml = fs.readFileSync(templatePath, "utf-8");

  const cssPath = path.join(__dirname, "../templates/certificate.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  const htmlTemplate = templateHtml.replace(
    "</head>",
    `<style>${css}</style></head>`,
  );

  const garudaPath = path.join(__dirname, "../assets/lambang-pancasila.png");
  const garudaImage = imageToBase64(garudaPath);

  // Dummy QR — bukan tanda tangan asli headOffice.privateKey,
  // cukup untuk kebutuhan render visual saat testing.
  const qr_signature = await QRCode.toDataURL(
    JSON.stringify({ code, nib, note: "TESTING - no real signature" }),
  );
  const qr_doc = await QRCode.toDataURL(
    `${process.env.FE_URL}/verify/certificate/TEST-${code}`,
  );

  const template = handlebars.compile(htmlTemplate);

  const certificateType: { label: string; value: string }[] = [
    { label: "Hak Milik", value: "SHM" },
    { label: "Hak Guna Usaha", value: "SHGU" },
    { label: "Hak Guna Bangunan", value: "SHGB" },
  ];
  const selectedCertificateType = certificateType.find(
    (item) => item.value === type,
  );

  const ownersData = owners.map((owner: any, index: number) => ({
    no: index + 1,
    id: owner.person.id,
    name: owner.person.name,
    birthPlace: owner.person.birthPlace,
    birthDate: formatDateIndonesia(owner.person.birthDate),
    share: owner.ownership_pct ?? owner.share,
  }));

  const noteList = notes.map((n: string, index: number) => ({
    no: index + 1,
    note: n,
  }));

  const html = template({
    garuda_path: garudaImage,
    code,
    type: selectedCertificateType?.label ?? "-",
    area_size: land.area_size,
    owners: ownersData,
    street_address: land.street_address,
    ward: toCapitalize(land.village.name),
    subdistrict: toCapitalize(land.district.name),
    regency: toCapitalize(land.regency.name),
    province: toCapitalize(land.province.name),
    nama_kepala_kantor: headOfficeName,
    nip: headOfficeNip,
    nama_kabupaten: toCapitalize(land.regency.name),
    nib,
    notes: noteList,
    qr_ttd: qr_signature,
    qr_doc,
  });

  return generatePDF(html);
};
