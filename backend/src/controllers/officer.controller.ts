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

export const searchHeadOfficeByOfficeLand = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const result = await officerService.findHeadOfficeByLandOffice(
      id as string,
    );

    return res.status(201).json({
      status: "success",
      message: "Berhasil mendapatkan data kepala kantah",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
