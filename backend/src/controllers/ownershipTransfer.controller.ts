import * as ownershipService from "../services/ownershipTransfer.service";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";
import {
  ApplicationCreate,
  ApplicationUpdate,
} from "../types/domain/ownershipTransfer.type";
import { ApplicationStatus } from "../generated/prisma/enums";
import fs from "fs";
import path from "path";

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

export const searchApplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fileNumber } = req.query;
    const person_id = req.person?.id;

    if (!fileNumber) throw new AppError("Berkas tidak ditemukan", 404);

    const result = await ownershipService.searchApplication(
      fileNumber as string,
      person_id,
    );

    res.status(200).json({
      status: !result ? "not found" : "success",
      message: !result
        ? "Berkas tidak ditemukan"
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
  try {
    const { id } = req?.person;
    const files = req.files as {
      cert_file?: Express.Multer.File[];
      ktp_penjual?: Express.Multer.File[];
      kk_pembeli?: Express.Multer.File[];
      ktp_pembeli?: Express.Multer.File[];
      akta_jual_beli?: Express.Multer.File[];
      fc_sppt?: Express.Multer.File[];
      fc_pbb?: Express.Multer.File[];
      ssb?: Express.Multer.File[];
    };

    if (!files) {
      throw new AppError("File wajib diupload", 400);
    }

    // Validasi file tunggal yang wajib
    const requiredSingleFiles: Record<string, string> = {
      cert_file: "File Sertifikat Tanah",
      ktp_penjual: "KTP Penjual",
      akta_jual_beli: "Akta Jual Beli",
      fc_sppt: "Fotokopi SPPT",
      fc_pbb: "Fotokopi PBB",
      ssb: "SSB",
    };

    for (const [field, label] of Object.entries(requiredSingleFiles)) {
      if (!files[field as keyof typeof files]?.[0]) {
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
        throw new AppError(`${label} wajib diupload`, 400);
      }
    }

    const owners = Array.isArray(req.body.owners)
      ? req.body.owners
      : req.body.owners
        ? JSON.parse(req.body.owners)
        : [];

    const ownerCount = owners.length;

    if ((files.ktp_pembeli?.length ?? 0) < ownerCount) {
      throw new AppError(
        `KTP Pembeli wajib diupload untuk setiap pemilik (${ownerCount} pemilik)`,
        400,
      );
    }

    if ((files.kk_pembeli?.length ?? 0) < ownerCount) {
      throw new AppError(
        `KK Pembeli wajib diupload untuk setiap pemilik (${ownerCount} pemilik)`,
        400,
      );
    }

    const { land_office_id, cert_code, cert_type, nib, land_id } = req.body;

    const payload: ApplicationCreate = {
      land_office_id,
      land_id,
      cert_code,
      cert_type,
      nib,
      officer_id: id,

      cert_file: files.cert_file![0],
      akta_jual_beli: files.akta_jual_beli![0],

      ktp_penjual: files.ktp_penjual!.map((file, index) => ({
        file,
        person_id: req.body.ktp_penjual_person_ids?.[index],
      })),

      ktp_pembeli: files.ktp_pembeli!.map((file, index) => ({
        file,
        person_id: owners[index]?.person_id,
      })),

      kk_pembeli: files.kk_pembeli!.map((file, index) => ({
        file,
        person_id: owners[index]?.person_id,
      })),

      fc_sppt: files.fc_sppt![0],
      fc_pbb: files.fc_pbb![0],
      ssb: files.ssb![0],

      owners,
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

    const statusMessages: Record<ApplicationStatus, string> = {
      // DIPROSES: "Permohonan sedang diproses",
      VERIFIKASI_BERKAS: "Permohonan dalam tahap verifikasi berkas",
      MENUNGGU_PEMBAYARAN: "Silahkan melakukan pembayaran terlebih dahulu",
      PENANDATANGANAN: "Permohonan dalam tahap penandatanganan",
      DITOLAK: "Permohonan anda telah ditolak",
      SELESAI: "Permohonan telah selesai diproses",
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

export const updateApplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id: officerId } = req.person;
    const { id } = req.params;
    const tempFolder = req.body._tempFolder;
    // console.log("temp folder : ", tempFolder);

    const files = req.files as {
      cert_file?: Express.Multer.File[];
      ktp_penjual?: Express.Multer.File[];
      kk_pembeli?: Express.Multer.File[];
      ktp_pembeli?: Express.Multer.File[];
      akta_jual_beli?: Express.Multer.File[];
      fc_sppt?: Express.Multer.File[];
      fc_pbb?: Express.Multer.File[];
      ssb?: Express.Multer.File[];
    };

    // ======================
    // PARSE OWNERS
    // ======================

    const owners = Array.isArray(req.body.owners)
      ? req.body.owners
      : req.body.owners
        ? JSON.parse(req.body.owners)
        : [];

    // ======================
    // PERSON IDS FOR FILES
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

    const { land_office_id, cert_code, cert_type, nib, land_id, person_id } =
      req.body;

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

      // SINGLE FILES
      cert_file: files.cert_file?.[0],
      akta_jual_beli: files.akta_jual_beli?.[0],
      fc_sppt: files.fc_sppt?.[0],
      fc_pbb: files.fc_pbb?.[0],
      ssb: files.ssb?.[0],

      // MULTIPLE FILES
      ktp_penjual: (files.ktp_penjual ?? []).map((file, index) => ({
        file,
        person_id: ktpPenjualPersonIds[index],
      })),

      ktp_pembeli: (files.ktp_pembeli ?? []).map((file, index) => ({
        file,
        person_id: ktpPembeliPersonIds[index],
      })),

      kk_pembeli: (files.kk_pembeli ?? []).map((file, index) => ({
        file,
        person_id: kkPembeliPersonIds[index],
      })),

      owners,
    };

    // console.log("payload :", payload);

    // ======================
    // SERVICE
    // ======================

    const result = await ownershipService.updateApplication(
      id as string,
      payload,
      tempFolder,
    );

    // ======================
    // RESPONSE
    // ======================

    res.status(200).json({
      status: "success",
      message: "Permohonan berhasil diperbarui",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const result = await ownershipService.verifyPayment(
      id as string,
      notes as string[],
    );

    res.status(200).json({
      status: "success",
      message: "Berhasil Melakukan verifikasi pembayaran",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
