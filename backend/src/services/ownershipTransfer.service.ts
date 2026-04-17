import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import { AppError } from "../utils/error";
import { ApplicationCreate } from "../types/domain/ownershipTransfer.type";
import { DocumentType, ApplicationStatus } from "../generated/prisma/enums";
import * as fileCounterService from "./fileCounter.service";
import * as landService from "./land.service";
import * as AppDocumentService from "./applicationDocument.service";
import fs from "fs";
import { serializeBigInt } from "../utils/parse";
import { connect } from "http2";

export const getListApplication = async (
  land_office_id: string,
  page = 1,
  limit = 10,
  search?: string,
) => {
  try {
    if (!land_office_id) {
      throw new AppError("Kantor pertanahan tidak ditemukan", 500);
    }

    const skip = (page - 1) * limit;

    const where: Prisma.ApplicationWhereInput = {
      land_office_id,
      ...(search && {
        OR: [
          {
            file_number: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            land: {
              street_address: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            person: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.application.findMany({
        where,
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
          person: {
            select: {
              name: true,
              nik: true,
              phone: true,
              address: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.application.count({ where }),
    ]);

    return serializeBigInt({
      applications: data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    throw new AppError("Gagal mengambil data list permohonan", 500);
  }
};

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
            name: true,
          },
        },
        person: {
          select: {
            name: true,
            nik: true,
            phone: true,
            address: true,
          },
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
  currentUserId: string,
) => {
  try {
    const application = await prisma.application.findFirst({
      where: search
        ? {
            file_number: search,
          }
        : {},
      include: {
        officer: {
          select: {
            name: true,
          },
        },
        person: {
          select: {
            id: true,
            name: true,
          },
        },
        land: {
          select: {
            area_size: true,
          },
        },
        landOffice: {
          select: {
            name: true,
            code: true,
            address: true,
            email: true,
            phone: true,
          },
        },
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

export const submitApplication = async (data: ApplicationCreate) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear().toString().slice(-2);

      const lastNumber = await fileCounterService.increment(tx);

      const land = await landService.findById(tx, data.land_id);

      const landOffice = await tx.landOffice.findFirst({
        where: { id: data.land_office_id },
        include: { price: true },
      });

      if (!landOffice?.price) {
        throw new AppError("Harga tanah kantor belum diatur", 400);
      }

      if (!land) {
        throw new AppError("Data tanah tidak ditemukan", 400);
      }

      if (!land.area_size) {
        throw new AppError("Data tanah tidak memiliki luas", 400);
      }

      const file_number = `${landOffice.code}/${data.cert_type}/${year}/${lastNumber}`;

      const areaSize = Number(land.area_size) || 0;
      const pricePerM2 = Number(landOffice.price.price_per_m2) || 0;
      const registrationFee = Number(landOffice.price.registration_fee) || 0;

      const landValue = areaSize * pricePerM2;
      const adminFee = landValue / 1000;
      const totalFeeCalculated = adminFee + registrationFee;

      const finalTotalFee = isNaN(totalFeeCalculated)
        ? 0
        : Math.round(totalFeeCalculated);

      const application = await tx.application.create({
        data: {
          person: {
            connect: { id: data.person_id },
          },
          land: {
            connect: { id: data.land_id },
          },
          landOffice: {
            connect: { id: data.land_office_id },
          },
          file_number,
          land_price_per_m2: landOffice.price.price_per_m2,
          registration_fee: landOffice.price.registration_fee,
          total_fee: BigInt(finalTotalFee),
          nib: data.nib,
          type: data.cert_type,
        },
      });

      const documents = AppDocumentService.mapApplicationDocuments(
        application.id,
        data,
      );

      await tx.applicationDocument.createMany({
        data: documents,
      });

      await tx.applicationOwner.createMany({
        data: data.owners.map((owner) => ({
          application_id: application.id,
          person_id: owner.person_id,
          sharePercent: Number(owner.sharePercent) ?? null,
        })),
      });

      return {
        ...application,
        total_fee: Number(application.total_fee),
      };
    });
  } catch (error) {
    console.log("error : ", error);
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
  fileNumber: string,
  status: ApplicationStatus,
  note?: string,
) => {
  try {
    const application = await prisma.application.findUnique({
      where: { file_number: fileNumber },
    });

    if (!application) {
      throw new AppError("Permohonan tidak ditemukan", 404);
    }

    if (application.status === status) {
      throw new AppError("Permohonan sedang diproses", 400);
    }

    const updated = await prisma.application.update({
      where: { file_number: fileNumber },
      data: {
        status,
        notes: note ?? null,
      },
    });

    return {
      ...updated,
      total_fee: Number(updated.total_fee),
    };
  } catch (error) {
    console.log("error : ", error);
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

export const paymentVerification = async () => {};
