import { prisma } from "../config/prisma";
import { AppError } from "../utils/error";
import { ApplicationCreate } from "../types/domain/ownershipTransfer.type";
import { DocumentType, ApplicationStatus } from "../generated/prisma/enums";
import fs from "fs";

export const getApplication = async (id: string) => {
  try {
    const application = await prisma.application.findUnique({
      where: {
        id: id,
      },
      include: {
        applicationDocuments: true,
        land: {
          select: {
            street_address: true,
            rt: true,
            rw: true,
            ward: true,
            subdistrict: true,
            regency: true,
            province: true,
          },
        },
        landOffice: {
          select: {
            name: true
          }
        },
        person: {
          select: {
            name: true,
            nik: true,
            phone: true,
            address: true
          }
        },
      },
    });

    if (!application) return null;

    return {
      ...application,
      total_fee: Number(application.total_fee),
    };
  } catch (error) {
    throw error;
  }
};

export const searchApplication = async (
  search: string | undefined,
  currentUserId: string
) => {
  try {
    const application = await prisma.application.findFirst({
      where: search
        ? {
          file_number: search
        }
        : {},
      include: {
        officer: {
          select: {
            name: true
          }
        },
        person: {
          select: {
            id: true,
            name: true,
          },
        },
        land: {
          select: {
            area_size: true
          }
        },
        landOffice: {
          select: {
            name: true,
            code : true,
            address: true,
            email: true,
            phone: true
          }
        }
      },
    });

    if (!application) return null;

    const isOwner = application.person_id === currentUserId;

    return {
      ...application,
      total_fee: Number(application.total_fee),
      canPay:
        isOwner && application.status === ApplicationStatus.MENUNGGU_PEMBAYARAN,
    };
  } catch (error) {
    throw new AppError("Gagal mengambil data application", 500);
  }
};

export const submitApplication = async (
  data: ApplicationCreate,
) => {
  try {
    return await prisma.$transaction(async (tx) => {

      const year = new Date().getFullYear()

      let counter = await tx.fileCounter.findUnique({
        where: { id: 1 }
      })

      if (!counter) {
        counter = await tx.fileCounter.create({
          data: { id: 1, value: 0 }
        })
      }

      const updatedCounter = await tx.fileCounter.update({
        where: { id: 1 },
        data: { value: { increment: 1 } }
      })

      const formattedNumber = String(updatedCounter.value).padStart(3, "0")

      const file_number = `${data.cert_type}-${year}-${formattedNumber}`

      const land = await tx.land.create({
        data: {
          area_size: data.area_size,
          street_address: data.street_address ?? "",
          rt: data.rt ?? "",
          rw: data.rw ?? "",
          ward: data.ward ?? "",
          subdistrict: data.subdistrict ?? "",
          regency: data.regency ?? "",
          province: data.province ?? "",
        },
      });

      const price = await tx.landOfficePrice.findFirst({
        where: {
          land_office_id: data.land_office_id
        }
      });

      if (!price) {
        throw new AppError("Harga tanah kantor belum diatur", 400);
      }

      const landArea = Number(data.area_size);

      const landValue = price.price_per_m2 * landArea;

      const total_fee =
        landValue / 1000 + price.registration_fee;

      const application = await tx.application.create({
        data: {
          person_id: data.person_id,
          land_id: land.id,
          land_office_id: data.land_office_id,
          type: data.cert_type,
          file_number: file_number,
          land_price_per_m2: price.price_per_m2,
          registration_fee: price.registration_fee,
          total_fee: Math.round(total_fee)
        },
      });

      return {
        ...application,
        total_fee: Number(application.total_fee)
      };
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
  ssb: "SSB",
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

    return {
      ...updated,
      total_fee: Number(updated.total_fee)
    };
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
        area_size: data.area_size,
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
