import { prisma } from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../utils/error.js";
import {
  ApplicationCreate,
  ApplicationUpdate,
} from "../types/domain/ownershipTransfer.type.js";
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
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import {
  ApplicationStatus,
  CertificateType,
  CertificateStatus,
  MintingStatus,
  PaymentStatus,
} from "../generated/prisma/enums.js";
import {
  getForwarderNonce,
  verifyForwardRequest,
  type ForwardRequestData,
} from "./forwarder.service.js";
import { forwarderConfig, publicClient } from "../config/wallet.js";

dayjs.extend(utc);
dayjs.extend(timezone);

interface SignedForwardRequestInput {
  from: string;
  to: string;
  value: string;
  gas: string;
  deadline: number;
  data: string;
  signature: string;
}

const emptyToNull = (value?: string | null): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Pesan error yang ramah untuk setiap kolom unik di tabel Person */
const UNIQUE_FIELD_MESSAGES: Record<string, string> = {
  nik: "NIK sudah terdaftar untuk orang lain",
  name: "Nama sudah terdaftar untuk NIK lain",
  email: "Email sudah digunakan oleh orang lain",
  phone: "Nomor telepon sudah digunakan oleh orang lain",
  wallet_address: "Wallet address sudah digunakan",
  username: "Username sudah digunakan",
  nip: "NIP sudah digunakan",
};

const resolvePersonId = async (tx: any, row: any): Promise<string> => {
  if (row.mode === "search") {
    if (!row.person_id) {
      throw new AppError(
        "person_id tidak valid untuk data yang dipilih dari pencarian",
        400,
      );
    }
    return row.person_id;
  }

  if (!row.nik || !row.name) {
    throw new AppError("Nama dan NIK wajib diisi untuk data input manual", 400);
  }

  try {
    const person = await tx.person.upsert({
      where: { nik: row.nik },
      update: {
        name: row.name,
        phone: emptyToNull(row.phone),
        email: emptyToNull(row.email),
      },
      create: {
        nik: row.nik,
        name: row.name,
        phone: emptyToNull(row.phone),
        email: emptyToNull(row.email),
      },
    });

    console.log("person berhasil dibuat");

    console.log("person : ", person);

    return person.id;
  } catch (error) {
    console.log("error : ", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = error.meta?.target as string[] | string | undefined;
      const fields = Array.isArray(target) ? target : [target ?? ""];
      const field = fields.find((f) => f && UNIQUE_FIELD_MESSAGES[f]);
      const message = field
        ? UNIQUE_FIELD_MESSAGES[field]
        : `Data duplikat pada kolom: ${fields.join(", ")}`;
      throw new AppError(message, 400);
    }
    throw error;
  }
};

const attachPersonIds = (items: any[] | undefined, resolved: any[]) => {
  if (!items?.length) return items ?? [];
  return items.map((item, index) => {
    const resolvedPersonId = resolved[index]?.person_id;
    if (!resolvedPersonId) {
      throw new AppError(
        `Tidak ditemukan owner/seller pada index ${index} untuk mencocokkan dokumen`,
        400,
      );
    }
    return { ...item, person_id: resolvedPersonId };
  });
};

export const getDashboardSummary = async (land_office_id: string) => {
  try {
    if (!land_office_id) {
      throw new AppError("Kantor pertanahan tidak ditemukan", 400);
    }

    // Validasi land_office_id ada di database
    const landOffice = await prisma.landOffice.findUnique({
      where: { id: land_office_id },
      select: { id: true },
    });

    if (!landOffice) {
      throw new AppError("Kantor pertanahan tidak ditemukan", 404);
    }

    const startOfMonth = dayjs()
      .tz("Asia/Jakarta")
      .startOf("month")
      .utc()
      .toDate();
    const endOfMonth = dayjs().tz("Asia/Jakarta").endOf("month").utc().toDate();

    const [total, menungguVerifikasi, dalamProses, selesaiBulanIni] =
      await Promise.all([
        prisma.application.count({
          where: { land_office_id },
        }),
        prisma.application.count({
          where: {
            land_office_id,
            status: {
              in: [
                ApplicationStatus.VERIFIKASI_BERKAS,
                ApplicationStatus.VERIFIKASI_PEMBAYARAN,
              ],
            },
          },
        }),
        prisma.application.count({
          where: {
            land_office_id,
            status: {
              in: [
                ApplicationStatus.MENUNGGU_PEMBAYARAN,
                ApplicationStatus.PROSES_PENERBITAN,
              ],
            },
          },
        }),
        prisma.application.count({
          where: {
            land_office_id,
            status: ApplicationStatus.SELESAI,
            updatedAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        }),
      ]);

    return {
      total_permohonan: total,
      menunggu_verifikasi: menungguVerifikasi,
      dalam_proses: dalamProses,
      selesai_bulan_ini: selesaiBulanIni,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Gagal mengambil ringkasan dashboard", 500, error);
  }
};

export const getDistribusiStatusPermohonan = async (land_office_id: string) => {
  try {
    if (!land_office_id) {
      throw new AppError("Kantor pertanahan tidak ditemukan", 500);
    }

    const grouped = await prisma.application.groupBy({
      by: ["status"],
      where: { land_office_id },
      _count: {
        status: true,
      },
    });

    const allStatuses = Object.values(ApplicationStatus);

    const distribusi = allStatuses.map((status) => {
      const found = grouped.find((g: any) => g.status === status);

      return {
        status,
        jumlah: found ? found._count.status : 0,
      };
    });

    return { data: distribusi };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Gagal mengambil distribusi status permohonan",
      500,
      error,
    );
  }
};

export const getBlockchainSummary = async (land_office_id: string) => {
  try {
    if (!land_office_id) {
      throw new AppError("Kantor pertanahan tidak ditemukan", 400);
    }

    // Validasi land_office_id ada di database
    const landOffice = await prisma.landOffice.findUnique({
      where: { id: land_office_id },
      select: { id: true },
    });

    if (!landOffice) {
      throw new AppError("Kantor pertanahan tidak ditemukan", 404);
    }

    const [totalVerified, totalOnChain] = await Promise.all([
      prisma.certificate.count({
        where: {
          status: CertificateStatus.AKTIF,
          applications: {
            some: { land_office_id },
          },
        },
      }),
      prisma.certificate.count({
        where: {
          minting_status: MintingStatus.SUCCESS,
          applications: {
            some: { land_office_id },
          },
        },
      }),
    ]);

    return {
      total_verified: totalVerified,
      total_on_chain: totalOnChain,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Gagal mengambil ringkasan status blockchain",
      500,
      error,
    );
  }
};

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

    if (date) {
      const start = dayjs.tz(`${date} 00:00:00`, "Asia/Jakarta").utc().toDate();

      const end = dayjs
        .tz(`${date} 23:59:59.999`, "Asia/Jakarta")
        .utc()
        .toDate();

      where.createdAt = {
        gte: start,
        lte: end,
      };
    }

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
                wallet_address: true,
                documentIdentity: {
                  where: { application_id: id },
                },
              },
            },
            share: true,
          },
        },
        sellers: {
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
      sellers: application.sellers.map((s: any) => {
        const { documentIdentity, ...person } = s.person;

        return {
          ...s,
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
        payments: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            paidAt: true,
            order_id: true,
          },
          take: 1,
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

    const { payments, ...result } = application;

    const data = {
      ...result,
      total_fee: Number(application.total_fee),
      canPay:
        isOwner && application.status === ApplicationStatus.MENUNGGU_PEMBAYARAN,
      payment: payments[0] ?? null,
    };

    return data;
  } catch (error) {
    throw new AppError("Gagal mengambil data application", 500);
  }
};

export const submitApplication = async (
  data: ApplicationCreate,
  tempFolder: string,
) => {
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

    if (!data.owners?.length) {
      throw new AppError("Data pemilik tidak boleh kosong", 400);
    }

    if (!data.sellers?.length) {
      throw new AppError("Data penjual tidak boleh kosong", 400);
    }

    // Diproses berurutan (bukan Promise.all) supaya:
    // 1. Tidak ada dua `upsert` untuk NIK yang sama berjalan bersamaan
    //    (mis. NIK yang sama muncul di owners & sellers, atau dobel di owners).
    // 2. Error dari satu baris (mis. unique constraint) bisa langsung
    //    diketahui baris keberapa yang bermasalah.
    const ownersResolved: any[] = [];
    for (const owner of data.owners) {
      ownersResolved.push({
        ...owner,
        person_id: await resolvePersonId(tx, owner),
      });
    }

    const sellersResolved: any[] = [];
    for (const seller of data.sellers) {
      sellersResolved.push({
        ...seller,
        person_id: await resolvePersonId(tx, seller),
      });
    }

    const applicant = ownersResolved[0];

    if (!applicant.person_id) {
      throw new AppError("Pemohon utama tidak valid", 400);
    }

    // Array dokumen (ktp_pembeli, kk_pembeli, dst) di-attach person_id
    // hasil resolve lewat helper attachPersonIds (lihat atas file).

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
      {
        ...data,
        owners: ownersResolved,
        sellers: sellersResolved,
        // pembeli = owners, penjual = sellers
        ktp_pembeli: attachPersonIds(data.ktp_pembeli, ownersResolved),
        kk_pembeli: attachPersonIds(data.kk_pembeli, ownersResolved),
        npwp_pembeli: attachPersonIds(data.npwp_pembeli, ownersResolved),
        surat_nikah_pembeli: attachPersonIds(
          data.surat_nikah_pembeli,
          ownersResolved,
        ),
        ktp_penjual: attachPersonIds(data.ktp_penjual, sellersResolved),
        kk_penjual: attachPersonIds(data.kk_penjual, sellersResolved),
        npwp_penjual: attachPersonIds(data.npwp_penjual, sellersResolved),
        surat_nikah_penjual: attachPersonIds(
          data.surat_nikah_penjual,
          sellersResolved,
        ),
      },
    );

    if (documents.length > 0) {
      await tx.applicationDocument.createMany({
        data: documents,
      });
    }

    await tx.applicationOwner.createMany({
      data: ownersResolved.map((owner) => ({
        application_id: application.id,
        person_id: owner.person_id,
        share: owner.share != null ? Number(owner.share) : null,
      })),
    });

    await tx.applicationSeller.createMany({
      data: sellersResolved.map((seller) => ({
        application_id: application.id,
        person_id: seller.person_id,
      })),
    });

    return application;
  });

  // Di luar transaksi: kalau gagal di sini, data DB sudah commit,
  // jadi cukup log — tidak perlu rollback data yang sudah tersimpan.
  try {
    moveTempFolder(tempFolder, `applications/${result.id}`);
  } catch (error) {
    console.error(
      `Gagal memindahkan folder temp untuk application ${result.id}:`,
      error,
    );
  }

  return {
    ...result,
    total_fee: Number(result.total_fee),
  };
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
            expireAt: new Date(paymentData.expiry_time),
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
    // RESOLVE OWNERS & SELLERS
    // ======================
    // Diproses berurutan (bukan Promise.all) — alasan sama seperti di
    // submitApplication: menghindari race antar `upsert` Person dengan
    // NIK sama, dan supaya error per baris jelas asalnya.
    // owner.person_id ?? resolvePersonId(...) : kalau person_id sudah
    // dikirim (mode "search" atau owner lama yang tidak diubah), pakai
    // langsung; kalau belum ada, resolve dulu (mode "manual" / owner baru).
    const ownersResolved: any[] = [];
    for (const owner of data.owners ?? []) {
      ownersResolved.push({
        ...owner,
        person_id: owner.person_id ?? (await resolvePersonId(tx, owner)),
      });
    }

    const sellersResolved: any[] = [];
    for (const seller of data.sellers ?? []) {
      sellersResolved.push({
        ...seller,
        person_id: seller.person_id ?? (await resolvePersonId(tx, seller)),
      });
    }

    // ======================
    // UPSERT OWNERS
    // ======================

    if (ownersResolved.length > 0) {
      await Promise.all(
        ownersResolved.map((owner) =>
          tx.applicationOwner.upsert({
            where: {
              application_id_person_id: {
                application_id: applicationId,
                person_id: owner.person_id,
              },
            },
            update: {
              share: owner.share != null ? Number(owner.share) : null,
            },
            create: {
              application_id: applicationId,
              person_id: owner.person_id,
              share: owner.share != null ? Number(owner.share) : null,
            },
          }),
        ),
      );
    }

    // ======================
    // UPSERT SELLERS (baru — sebelumnya tidak ada sama sekali)
    // ======================

    if (sellersResolved.length > 0) {
      await Promise.all(
        sellersResolved.map((seller) =>
          tx.applicationSeller.upsert({
            where: {
              application_id_person_id: {
                application_id: applicationId,
                person_id: seller.person_id,
              },
            },
            update: {},
            create: {
              application_id: applicationId,
              person_id: seller.person_id,
            },
          }),
        ),
      );
    }

    // ======================
    // MAP DOCUMENTS
    // ======================
    // Sama seperti submitApplication: array file per-owner/seller perlu
    // person_id yang sudah di-resolve, terutama untuk owner/seller manual
    // yang baru ditambahkan saat update ini.
    const documents = AppDocumentService.mapApplicationDocuments(
      applicationId,
      {
        ...data,
        owners: ownersResolved,
        sellers: sellersResolved,
        ktp_pembeli: attachPersonIds(data.ktp_pembeli, ownersResolved),
        kk_pembeli: attachPersonIds(data.kk_pembeli, ownersResolved),
        npwp_pembeli: attachPersonIds(data.npwp_pembeli, ownersResolved),
        surat_nikah_pembeli: attachPersonIds(
          data.surat_nikah_pembeli,
          ownersResolved,
        ),
        ktp_penjual: attachPersonIds(data.ktp_penjual, sellersResolved),
        kk_penjual: attachPersonIds(data.kk_penjual, sellersResolved),
        npwp_penjual: attachPersonIds(data.npwp_penjual, sellersResolved),
        surat_nikah_penjual: attachPersonIds(
          data.surat_nikah_penjual,
          sellersResolved,
        ),
      },
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
        sellers: {
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
  // EFEK SAMPING DI LUAR TRANSAKSI
  // ======================
  // Dipindah ke luar $transaction: ini operasi filesystem, bukan bagian
  // dari atomicity database. Kalau gagal di sini, data DB sudah commit,
  // jadi cukup di-log — tidak perlu (dan tidak bisa) di-rollback.

  try {
    moveTempFolder(tempFolder, `applications/${result.id}`);
  } catch (error) {
    console.error(
      `Gagal memindahkan folder temp untuk application ${result.id}:`,
      error,
    );
  }

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
  signedRequest: SignedForwardRequestInput,
) => {
  try {
    const normalizedRequest: ForwardRequestData = {
      from: signedRequest.from as `0x${string}`,
      to: signedRequest.to as `0x${string}`,
      value: BigInt(signedRequest.value),
      gas: BigInt(signedRequest.gas),
      deadline: signedRequest.deadline,
      data: signedRequest.data as `0x${string}`,
      signature: signedRequest.signature as `0x${string}`,
    };
    const domain = await publicClient.readContract({
      address: forwarderConfig.address,
      abi: [
        {
          name: "eip712Domain",
          type: "function",
          stateMutability: "view",
          inputs: [],
          outputs: [
            { name: "fields", type: "bytes1" },
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
            { name: "salt", type: "bytes32" },
            { name: "extensions", type: "uint256[]" },
          ],
        },
      ],
      functionName: "eip712Domain",
    } as any);

    const currentNonce = await getForwarderNonce(normalizedRequest.from);
    console.log("nonce saat verify:", currentNonce.toString());

    const isValid = await verifyForwardRequest(normalizedRequest);

    console.log("isvalid : ", isValid);
    if (!isValid) {
      throw new AppError(
        "Signature tidak valid atau sudah kadaluarsa. Silakan tanda tangan ulang.",
        400,
      );
    }

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
      // BigInt tidak bisa masuk queue JSON, kirim balik sebagai string
      signedRequest: {
        ...signedRequest,
      },
    };

    if (isSuccess) {
      const job = await addCertificateJob(jobPayloads);
      return { jobId: job.id };
    }
  } catch (error: any) {
    if (error instanceof AppError) throw error;

    throw new AppError(
      "Terjadi kesalahan saat memproses permohonan penerbitan sertifikat. Silakan coba kembali.",
      500,
      error?.meta,
    );
  }
};

export const getApplicationPayment = async (order_id: string) => {
  try {
    let paymentDetail = await prisma.applicationPayment.findUnique({
      where: {
        order_id,
      },
      select: {
        id: true,
        order_id: true,
        expireAt: true,
        createdAt: true,
        status: true,
        qr_url: true,
        amount: true,
        application: {
          select: {
            id: true,
            file_number: true,
          },
        },
      },
    });

    return serializeBigInt({
      data: paymentDetail,
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
