import { prisma } from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../utils/error.js";
import {
  ApplicationCreate,
  ApplicationUpdate,
} from "../types/domain/ownershipTransfer.type.js";
import {
  ApplicationStatus,
  CertificateType,
  PaymentStatus,
} from "../generated/prisma/enums.js";
import * as fileCounterService from "./fileCounter.service.js";
import * as landService from "./land.service.js";
import * as AppDocumentService from "./applicationDocument.service.js";
import { addCertificateJob } from "../jobs/certificate.jobs.js";
import fs from "fs";
import { mapPaymentStatus, serializeBigInt } from "../utils/parse.js";
import { moveTempFolder } from "../utils/file.js";
import path from "path";
import { createPayment, isValidNotification } from "./payment.service.js";
import { MidtransNotification } from "../types/domain/payment.type.js";
import { tryCatch } from "bullmq";

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
      where: { id },
      include: {
        document: {
          where: { person_id: null },
        },
        land: {
          select: {
            id: true,
            area_size: true,
            street_address: true,
            rt: true,
            rw: true,
            province: { select: { name: true } },
            regency: { select: { name: true } },
            district: { select: { name: true } },
            village: { select: { name: true } },
          },
        },
        landOffice: {
          select: { name: true },
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
                  where: { application_id: id },
                },
              },
            },
            share: true,
          },
        },
      },
    });

    if (!application) {
      throw new AppError("Permohonan tidak ditemukan", 200);
    }

    const payment = await prisma.applicationPayment.findFirst({
      where: {
        application_id: application.id,
        status: "PENDING",
      },
      select: {
        amount: true,
      },
    });

    return serializeBigInt({
      ...application,
      pending_payment_amount: payment?.amount ?? null,
      owners: application.owners.map((o: any) => {
        const { documentIdentity, ...person } = o.person;

        return {
          ...o,
          person: {
            ...person,
            document: documentIdentity,
          },
        };
      }),
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Terjadi kesalahan saat mendapatkan data permohonan",
      500,
      error,
    );
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
    const result = await prisma.$transaction(async (tx: any) => {
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
          certificate: {
            connect: {
              code: data.cert_code,
            },
          },
          file_number,
          land_price_per_m2: landOffice.price.price_per_m2,
          registration_fee: landOffice.price.registration_fee,
          nib: data.nib,
          type: data.cert_type,
          total_fee: finalTotalFee,
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
    throw new AppError("Gagal submit application", 500);
  }
};

export const updateApplicationStatus = async (
  fileNumber: string,
  status: ApplicationStatus,
  note?: string,
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const application = await tx.application.findUnique({
        where: { file_number: fileNumber },
        select: {
          id: true,
          file_number: true,
          total_fee: true,
          status: true,
        },
      });

      if (!application) {
        throw new AppError("Permohonan tidak ditemukan", 404);
      }

      let paymentData: any = null;

      if (status === ApplicationStatus.MENUNGGU_PEMBAYARAN) {
        paymentData = await createPayment(Number(application.total_fee));

        if (!paymentData) {
          throw new AppError("Pembayaran gagal dibuat", 400);
        }
      }

      if (paymentData) {
        await tx.applicationPayment.create({
          data: {
            application_id: application.id,
            order_id: paymentData.order_id,
            qr_url: paymentData.qr_url,
            status: mapPaymentStatus(paymentData.status),
            amount: Number(paymentData.amount),
          },
        });
      }

      const updated = await tx.application.update({
        where: { file_number: fileNumber },
        data: {
          status,
          notes: note ?? null,
        },
      });

      return serializeBigInt({
        updated,
      });
    });
  } catch (error) {
    console.log("error :", error);

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Gagal memproses permohonan", 500);
  }
};

export const updateApplication = async (
  applicationId: string,
  data: Partial<ApplicationUpdate>,
  tempFolder: string,
) => {
  const filesToDelete: string[] = [];

  const result = await prisma.$transaction(async (tx: any) => {
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

export const enqueueCertificateGeneration = async (
  applicationId: string,
  notes: string[],
) => {
  try {
    const isSuccess = await prisma.application.update({
      where: {
        id: applicationId,
      },
      data: {
        status: "PROSES_PENERBITAN",
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
      const job = await addCertificateJob(jobPayloads);
      return { jobId: job.id };
    }
  } catch (error: any) {
    throw new AppError(
      "Terjadi kesalahan saat memproses permohonan penerbitan sertifikat. Silakan coba kembali.",
      500,
      error?.meta,
    );
  }
};

export const getApplicationPayment = async (id: string) => {
  try {
    let application = await prisma.application.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        createdAt: true,
        owners: {
          select: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
        landOffice: {
          select: {
            name: true,
            address: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!application) {
      return new AppError("permohonan tidak ditemukan", 200);
    }

    return serializeBigInt({
      application,
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Terjadi kesalahan saat mengambil data permohonan", 500);
  }
};

export const getMidtransNotification = async (
  notification: MidtransNotification,
) => {
  try {
    if (!notification) {
      throw new AppError("Tidak ada notifikasi yang dikirimkan", 400);
    }

    const { transaction_status, order_id } =
      await isValidNotification(notification);

    if (transaction_status === "settlement") {
      console.log(`Transaksi ${order_id} BERHASIL dibayar.`);
      await prisma.$transaction(async (tx) => {
        const paymentApp = await tx.applicationPayment.update({
          where: {
            order_id,
          },
          data: {
            status: "SUCCESS",
            paidAt: new Date(),
          },
          select: {
            application_id: true,
          },
        });

        await tx.application.update({
          where: {
            id: paymentApp.application_id,
          },
          data: {
            status: "VERIFIKASI_PEMBAYARAN",
            updatedAt: new Date(),
          },
        });
      });
    } else if (["refund", "expire"].includes(transaction_status)) {
      console.log(`Transaksi ${order_id} GAGAL/BATAL.`);
      let paymentStatus: PaymentStatus;
      if (transaction_status === "expire") {
        paymentStatus = "EXPIRED";
      } else if (transaction_status === "refund") {
        paymentStatus = "REFUND";
      } else {
        paymentStatus = "EXPIRED";
      }

      await prisma.$transaction(async (tx) => {
        const paymentApp = await tx.applicationPayment.update({
          where: {
            order_id,
          },
          data: {
            status: paymentStatus,
          },
          select: {
            application_id: true,
          },
        });

        await tx.application.update({
          where: {
            id: paymentApp.application_id,
          },
          data: {
            status:
              paymentStatus === "EXPIRED"
                ? "PEMBAYARAN_KADALUARSA"
                : paymentStatus === "REFUND"
                  ? "PEMBAYARAN_DIKEMBALIKAN"
                  : "TERJADI_KESALAHAN",
            updatedAt: new Date(),
          },
        });
      });
    }
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Terjadi kesalahan saat mengirim notifikasi",
      500,
      error,
    );
  }
};
