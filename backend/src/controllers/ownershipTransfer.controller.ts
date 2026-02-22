import * as ownershipService from "../services/ownershipTransfer.service";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";
import { ApplicationCreate } from "../types/domain/ownershipTransfer.type";
import { ApplicationStatus } from "../generated/prisma/enums";
import fs from "fs";
import path from "path";

export const submitApplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const files = req.files as {
      cert_file?: Express.Multer.File[];
      ktp_penjual?: Express.Multer.File[];
      kk_pembeli?: Express.Multer.File[];
      ktp_pembeli?: Express.Multer.File[];
      akta_jual_beli?: Express.Multer.File[];
      fc_sppt?: Express.Multer.File[];
      fc_pbb?: Express.Multer.File[];
    };

    console.log("files : ", files.cert_file);

    if (!files) {
      throw new AppError("File wajib diupload", 400);
    }

    //validasi wajib
    const requiredFiles: Record<string, string> = {
      cert_file: "File Sertifikat Tanah",
      ktp_penjual: "KTP Penjual",
      kk_pembeli: "Kartu Keluarga Pembeli",
      ktp_pembeli: "KTP Pembeli",
      akta_jual_beli: "Akta Jual Beli",
      fc_sppt: "Fotokopi SPPT",
      fc_pbb: "Fotokopi PBB",
    };

    for (const [field, label] of Object.entries(requiredFiles)) {
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

    const {
      person_id,
      street_address,
      rt,
      rw,
      ward,
      subdistrict,
      regency,
      province,
      cert_number,
      cert_type,
      _tempFolder,
    } = req.body;

    const payload: ApplicationCreate = {
      person_id,
      street_address,
      rt,
      rw,
      ward,
      subdistrict,
      regency,
      province,
      cert_number,
      cert_type,
      cert_file: files.cert_file![0],
      ktp_penjual: files.ktp_penjual![0],
      kk_pembeli: files.kk_pembeli![0],
      ktp_pembeli: files.ktp_pembeli![0],
      akta_jual_beli: files.akta_jual_beli![0],
      fc_sppt: files.fc_sppt![0],
      fc_pbb: files.fc_pbb![0],
    };

    const result = await ownershipService.submitApplication(
      payload,
      _tempFolder,
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
    console.log("error : ", error);
    next(error);
  }
};

export const updateApplicationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { note, status } = req.body;

    const result = await ownershipService.updateApplicationStatus(
      id,
      status,
      note,
    );

    const statusMessages: Record<ApplicationStatus, string> = {
      DIPROSES: "Permohonan sedang diproses",
      VERIFIKASI_BERKAS: "Permohonan dalam tahap verifikasi berkas",
      PROSES_PENGUKURAN: "Permohonan dalam proses pengukuran",
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
    const { id } = req.params;

    const result = await ownershipService.updateApplication(
      id,
      req.body,
      req.files as Record<string, Express.Multer.File[]>,
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
