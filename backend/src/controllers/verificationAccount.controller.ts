import * as VerifService from "../services/verificationAccount.service";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";

export const check = async (req : Request, res : Response, next : NextFunction) => {
  try {
     const personId = req.person?.id as string

     const isExisting = await VerifService.isVerified(personId)

     res.status(200).json({
      message : "Berhasil melakukan pengecekan akun",
      data : isExisting
     })
  } catch (error) {
    next()
  }
}

export const submit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      fullName,
      nik,
      phone,
      birthPlace,
      birthDate,
      gender,
      address,
    } = req.body;

     const personId = req.person?.id as string

    if (
      !personId ||
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
      person_id : personId,
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
