import { NextFunction, Request, Response } from "express";
import * as officerService from "../services/officer.service.js";

export const createHeadOffice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await officerService.createHeadOfficer(req.body);

    return res.status(201).json({
      status: "success",
      message: "Kepala kantor pertanahan berhasil dibuat",
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
};
