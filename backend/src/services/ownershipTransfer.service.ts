import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import { AppError } from "../utils/error";
import {
  ApplicationCreate,
  ApplicationUpdate,
} from "../types/domain/ownershipTransfer.type";
import {
  DocumentType,
  ApplicationStatus,
  CertificateType,
} from "../generated/prisma/enums";
import * as fileCounterService from "./fileCounter.service";
import * as landService from "./land.service";
import * as AppDocumentService from "./applicationDocument.service";
// import { generateCertificate } from "./certificate.service";
import { addCertificateJob } from "../jobs/certificate.jobs";
import fs from "fs";
import { serializeBigInt } from "../utils/parse";
import { moveTempFolder } from "../utils/file";
import path from "path";

export const getListApplication = async (
  land_office_id: string,
  page = 1,
  limit = 10,
  search?: string,
  status?: string,
  type?: string,
  date?: string,
) => {
  try {
    if (!land_office_id) {
      throw new AppError("Kantor pertanahan tidak ditemukan", 500);
    }

    const skip = (page - 1) * limit;

    const where: Prisma.ApplicationWhereInput = {
      land_office_id,
      ...(status && { status: status as ApplicationStatus }),
      ...(type && { type: type as CertificateType }),
      ...(date && {
        createdAt: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        },
      }),
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
          document: true,
          land: {
            select: {
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
    console.log(error);
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
        // applicationDocuments: true,
        document: {
          where: {
            person_id: null,
          },
        },
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
        landOffice: {
          select: {
            name: true,
          },
        },
        owners: {
          select: {
            person: {
              select: {
                id: true,
                name: true,
                nik: true,
                email: true,
                phone: true,
                documentIdentity: {
                  where: {
                    application_id: id,
                  },
                },
              },
            },
            share: true,
          },
        },
      },
    });

    if (!application) return null;

    return {
      ...application,
      total_fee: Number(application.total_fee),
      owners: application?.owners.map((o) => {
        const { documentIdentity, ...person } = o.person;

        return {
          ...o,
          person: {
            ...person,
            document: documentIdentity,
          },
        };
      }),
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

export const submitApplication = async (
  data: ApplicationCreate,
  tempFolder: string,
) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
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

      // Owner pertama = pemohon
      const applicant = data.owners[0];

      if (!applicant.person_id) {
        throw new AppError("Pemohon utama tidak valid", 400);
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
            connect: { id: applicant.person_id },
          },
          land: {
            connect: { id: data.land_id },
          },
          landOffice: {
            connect: { id: data.land_office_id },
          },
          officer: {
            connect: {
              id: data.officer_id,
            },
          },
          cert_code: data.cert_code,
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

      if (documents.length > 0) {
        await tx.applicationDocument.createMany({
          data: documents,
        });
      }

      await tx.applicationOwner.createMany({
        data: data.owners.map((owner) => ({
          application_id: application.id,
          person_id: owner.person_id,
          share: Number(owner.share) ?? null,
        })),
      });

      return application;
    });

    moveTempFolder(tempFolder, `applications/${result.id}`);
    return {
      ...result,
      total_fee: Number(result.total_fee),
    };
  } catch (error) {
    console.log(error);
    throw new AppError("Gagal submit application", 500);
  }
};

// const documentTypeMap: Record<string, string> = {
//   cert_file: "SERTIFIKAT_TANAH",
//   ktp_penjual: "KTP_PENJUAL",
//   kk_pembeli: "KK_PEMBELI",
//   ktp_pembeli: "KTP_PEMBELI",
//   akta_jual_beli: "AKTA_JUAL_BELI",
//   fc_sppt: "SPPT",
//   fc_pbb: "PBB",
//   ssb: "SSB",
// };

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

    // if (application.status === status) {
    //   throw new AppError("Permohonan sedang diproses", 400);
    // }

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
  data: Partial<ApplicationUpdate>,
  tempFolder: string,
) => {
  const filesToDelete: string[] = [];

  const result = await prisma.$transaction(async (tx) => {
    // ======================
    // CHECK APPLICATION
    // ======================

    const application = await tx.application.findUnique({
      where: {
        id: applicationId,
      },
    });

    if (!application) {
      throw new AppError("Permohonan tidak ditemukan", 404);
    }

    // ======================
    // UPDATE APPLICATION
    // ======================

    const updateData = Object.fromEntries(
      Object.entries({
        person_id: data.person_id,
        land_id: data.land_id,
        cert_code: data.cert_code,
        type: data.cert_type,
        nib: data.nib,
        officer_id: data.officer_id,
        land_office_id: data.land_office_id,
      }).filter(([_, value]) => value !== undefined),
    );

    await tx.application.update({
      where: {
        id: applicationId,
      },
      data: updateData,
    });

    // ======================
    // UPSERT OWNERS
    // ======================

    if ((data.owners ?? []).length > 0) {
      await Promise.all(
        (data.owners ?? []).map((owner) =>
          tx.applicationOwner.upsert({
            where: {
              application_id_person_id: {
                application_id: applicationId,
                person_id: owner.person_id,
              },
            },
            update: {
              share: owner.share,
            },
            create: {
              application_id: applicationId,
              person_id: owner.person_id,
              share: owner.share,
            },
          }),
        ),
      );
    }

    // ======================
    // MAP DOCUMENTS
    // ======================

    const documents = AppDocumentService.mapApplicationDocuments(
      applicationId,
      data,
    );

    // ======================
    // UPSERT DOCUMENTS
    // ======================

    if (documents.length > 0) {
      await Promise.all(
        documents.map(async (document) => {
          const existingDocument = await tx.applicationDocument.findFirst({
            where: {
              application_id: applicationId,
              person_id: document.person_id,
              type: document.type,
            },
          });

          // simpan file lama untuk dihapus
          if (existingDocument?.fileUrl) {
            filesToDelete.push(existingDocument.fileUrl);
          }

          await tx.applicationDocument.upsert({
            where: {
              application_id_person_id_type: {
                application_id: applicationId,
                person_id: document.person_id,
                type: document.type,
              },
            },
            update: {
              fileUrl: document.fileUrl,
              fileName: document.fileName,
              mimeType: document.mimeType,
              fileSize: document.fileSize,
            },
            create: {
              application_id: applicationId,
              person_id: document.person_id,
              type: document.type,
              fileName: document.fileName,
              fileUrl: document.fileUrl,
              mimeType: document.mimeType,
              fileSize: document.fileSize,
            },
          });
        }),
      );
    }

    moveTempFolder(tempFolder, `applications/${application.id}`);

    // ======================
    // GET FINAL RESULT
    // ======================

    const updatedApplication = await tx.application.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        owners: {
          include: {
            person: true,
          },
        },
        document: true,
      },
    });

    return updatedApplication;
  });

  // ======================
  // DELETE OLD FILES
  // ======================
  const uploadsBasePath = path.join(process.cwd(), "backend", "src", "uploads");

  for (const filePath of filesToDelete) {
    try {
      const absolutePath = path.join(uploadsBasePath, filePath);

      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (err) {
      console.error("Gagal hapus file lama:", filePath);
    }
  }

  // ======================
  // SERIALIZE BIGINT
  // ======================

  return JSON.parse(
    JSON.stringify(result, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
};

export const verifyPayment = async (applicationId: string, notes: string[]) => {
  try {
    console.log("test");
    const isSuccess = await prisma.application.update({
      where: {
        id: applicationId,
      },
      data: {
        status: "PENANDATANGANAN",
      },
      select: {
        file_number: true,
      },
    });

    const jobPayloads = {
      fileNumber: isSuccess.file_number,
      notes,
    };
    if (isSuccess) {
      console.log("kirim ke worker");
      const job = await addCertificateJob(jobPayloads);

      console.log("Job ID:", job.id); // ← cek ini muncul tidak
      console.log("Job Name:", job.name);

      return { jobId: job.id };
    }
  } catch (error: any) {
    throw new AppError(
      "Pembayaran Gagal, silahkan coba lagi",
      500,
      error?.meta,
    );
  }
};
