import * as VerifService from "../services/verificationAccount.service";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";

export const submit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      person_id,
      fullName,
      nik,
      phone,
      birthPlace,
      birthDate,
      gender,
      address,
    } = req.body;

    if (
      !person_id ||
      !fullName ||
      !nik ||
      !phone ||
      !birthPlace ||
      !birthDate ||
      !gender ||
      !address
    ) {
      throw new AppError("Semua field wajib diisi", 400);
    }

    const result = await VerifService.submit({
      person_id,
      fullName,
      nik,
      phone,
      birthPlace,
      birthDate,
      gender,
      address,
    });
    res.status(201).json({
      status: "success",
      message: "Verifikasi akun berhasil diajukan dan sedang diproses.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const verify = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { status, rejectionReason } = req.body;
    const { id } = req.params;

    const result = await VerifService.verify({
      id,
      status,
      rejectionReason,
    });
    res.status(200).json({
      status: "success",
      message:
        status === "APPROVED"
          ? "Verifikasi akun berhasil disetujui."
          : "Verifikasi akun berhasil ditolak.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
};
