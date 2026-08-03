import * as ownershipService from "../services/ownershipTransfer.service.js";
import * as paymentService from "../services/payment.service.js";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error.js";
import {
  ApplicationCreate,
  ApplicationUpdate,
} from "../types/domain/ownershipTransfer.type.js";
import { ApplicationStatus } from "../generated/prisma/enums.js";
import fs from "fs";
import path from "path";
import { MidtransNotification } from "../types/domain/payment.type.js";
import { buildMintForwardRequest } from "../services/forwarder.service.js";
import type { Address } from "viem";

export const getDashboardSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { office_id } = req.params;

    if (!office_id)
      throw new AppError("Kantor pertanahan tidak ditemukan", 404);

    const result = await ownershipService.getDashboardSummary(
      office_id as string,
    );

    res.status(200).json({
      message: "Ringkasan dashboard berhasil didapatkan",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getDistribusiStatusPermohonan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { office_id } = req.params;

    if (!office_id)
      throw new AppError("Kantor pertanahan tidak ditemukan", 404);

    const result = await ownershipService.getDistribusiStatusPermohonan(
      office_id as string,
    );

    res.status(200).json({
      message: "Distribusi status permohonan berhasil didapatkan",
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

export const getBlockchainSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { office_id } = req.params;

    if (!office_id)
      throw new AppError("Kantor pertanahan tidak ditemukan", 404);

    const result = await ownershipService.getBlockchainSummary(
      office_id as string,
    );

    res.status(200).json({
      message: "Ringkasan status blockchain berhasil didapatkan",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getListApplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { land_office_id } = req.params;
    const { page, limit, search, status, type, date } = req.query;

    if (!land_office_id) throw new AppError("Id kantor pertanahan kosong", 403);

    const result = await ownershipService.getListApplication(
      land_office_id as string,
      Number(page),
      Number(limit),
      search as string,
      status as string,
      type as string,
      date as string,
    );

    res.status(200).json({
      message: "application berhasil didapatkan",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getApplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id) throw new AppError("Permohonan tidak ditemukan", 404);

    const result = await ownershipService.getApplication(id as string);

    if (!result) throw new AppError("Permohonan tidak ditemukan", 404, {});

    res.status(200).json({
      message: "application berhasil didapatkan",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getApplicationPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { order_id } = req.params;

    if (!order_id)
      throw new AppError("Tagihan Pembayaran tidak ditemukan", 404);

    const result = await ownershipService.getApplicationPayment(
      order_id as string,
    );

    if (!result)
      throw new AppError("Tagihan Pembayaran tidak ditemukan", 404, {});

    res.status(200).json({
      message: "Tagihan pembayaran berhasil didapatkan",
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

export const searchApplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fileNumber } = req.query;
    const person_id = req.person?.id;

    if (!fileNumber)
      throw new AppError(
        "Tidak ditemukan berkas dengan nomor yang dicari. Periksa kembali nomor berkas dan coba lagi.",
        404,
      );

    const result = await ownershipService.searchApplication(
      fileNumber as string,
      person_id,
    );

    res.status(200).json({
      status: !result ? "not found" : "success",
      message: !result
        ? "Tidak ditemukan berkas dengan nomor yang dicari. Periksa kembali nomor berkas dan coba lagi."
        : "Berkas berhasil didapatkan",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const submitApplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const cleanupTempFolder = () => {
    const tempFolder = req.body._tempFolder;
    if (tempFolder) {
      const tempPath = path.join(
        process.cwd(),
        "backend",
        "src",
        "uploads",
        "temp",
        tempFolder,
      );
      if (fs.existsSync(tempPath)) {
        fs.rmSync(tempPath, { recursive: true, force: true });
      }
    }
  };

  try {
    const { id } = req?.person;
    const files = req.files as {
      ktp_penjual?: Express.Multer.File[];
      kk_penjual?: Express.Multer.File[];
      npwp_penjual?: Express.Multer.File[];
      surat_nikah_penjual?: Express.Multer.File[];
      ktp_pembeli?: Express.Multer.File[];
      npwp_pembeli?: Express.Multer.File[];
      kk_pembeli?: Express.Multer.File[];
      surat_nikah_pembeli?: Express.Multer.File[];
      akta_jual_beli?: Express.Multer.File[];
      sppt_pbb?: Express.Multer.File[];
      bphtb?: Express.Multer.File[];
      pph?: Express.Multer.File[];
    };

    if (!files) {
      throw new AppError("File wajib diupload", 400);
    }

    const owners = Array.isArray(req.body.owners)
      ? req.body.owners
      : req.body.owners
        ? JSON.parse(req.body.owners)
        : [];

    const sellers = Array.isArray(req.body.sellers)
      ? req.body.sellers
      : req.body.sellers
        ? JSON.parse(req.body.sellers)
        : [];

    const ownerCount = owners.length;
    const sellerCount = sellers.length;

    if (ownerCount === 0) {
      throw new AppError("Data pemilik tidak boleh kosong", 400);
    }
    if (sellerCount === 0) {
      throw new AppError("Data penjual tidak boleh kosong", 400);
    }

    // ─── Validasi dokumen tunggal (level-aplikasi, bukan per-orang) ───
    const requiredSingleFiles: Record<string, string> = {
      akta_jual_beli: "Akta Jual Beli",
      sppt_pbb: "SPPT PBB",
      bphtb: "BPHTB",
      pph: "PPH",
    };

    for (const [field, label] of Object.entries(requiredSingleFiles)) {
      if (!files[field as keyof typeof files]?.[0]) {
        cleanupTempFolder();
        throw new AppError(`${label} wajib diupload`, 400);
      }
    }

    const requiredPerPersonFiles: Array<{
      field: keyof typeof files;
      label: string;
      expectedCount: number;
    }> = [
      { field: "ktp_pembeli", label: "KTP Pembeli", expectedCount: ownerCount },
      { field: "kk_pembeli", label: "KK Pembeli", expectedCount: ownerCount },
      {
        field: "npwp_pembeli",
        label: "NPWP Pembeli",
        expectedCount: ownerCount,
      },
      {
        field: "ktp_penjual",
        label: "KTP Penjual",
        expectedCount: sellerCount,
      },
      { field: "kk_penjual", label: "KK Penjual", expectedCount: sellerCount },
      {
        field: "npwp_penjual",
        label: "NPWP Penjual",
        expectedCount: sellerCount,
      },
    ];

    for (const { field, label, expectedCount } of requiredPerPersonFiles) {
      if ((files[field]?.length ?? 0) < expectedCount) {
        cleanupTempFolder();
        throw new AppError(
          `${label} wajib diupload untuk setiap orang (${expectedCount} orang)`,
          400,
        );
      }
    }

    // [FIX] Ambil index array dari body (dikirim FE sebagai *_indexes)
    const parseIndexes = (raw: any): number[] => {
      if (raw === undefined || raw === null) return [];
      const arr = Array.isArray(raw) ? raw : [raw];
      return arr.map((v) => Number(v));
    };

    // [FIX] Mapping file ke person berdasarkan index asli (bukan index array file),
    // supaya file opsional (surat nikah) tidak nyasar ke orang yang salah.
    const mapFilesWithIndexes = (
      fileArr: Express.Multer.File[] = [],
      indexesRaw: any,
      persons: any[],
    ) => {
      const indexes = parseIndexes(indexesRaw);
      return fileArr.map((file, i) => {
        const personIdx = indexes.length > i ? indexes[i] : i;
        return {
          file,
          person_id: persons[personIdx]?.person_id,
        };
      });
    };

    // [FIX] Validasi: setiap orang berstatus "menikah" wajib punya surat nikah
    const validateSpouseDocs = (
      persons: any[],
      fileField: keyof typeof files,
      indexesField: string,
      label: string,
    ) => {
      const marriedIndexes = persons
        .map((p, idx) => (p.marital_status === "menikah" ? idx : -1))
        .filter((idx) => idx !== -1);

      if (marriedIndexes.length === 0) return;

      const uploadedIndexes = new Set(parseIndexes(req.body[indexesField]));

      const uploadedCount = files[fileField]?.length ?? 0;
      if (uploadedCount < marriedIndexes.length) {
        cleanupTempFolder();
        throw new AppError(
          `${label} wajib diupload untuk orang berstatus menikah`,
          400,
        );
      }

      const missing = marriedIndexes.filter((idx) => !uploadedIndexes.has(idx));
      if (missing.length > 0) {
        cleanupTempFolder();
        throw new AppError(
          `${label} wajib diupload untuk orang berstatus menikah (index: ${missing.join(", ")})`,
          400,
        );
      }
    };

    // [FIX] validasi ini sebelumnya didefinisikan tapi tidak pernah dipanggil
    validateSpouseDocs(
      owners,
      "surat_nikah_pembeli",
      "surat_nikah_pembeli_owner_indexes",
      "Surat Nikah Pembeli",
    );
    validateSpouseDocs(
      sellers,
      "surat_nikah_penjual",
      "surat_nikah_penjual_seller_indexes",
      "Surat Nikah Penjual",
    );

    const { land_office_id, cert_code, cert_type, nib, land_id } = req.body;

    const payload: ApplicationCreate = {
      land_office_id,
      land_id,
      cert_code,
      cert_type,
      nib,
      officer_id: id,

      // [FIX] pakai mapFilesWithIndexes, bukan index array file langsung
      ktp_penjual: mapFilesWithIndexes(
        files.ktp_penjual,
        req.body.ktp_penjual_seller_indexes,
        sellers,
      ),
      kk_penjual: mapFilesWithIndexes(
        files.kk_penjual,
        req.body.kk_penjual_seller_indexes,
        sellers,
      ),
      npwp_penjual: mapFilesWithIndexes(
        files.npwp_penjual,
        req.body.npwp_penjual_seller_indexes,
        sellers,
      ),
      surat_nikah_penjual: mapFilesWithIndexes(
        files.surat_nikah_penjual,
        req.body.surat_nikah_penjual_seller_indexes,
        sellers,
      ),

      ktp_pembeli: mapFilesWithIndexes(
        files.ktp_pembeli,
        req.body.ktp_pembeli_owner_indexes,
        owners,
      ),
      npwp_pembeli: mapFilesWithIndexes(
        files.npwp_pembeli,
        req.body.npwp_pembeli_owner_indexes,
        owners,
      ),
      kk_pembeli: mapFilesWithIndexes(
        files.kk_pembeli,
        req.body.kk_pembeli_owner_indexes,
        owners,
      ),
      surat_nikah_pembeli: mapFilesWithIndexes(
        files.surat_nikah_pembeli,
        req.body.surat_nikah_pembeli_owner_indexes,
        owners,
      ),

      akta_jual_beli: files.akta_jual_beli![0],
      sppt_pbb: files.sppt_pbb![0],
      bphtb: files.bphtb![0],
      pph: files.pph![0], // [FIX] sebelumnya sudah ada di payload tapi tidak pernah tersimpan sbg dokumen (lihat mapApplicationDocuments)

      owners,
      sellers,
    };

    const result = await ownershipService.submitApplication(
      payload,
      req.body._tempFolder,
    );

    res.status(201).json({
      status: "success",
      message: "Permohonan berhasil diajukan dan sedang diproses.",
      data: result,
    });
  } catch (error) {
    cleanupTempFolder();
    next(error);
  }
};

export const updateApplicationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fileNumber } = req.query;
    const { note, status } = req.body;

    const result = await ownershipService.updateApplicationStatus(
      fileNumber as string,
      status,
      note,
    );

    // const statusMessages: Record<ApplicationStatus, string> = {
    //   VERIFIKASI_BERKAS: "Permohonan dalam tahap verifikasi berkas",
    //   MENUNGGU_PEMBAYARAN: "Silahkan melakukan pembayaran terlebih dahulu",
    //   PROSES_PENERBITAN: "Permohonan dalam tahap penerbitan sertifikat",
    //   VERIFIKASI_PEMBAYARAN:
    //     "Pembayaran telah diterima dan sedang diverifikasi",
    //   PEMBAYARAN_DIBATALKAN: "Pembayaran telah dibatalkan",
    //   PEMBAYARAN_KADALUARSA: "Batas waktu pembayaran telah berakhir",
    //   PEMBAYARAN_DIKEMBALIKAN: "Pembayaran telah dikembalikan (refund)",
    //   DITOLAK: "Permohonan anda telah ditolak",
    //   SELESAI: "Permohonan telah selesai diproses",
    //   TERJADI_KESALAHAN: "Terjadi kesalahan saat membuat permohonan",
    // };

    const statusMessages: Record<ApplicationStatus, string> = {
      VERIFIKASI_BERKAS: "Permohonan dalam tahap verifikasi berkas",
      MENUNGGU_PEMBAYARAN: "Menunggu pembayaran dari pemohon",
      VERIFIKASI_PEMBAYARAN:
        "Pembayaran telah diterima dan sedang diverifikasi",
      PROSES_PENERBITAN: "Dalam proses penerbitan sertifikat",
      PENERBITAN_GAGAL: "Penerbitan Sertifikat Gagal",
      PEMBAYARAN_DIBATALKAN: "Pembayaran berhasil dibatalkan",
      PEMBAYARAN_KADALUARSA: "Pembayaran kedaluwarsa",
      PEMBAYARAN_DIKEMBALIKAN: "Pembayaran berhasil dikembalikan",
      DITOLAK: "Permohonan berhasil ditolak",
      SELESAI: "Permohonan selesai",
      TERJADI_KESALAHAN: "Terjadi kesalahan pada proses permohonan",
    };

    res.status(200).json({
      status: "success",
      message: statusMessages[status as ApplicationStatus],
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMidtransNotification = async (
  req: Request<{}, {}, MidtransNotification>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const notificationData = req.body;
    await ownershipService.getMidtransNotification(notificationData);

    res
      .status(200)
      .json({ status: "success", message: "Notification received" });
  } catch (error: any) {
    next(error);
  }
};

export const updateApplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id: officerId } = req.person;
    const { id } = req.params;
    const tempFolder = req.body._tempFolder;

    const files = req.files as
      | {
          ktp_penjual?: Express.Multer.File[];
          kk_penjual?: Express.Multer.File[];
          npwp_penjual?: Express.Multer.File[];
          surat_nikah_penjual?: Express.Multer.File[];

          ktp_pembeli?: Express.Multer.File[];
          npwp_pembeli?: Express.Multer.File[];
          kk_pembeli?: Express.Multer.File[];
          surat_nikah_pembeli?: Express.Multer.File[];

          akta_jual_beli?: Express.Multer.File[];
          sppt_pbb?: Express.Multer.File[];
          bphtb?: Express.Multer.File[];
          pph?: Express.Multer.File[];
        }
      | undefined;

    // ======================
    // PARSE OWNERS
    // ======================

    const owners = Array.isArray(req.body.owners)
      ? req.body.owners
      : req.body.owners
        ? JSON.parse(req.body.owners)
        : undefined;

    // ======================
    // PERSON IDS
    // ======================

    const ktpPembeliPersonIds = Array.isArray(req.body.ktp_pembeli_person_ids)
      ? req.body.ktp_pembeli_person_ids
      : req.body.ktp_pembeli_person_ids
        ? [req.body.ktp_pembeli_person_ids]
        : [];

    const kkPembeliPersonIds = Array.isArray(req.body.kk_pembeli_person_ids)
      ? req.body.kk_pembeli_person_ids
      : req.body.kk_pembeli_person_ids
        ? [req.body.kk_pembeli_person_ids]
        : [];

    const ktpPenjualPersonIds = Array.isArray(req.body.ktp_penjual_person_ids)
      ? req.body.ktp_penjual_person_ids
      : req.body.ktp_penjual_person_ids
        ? [req.body.ktp_penjual_person_ids]
        : [];

    // ======================
    // BODY
    // ======================

    const {
      land_office_id,
      cert_code,
      cert_type,
      nib,
      land_id,
      person_id,
      sellers,
    } = req.body;

    // ======================
    // PAYLOAD
    // ======================

    const payload: ApplicationUpdate = {
      person_id,
      land_office_id,
      land_id,
      cert_code,
      cert_type,
      nib,
      officer_id: officerId,

      // SINGLE FILE
      akta_jual_beli: files?.akta_jual_beli?.[0],
      sppt_pbb: files?.sppt_pbb?.[0],
      bphtb: files?.bphtb?.[0],
      pph: files?.pph?.[0],

      // MULTIPLE FILE
      ...(files?.ktp_penjual && {
        ktp_penjual: files.ktp_penjual.map((file, index) => ({
          file,
          person_id: ktpPenjualPersonIds[index],
        })),
      }),

      ...(files?.ktp_pembeli && {
        ktp_pembeli: files.ktp_pembeli.map((file, index) => ({
          file,
          person_id: ktpPembeliPersonIds[index],
        })),
      }),

      ...(files?.kk_pembeli && {
        kk_pembeli: files.kk_pembeli.map((file, index) => ({
          file,
          person_id: kkPembeliPersonIds[index],
        })),
      }),

      ...(owners && {
        owners,
      }),

      ...(sellers && {
        sellers: JSON.parse(sellers),
      }),
    };

    // ======================
    // SERVICE
    // ======================

    const result = await ownershipService.updateApplication(
      id as string,
      payload,
      tempFolder,
    );

    res.status(200).json({
      status: "success",
      message: "Permohonan berhasil diperbarui",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const enqueueCertificateGeneration = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { notes, signedRequest } = req.body;

    if (!signedRequest?.signature) {
      return res.status(400).json({
        status: "error",
        message:
          "Signature belum tersedia, silakan tanda tangan ulang di MetaMask.",
      });
    }

    const result = await ownershipService.enqueueCertificateGeneration(
      id as string,
      notes as string[],
      signedRequest,
    );

    res.status(200).json({
      status: "success",
      message: "Permintaan penerbitan sertifikat telah dimasukkan ke antrean",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { order_id } = req.params;

    if (!order_id) throw new AppError("Pembayaran tidak ditemukan", 404);

    const result = await paymentService.getPaymentStatus(order_id as string);

    if (!result) throw new AppError("Pembayaran tidak ditemukan", 404, {});

    res.status(200).json({
      message: "Status pembayaran berhasil didapatkan",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { order_id } = req.params;

    if (!order_id) throw new AppError("Pembayaran tidak ditemukan", 404);

    const result = await paymentService.cancelPayment(order_id as string);

    res.status(200).json({
      message: "Pembayaran berhasil dibatalkan",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const requestMintSignature = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      petugasAddress,
      recipientAddress,
      loketAddress,
      nib,
      luasTanah,
      jenisHak,
    } = req.body as {
      petugasAddress: Address;
      recipientAddress: Address;
      loketAddress: Address;
      nib: string;
      luasTanah: bigint;
      jenisHak: string;
    };

    if (
      !petugasAddress ||
      !recipientAddress ||
      !loketAddress ||
      !nib ||
      !luasTanah ||
      !jenisHak
    ) {
      return res.status(400).json({
        success: false,
        message: "terdapat data yang belum diisi, periksa kembali seluruh data",
      });
    }

    const typedData = await buildMintForwardRequest({
      petugasAddress,
      recipientAddress,
      loketAddress,
      nib,
      luasTanah,
      jenisHak,
    });

    res.json({
      success: true,
      data: {
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: {
          ...typedData.message,
          value: typedData.message.value.toString(),
          gas: typedData.message.gas.toString(),
          nonce: typedData.message.nonce.toString(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
