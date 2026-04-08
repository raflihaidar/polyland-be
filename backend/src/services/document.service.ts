import { prisma } from "../config/prisma";
import handlebars from "handlebars";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { imageToBase64 } from "../utils/parse";
import { publishCertificate } from "./certificate.service";
import { CertificateStatus } from "../generated/prisma/enums";
import QRCode from "qrcode";
import CryptoJS from "crypto-js";
import { AppError } from "../utils/error";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateUniqueCode = (length = 6): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  const randomSeed =
    Date.now().toString() + Math.random().toString();

  const hash = CryptoJS.SHA256(randomSeed).toString();

  let result = "";

  for (let i = 0; i < length; i++) {
    const index =
      parseInt(hash.substring(i * 2, i * 2 + 2), 16) %
      chars.length;

    result += chars[index];
  }

  return result;
};

export const generateQRDoc = async (txHash: string) => {

  const url =
    `${process.env.APP_URL}/verify/document/${txHash}`;

  const qrBase64 = await QRCode.toDataURL(url);

  return qrBase64;
};

export const generateNIB = async (
  provinceCode: number,
  regencyCode: number,
  indeksLetak: number
) => {
  if (indeksLetak < 0 || indeksLetak > 9) {
    throw new Error("Indeks letak harus antara 0 - 9");
  }

  // ambil nomor urut terakhir di wilayah tersebut
  const lastLand = await prisma.land.findFirst({
    where: {
      province_code: provinceCode,
      regency_code: regencyCode,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      certificates: {
        select: {
          nib: true
        }
      }
    },
  });

  let nextSequence = 1;

  lastLand?.certificates.forEach((item) => {
    if (item.nib) {
      const lastSequence = item.nib.slice(4, 13); // ambil 9 digit tengah
      nextSequence = parseInt(lastSequence) + 1;
    }
  })

  const sequenceFormatted = nextSequence
    .toString()
    .padStart(9, "0");

  let formatedRegencyCode = regencyCode % 100

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
  txHash: string,
  existingNIB : boolean
) => {

  const templatePath = path.join(
    __dirname,
    "../templates/certificate.html"
  );

  const templateHtml = fs.readFileSync(
    templatePath,
    "utf-8"
  );

  const cssPath = path.join(
    __dirname,
    "../templates/certificate.css"
  );

  const css = fs.readFileSync(cssPath, "utf-8");

  const htmlTemplate = templateHtml.replace(
    "</head>",
    `<style>${css}</style></head>`
  )

  const garudaPath = path.join(
    __dirname,
    "../assets/lambang-pancasila.png"
  );

  const garudaImage = imageToBase64(garudaPath);

  const code = generateUniqueCode(6);
  let nib;
  if(!existingNIB){
    nib = await generateNIB(application?.land?.province_code, application?.land?.regency_code, 1);
  }else{
    nib = existingNIB
  }

  const qr_doc = await generateQRDoc(txHash);

  return {
    htmlTemplate,
    garudaImage,
    code,
    nib,
    qr_doc,
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

export const generateCertificate = async (fileNumber: string, txHash: string) => {


  const application = await prisma.application.findUnique({
    where: { file_number: fileNumber },
    include: {
      land: true,
      person: true,
      landOffice: true,
      certificate : true
    },
  });

  if (!application) {
    throw new Error("Application tidak ditemukan");
  }

  if(application.certificate){
    throw new AppError("Sertifikat sudah pernah diterbitkan untuk permohonan ini", 400);
  }

  const { htmlTemplate, garudaImage, code, nib, qr_doc } = await buildCertificateAssets(application, txHash)

  const template = handlebars.compile(htmlTemplate);

  const certificateType = [
    { label: "Hak Milik", value: "SHM" },
    { label: "Hak Guna Usaha", value: "SHGU" },
    { label: "Hak Guna Bangunan", value: "SHGB" },
  ];

  const selectedCertificateType = certificateType.find(
    item => item.value === application.type
  );

  const qr_ttd = "";

  try {
    await publishCertificate({
      nib,
      code,
      hash: txHash,
      land_id: application.land_id,
      owner_id: application.person_id,
      status: CertificateStatus.AKTIF,
      type: application.type,
      application_id : application.id
    })

    const html = template({
      garuda_path: garudaImage,
      code,
      type: selectedCertificateType?.label ?? "-",
      area_size: application.land.area_size,
      owner: application.person.name,
      birth_date: application.person.birthDate,
      street_address: application.land.street_address,
      ward: application.land.ward,
      subdistrict: application.land.subdistrict,
      regency: application.land.regency,
      province: application.land.province,
      nama_kepala_kantor:
        application.landOffice.head_office,
      nip: application.landOffice.nip,
      nama_kabupaten:
        application.land.regency,
      nib,
      catatan_list: application.notes ?? "-",
      qr_ttd,
      qr_doc,
    });

    const pdfBuffer = await generatePDF(html);

    const uploadDir = path.join(__dirname, "..", "uploads", "certificate");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(
      uploadDir,
      `${application.file_number}.pdf`
    );

    fs.writeFileSync(filePath, pdfBuffer);

    return pdfBuffer;
  } catch (error) {
    console.log(error)
    throw new AppError(`Terjadi kesalahan pada saat generate certificate dengan code ${code}`, 400);
  }
};