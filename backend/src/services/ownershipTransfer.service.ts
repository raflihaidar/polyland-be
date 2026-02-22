import { prisma } from "../config/prisma";
import { AppError } from "../utils/error";
import { ApplicationCreate } from "../types/domain/ownershipTransfer.type";
import { DocumentType, ApplicationStatus } from "../generated/prisma/enums";
import fs from "fs";
import path from "path";

const baseUploadDir = path.join(process.cwd(), "backend", "src", "uploads");

export const submitApplication = async (
  data: ApplicationCreate,
  tempFolder: string,
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1️⃣ Create land
      const land = await tx.land.create({
        data: {
          street_address: data.street_address ?? "",
          rt: data.rt ?? "",
          rw: data.rw ?? "",
          ward: data.ward ?? "",
          subdistrict: data.subdistrict ?? "",
          regency: data.regency ?? "",
          province: data.province ?? "",
        },
      });

      // 2️⃣ Create application
      const application = await tx.application.create({
        data: {
          person_id: data.person_id,
          land_id: land.id,
          type: data.cert_type,
        },
      });

      // 3️⃣ Rename temp folder
      const tempPath = path.join(baseUploadDir, "temp", tempFolder);
      const finalPath = path.join(baseUploadDir, application.id);

      if (fs.existsSync(tempPath)) {
        fs.renameSync(tempPath, finalPath);
      }

      // 4️⃣ Map file → DocumentType
      const documents = [
        {
          file: data.cert_file,
          type: DocumentType.SERTIFIKAT_TANAH,
        },
        {
          file: data.ktp_penjual,
          type: DocumentType.KTP_PENJUAL,
        },
        {
          file: data.kk_pembeli,
          type: DocumentType.KK_PEMBELI,
        },
        {
          file: data.ktp_pembeli,
          type: DocumentType.KTP_PEMBELI,
        },
        {
          file: data.akta_jual_beli,
          type: DocumentType.AKTA_JUAL_BELI,
        },
        {
          file: data.fc_sppt,
          type: DocumentType.SPPT,
        },
        {
          file: data.fc_pbb,
          type: DocumentType.PBB,
        },
      ];

      await tx.applicationDocument.createMany({
        data: documents.map((doc) => ({
          application_id: application.id,
          type: doc.type,
          fileUrl: `uploads/${application.id}/${doc.file.filename}`,
          fileName: doc.file.filename,
          mimeType: doc.file.mimetype,
          fileSize: doc.file.size,
        })),
      });

      return application;
    });
  } catch (error) {
    throw new AppError("Gagal submit application", 500);
  }
};

const documentTypeMap: Record<string, string> = {
  cert_file: "CERT_FILE",
  ktp_penjual: "KTP_PENJUAL",
  kk_pembeli: "KK_PEMBELI",
  ktp_pembeli: "KTP_PEMBELI",
  akta_jual_beli: "AKTA_JUAL_BELI",
  fc_sppt: "FC_SPPT",
  fc_pbb: "FC_PBB",
};

export const updateApplicationStatus = async (
  applicationId: string,
  status: ApplicationStatus,
  note?: string,
) => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new AppError("Permohonan tidak ditemukan", 404);
    }

    if (application.status === status) {
      throw new AppError("Permohonan sedang diproses", 400);
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status,
        notes: note ?? null,
      },
    });

    return updated;
  } catch (error) {
    throw new AppError("Gagal memproses permohonan", 500);
  }
};

export const updateApplication = async (
  applicationId: string,
  data: Partial<ApplicationCreate>,
  files?: Record<string, Express.Multer.File[]>,
) => {
  const filesToDelete: string[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { id: applicationId },
      include: { applicationDocuments: true },
    });

    if (!application) {
      throw new AppError("Permohonan tidak ditemukan", 404);
    }

    if (application.status !== "DITOLAK") {
      throw new AppError(
        "Hanya permohonan dengan status DITOLAK yang dapat diperbarui",
        400,
      );
    }

    // =====================
    // UPDATE LAND
    // =====================
    await tx.land.update({
      where: { id: application.land_id },
      data: {
        street_address: data.street_address,
        rt: data.rt,
        rw: data.rw,
        ward: data.ward,
        subdistrict: data.subdistrict,
        regency: data.regency,
        province: data.province,
      },
    });

    // =====================
    // UPDATE DOCUMENT
    // =====================
    if (files && Object.keys(files).length > 0) {
      for (const field in files) {
        const newFile = files[field][0];
        console.log("path : ", newFile.path);
        const mappedType = documentTypeMap[field];

        if (!mappedType) continue;

        const existingDoc = application.applicationDocuments.find(
          (doc) => doc.type === mappedType,
        );

        if (existingDoc) {
          filesToDelete.push(existingDoc.fileUrl);

          await tx.applicationDocument.update({
            where: { id: existingDoc.id },
            data: {
              fileName: newFile.filename,
              fileUrl: `uploads/${application.id}/${newFile.filename}`,
              mimeType: newFile.mimetype,
              fileSize: newFile.size,
            },
          });
        } else {
          await tx.applicationDocument.create({
            data: {
              application_id: applicationId,
              type: mappedType as DocumentType,
              fileName: newFile.filename,
              fileUrl: `uploads/${application.id}/${newFile.filename}`,
              mimeType: newFile.mimetype,
              fileSize: newFile.size,
            },
          });
        }
      }
    }

    const updated = await tx.application.update({
      where: { id: applicationId },
      data: {
        type: data.cert_type,
      },
    });

    return updated;
  });

  for (const filePath of filesToDelete) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error("Gagal hapus file lama:", filePath);
    }
  }

  return result;
};
