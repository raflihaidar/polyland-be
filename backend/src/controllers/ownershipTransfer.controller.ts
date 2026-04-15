import * as ownershipService from "../services/ownershipTransfer.service";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";
import { ApplicationCreate } from "../types/domain/ownershipTransfer.type";
import { ApplicationStatus } from "../generated/prisma/enums";
import fs from "fs";
import path from "path";


export const getListApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { land_office_id } = req.params
    const {page, limit, search} = req.query

    console.log("query : ", req.query)

    if (!land_office_id) throw new AppError('Id kantor pertanahan kosong', 403)

    const result = await ownershipService.getListApplication(land_office_id as string, Number(page), Number(limit), search as string);

    res.status(200).json({
      message : 'application berhasil didapatkan',
      data : result
    })
  } catch (error) {
    next(error)
  }
}


export const getApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    if (!id) throw new AppError('Permohonan tidak ditemukan', 404)

    const result = await ownershipService.getApplication(id as string);

    res.status(200).json({
      message : 'application berhasil didapatkan',
      data : result
    })
  } catch (error) {
    next(error)
  }
}

export const searchApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileNumber } = req.query
    const person_id = req.person?.id

    if (!fileNumber) throw new AppError('Berkas tidak ditemukan', 404)

    const result = await ownershipService.searchApplication(fileNumber as string, person_id);

    res.status(200).json({
      status : !result ? 'not found' : 'success',
      message : !result ? 'Berkas tidak ditemukan' : 'Berkas berhasil didapatkan',
      data : result
    })
  } catch (error) {
    next(error)
  }
}

export const submitApplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const person_id = req.person?.id
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

    //validasi wajib
    const requiredFiles: Record<string, string> = {
      cert_file: "File Sertifikat Tanah",
      ktp_penjual: "KTP Penjual",
      kk_pembeli: "Kartu Keluarga Pembeli",
      ktp_pembeli: "KTP Pembeli",
      akta_jual_beli: "Akta Jual Beli",
      fc_sppt: "Fotokopi SPPT",
      fc_pbb: "Fotokopi PBB",
      ssb: "SSB",
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
      area_size,
      land_office_id,
      street_address,
      rt,
      rw,
      ward,
      subdistrict,
      regency,
      province,
      cert_number,
      cert_type,
      province_code,
      regency_code,
      _tempFolder,
      nib
    } = req.body;

    const payload: ApplicationCreate = {
      person_id,
      street_address,
      rt,
      rw,
      area_size,
      land_office_id,
      ward,
      subdistrict,
      regency,
      province,
      province_code : Number(province_code),
      regency_code : Number(regency_code),
      cert_number,
      cert_type,
      nib,
      cert_file: files.cert_file![0],
      ktp_penjual: files.ktp_penjual![0],
      kk_pembeli: files.kk_pembeli![0],
      ktp_pembeli: files.ktp_pembeli![0],
      akta_jual_beli: files.akta_jual_beli![0],
      fc_sppt: files.fc_sppt![0],
      fc_pbb: files.fc_pbb![0],
      ssb: files.ssb![0],
    };

    const result = await ownershipService.submitApplication(
      payload,
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
    const { fileNumber } = req.params;
    const { note, status } = req.body;

    const result = await ownershipService.updateApplicationStatus(
      fileNumber as string,
      status,
      note,
    );

    const statusMessages: Record<ApplicationStatus, string> = {
      DIPROSES: "Permohonan sedang diproses",
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
    const { id } = req.params;

    const result = await ownershipService.updateApplication(
      id as string,
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
