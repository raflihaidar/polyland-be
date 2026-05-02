import { prisma } from "../config/prisma";
import { CertificateCreate } from "../types/domain/certificate.type";
import handlebars from "handlebars";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  decimalToFraction,
  formatDateIndonesia,
  imageToBase64,
} from "../utils/parse";
import {
  CertificateStatus,
  MintingStatus,
  PaymentStatus,
} from "../generated/prisma/enums";
import { parseEventLogs } from "viem";
import QRCode from "qrcode";
import crypto from "crypto";
import CryptoJS from "crypto-js";
import { AppError } from "../utils/error";
import { findHeadOfficeByLandOffice } from "./officer.service";
import { toCapitalize } from "../utils/parse";
import { encrypt } from "eciesjs";
import { uploadFile } from "./pinata.service";
import { walletClient, publicClient, contractConfig } from "../config/wallet";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const encryptFile = (buffer: Buffer) => {
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

  const authTag = cipher.getAuthTag();

  return {
    encryptedBuffer: encrypted,
    aesKey,
    iv,
    authTag,
  };
};

const encryptAESKey = (
  aesKey: Uint8Array,
  userPublicKeyHex: string,
): { encryptedKey: string } => {
  const publicKeyBuffer = Buffer.from(userPublicKeyHex, "hex");

  // 2. Proses Enkripsi ECIES
  // eciesjs melakukan: KEM (Key Encapsulation) + AES-GCM secara otomatis
  const encryptedBuffer = encrypt(publicKeyBuffer, Buffer.from(aesKey));

  // 3. Kembalikan hasil dalam format Base64 (atau Hex) untuk disimpan
  return {
    encryptedKey: Buffer.from(encryptedBuffer).toString("base64"),
  };
};

export const createCertificate = async (payload: CertificateCreate) => {
  try {
    const {
      code,
      old_code,
      nib,
      land_id,
      application_id,
      cid,
      type,
      hash,
      notes,
      owners,
    } = payload;
    const result = await prisma.$transaction(async (tx) => {
      await tx.certificate.update({
        where: {
          code: old_code,
        },
        data: {
          status: CertificateStatus.TIDAK_AKTIF,
        },
      });

      const certificate = await tx.certificate.upsert({
        where: {
          application_id,
        },
        update: {},
        create: {
          code,
          nib,
          land_id,
          application_id,
          hash,
          cid,
          type,
          notes: {
            createMany: {
              data: notes.map((note: string) => ({
                note,
              })),
            },
          },
        },
      });

      await tx.certificateOwner.createMany({
        data: owners.map((o: any) => ({
          certificate_id: certificate.id,
          person_id: o.id,
          ownership_pct: o.share,
        })),
        skipDuplicates: true,
      });

      return certificate;
    });
    return result;
  } catch (error) {
    console.log("error : ", error);
    new AppError("Gagal melakukan publish");
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

export const generateQRDoc = async (docHash: string) => {
  const url = `${process.env.APP_URL}/verify/${docHash}`;

  try {
    const qrBase64 = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      margin: 2,
      scale: 4,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
    return qrBase64;
  } catch (err) {
    console.error("Gagal generate QR:", err);
    throw err;
  }
};

export const generateQRSignature = async (
  payload: string,
  encryptedPrivateKey: string,
) => {
  const decryptedPrivateKey = CryptoJS.AES.decrypt(
    encryptedPrivateKey,
    process.env.KEY_SECRET as string,
  ).toString(CryptoJS.enc.Utf8);

  const signature = crypto.sign(
    null,
    Buffer.from(payload),
    decryptedPrivateKey,
  );

  const data = {
    ...JSON.parse(payload),
    timestamp: new Date().toISOString(),
    signature: signature.toString("base64"),
  };

  const qrCode = await QRCode.toDataURL(JSON.stringify(data));

  return qrCode;
};

export const generateNIB = async (
  provinceCode: number,
  regencyCode: number,
  indeksLetak: number,
) => {
  if (indeksLetak < 0 || indeksLetak > 9) {
    throw new Error("Indeks letak harus antara 0 - 9");
  }

  const lastCertificate = await prisma.certificate.findFirst({
    where: {
      land: {
        province_code: provinceCode,
        regency_code: regencyCode,
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
    const lastSequence = lastCertificate.nib.slice(6, 15);
    nextSequence = parseInt(lastSequence) + 1;
  }

  const sequenceFormatted = nextSequence.toString().padStart(9, "0");

  const formatedRegencyCode = regencyCode % 100;

  const nib =
    provinceCode.toString().padStart(2, "0") +
    "." +
    formatedRegencyCode.toString().padStart(2, "0") +
    "." +
    sequenceFormatted +
    "." +
    indeksLetak.toString();

  return nib;
};

export const buildCertificateAssets = async (
  application: any,
  headOffice: any,
  hasExistingCert: any,
) => {
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

  let code;
  if (!hasExistingCert) {
    code = generateUniqueCode(6);
  } else {
    code = hasExistingCert?.code;
  }

  let nib;
  if (!application.nib) {
    nib = await generateNIB(
      application?.land?.province_code,
      application?.land?.regency_code,
      1,
    );
  } else {
    nib = application.nib;
  }

  const payload = JSON.stringify({
    code,
    nib,
    owner: application.person.name,
  });

  const qr_signature = await generateQRSignature(
    payload,
    headOffice.privateKey,
  );

  return {
    htmlTemplate,
    garudaImage,
    code,
    nib,
    qr_signature,
  };
};

export const generatePDF = async (html: string) => {
  const browser = await puppeteer.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle0",
  });

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

  return pdfBuffer;
};

export const generateCertificate = async (
  fileNumber: string,
  notes: string[],
) => {
  const application = await prisma.application.findUnique({
    where: { file_number: fileNumber },
    include: {
      land: {
        include: {
          province: true,
          regency: true,
          district: true,
          village: true,
        },
      },
      landOffice: true,
      certificate: true,
      person: true,
      owners: {
        include: {
          person: true,
        },
      },
    },
  });

  if (!application) {
    throw new Error("Application tidak ditemukan");
  }

  const hasExistingCert = application.certificate;

  const headOffice = await findHeadOfficeByLandOffice(
    application.land_office_id,
  );

  const { htmlTemplate, garudaImage, code, nib, qr_signature } =
    await buildCertificateAssets(application, headOffice, hasExistingCert);

  const template = handlebars.compile(htmlTemplate);

  const certificateType = [
    { label: "Hak Milik", value: "SHM" },
    { label: "Hak Guna Usaha", value: "SHGU" },
    { label: "Hak Guna Bangunan", value: "SHGB" },
  ];

  const selectedCertificateType = certificateType.find(
    (item) => item.value === application.type,
  );

  const owners = application.owners.map((owner, index) => ({
    no: index + 1,
    id: owner.person.id,
    name: owner.person.name,
    birthPlace: owner.person.birthPlace,
    birthDate: formatDateIndonesia(owner.person.birthDate!),
    share: decimalToFraction(Number(owner.share)),
  }));

  const noteList = notes.map((n, index) => ({
    no: index + 1,
    note: n,
  }));

  try {
    const html = template({
      garuda_path: garudaImage,
      code,
      type: selectedCertificateType?.label ?? "-",
      area_size: application.land.area_size,
      owners,
      street_address: application.land.street_address,
      ward: toCapitalize(application.land.village.name),
      subdistrict: toCapitalize(application.land.district.name),
      regency: toCapitalize(application.land.regency.name),
      province: toCapitalize(application.land.province.name),
      nama_kepala_kantor: headOffice.name,
      nip: headOffice.nip,
      nama_kabupaten: toCapitalize(application.land.regency.name),
      nib,
      notes: noteList,
      qr_ttd: qr_signature,
    });

    const pdfBuffer = await generatePDF(html);

    const { encryptedBuffer, aesKey, iv, authTag } = encryptFile(
      Buffer.from(pdfBuffer),
    );

    const encryptedKeysForOwners = application.owners.map((owner) => {
      const userPubKey = owner.person.publicKey;

      if (!userPubKey) {
        throw new Error(
          `Owner ${owner.person.name} belum melakukan registrasi kunci publik.`,
        );
      }

      // Memanggil fungsi yang kita buat sebelumnya
      const wrapped = encryptAESKey(
        aesKey, // Kunci AES mentah
        userPubKey, // Public Key user (Base64)
      );

      return {
        walletAddress: owner.person.wallet_address,
        encryptedKey: wrapped.encryptedKey,
      };
    });

    aesKey.fill(0);

    const metadata = {
      pdfName: `${code}.pdf`,
      recipients: encryptedKeysForOwners,
      aesMetadata: {
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
      },
    };

    const uploadRes = await uploadFile(
      encryptedBuffer,
      `${code}.pdf`,
      metadata,
    );

    const documentHash = crypto
      .createHash("sha256")
      .update(pdfBuffer)
      .digest("hex");

    const certificate = await createCertificate({
      old_code: application.cert_code,
      nib,
      hash: documentHash,
      code,
      land_id: application.land_id,
      status: CertificateStatus.AKTIF,
      type: application.type,
      application_id: application.id,
      notes,
      owners,
      cid: uploadRes?.cid || null,
    });

    if (certificate) {
      await mintingNft(
        certificate.id,
        application.person.wallet_address!,
        certificate.cid!,
      );
    }

    return pdfBuffer;
  } catch (error) {
    console.log(error);
    throw new AppError(
      `Terjadi kesalahan pada saat generate certificate dengan code ${code}`,
      400,
    );
  }
};

export const getCertificates = async (person_id: string) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: {
        owners: {
          some: {
            person_id,
          },
        },
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
        land: {
          select: {
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
            rt: true,
            rw: true,
          },
        },
      },
    });

    let result = certificates.map((item) => {
      return {
        id: item.id,
        owners: item.owners.map((owner) => owner.person.name),
        nib: item.nib,
        code: item.code,
        type: item.type,
        status: item.status,
        address: {
          province: item.land.province.name,
          regency: item.land.regency.name,
          district: item.land.district.name,
          village: item.land.village.name,
          rt: item.land.rt,
          rw: item.land.rw,
        },
      };
    });

    return result;
  } catch (err: any) {
    new AppError("Gagal mendapatkan sertifikat", 500, err.meta);
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
            owners: {
              select: {
                ownership_pct: true,
                person: {
                  select: { name: true },
                },
              },
            },
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

      owners: data.certificate.owners.map((owner) => ({
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

export const updatePaymentStatus = async (
  application_id: string,
  status: PaymentStatus,
) => {
  try {
    if (!application_id || !status) {
      throw new AppError("application_id dan status wajib diisi", 400);
    }

    const paymentStatus = await prisma.certificate.update({
      where: { application_id },
      data: { payment_status: status },
      select: {
        payment_status: true,
      },
    });

    return paymentStatus;
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(
      "Gagal memperbarui status pembayaran sertifikat",
      500,
      err.meta,
    );
  }
};

export const mintingNft = async (
  certificate_id: string,
  userAddress: string,
  cid: string,
) => {
  try {
    await prisma.certificate.update({
      where: { id: certificate_id },
      data: { minting_status: MintingStatus.PROCESSING },
    });

    const hash = await walletClient.writeContract({
      ...contractConfig,
      functionName: "mintCertificate",
      args: [userAddress, cid],
    });

    await prisma.certificate.update({
      where: { id: certificate_id },
      data: { tx_hash: hash },
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const logs = parseEventLogs({
      abi: contractConfig.abi,
      eventName: "CertificateMinted",
      logs: receipt.logs,
    });

    if (logs.length === 0)
      throw new Error("Event CertificateMinted tidak ditemukan");

    const tokenId = (logs[0] as any).args.tokenId.toString();

    await prisma.certificate.update({
      where: { id: certificate_id },
      data: {
        minting_status: MintingStatus.SUCCESS,
        token_id: tokenId,
      },
    });
  } catch (err: any) {
    console.log(err);
    await prisma.certificate.update({
      where: { id: certificate_id },
      data: { minting_status: MintingStatus.FAILED },
    });
    throw new AppError("Proses Minting NFT Gagal", 500, err.meta);
  }
};

export const verifyCertificate = async (tokenId: string) => {
  try {
    const id = Number(tokenId);

    const isVerifiedOnChain = await publicClient.readContract({
      ...contractConfig,
      functionName: "isVerified",
      args: [id],
    });

    if (!isVerifiedOnChain) {
      return {
        isVerified: false,
        message:
          "Dokumen tidak valid di Blockchain (Mungkin tidak ada atau sudah dicabut/revoked).",
      };
    }

    const cid = await publicClient.readContract({
      ...contractConfig,
      functionName: "_certificateCID",
      args: [id],
    });

    const certificateData = await prisma.certificate.findUnique({
      where: { token_id: id },
      include: {
        owners: {
          include: {
            person: true,
          },
        },
      },
    });

    if (!certificateData) {
      return {
        isVerified: false,
        message:
          "Aset ditemukan di blockchain, namun tidak terdaftar di database resmi BPN.",
      };
    }

    const owners = certificateData.owners.map((owner, index) => ({
      no: index + 1,
      name: owner.person.name,
      share: decimalToFraction(Number(owner.ownership_pct)),
    }));

    let ipfsAvailable = true;
    try {
      const res = await fetch(`https://ipfs.io/ipfs/${cid}`);

      if (!res.ok) ipfsAvailable = false;
    } catch {
      ipfsAvailable = false;
    }

    return {
      isVerified: isVerifiedOnChain,
      status: ipfsAvailable ? "VALID" : "VALID_BUT_IPFS_UNAVAILABLE",
      data: {
        nib: certificateData.nib,
        code: certificateData.code,
        tokenId: certificateData.token_id,
        status: certificateData.status,
        txHash: certificateData.tx_hash,
        owners,
        createdAt: certificateData.createdAt,
        verifiedAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.error("Verification Error:", err);
    return {
      isVerified: false,
      message: "Gagal memverifikasi dokumen. Token ID mungkin tidak terdaftar.",
    };
  }
};
