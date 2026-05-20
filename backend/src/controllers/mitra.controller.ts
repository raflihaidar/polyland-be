import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error.js";

export const getMitra = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.status(200).json({
      status: "success",
      message: "Data mitra berhasil diambil",
    });
  } catch (error) {
    next(error);
  }
};
