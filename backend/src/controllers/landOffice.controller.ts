import { NextFunction, Request, Response } from "express";
import * as landOfficeService from "../services/landOffice.service";


export const createLandOffice = async (req: Request, res: Response, next : NextFunction) => {
  try {
    const result = await landOfficeService.createLandOffice(req.body);

    return res.status(201).json({
      status: "success",
      message: "Kantor pertanahan berhasil dibuat",
      data: result,
    });
  } catch (error: any) {
    next(error)
  }
};

export const getLandOffices = async (req: Request, res: Response, next : NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string | undefined;

    const result = await landOfficeService.getLandOffices({
      page,
      limit,
      search,
    });

    return res.json({
      status: "success",
      message: "Daftar kantor pertanahan berhasil didapatkan",
      ...result,
    });
  } catch (error: any) {
    next(error)
  }
};

export const getLandOfficeById = async (req: Request, res: Response, next : NextFunction) => {
  try {
    const { id } = req.params;

    const result = await landOfficeService.getLandOfficeById(id as string);

    return res.json({
      status: "success",
      message : "Kantor pertanahan berhasil didapatkan",
      data: result,
    });
  } catch (error: any) {
    next(error)
  }
};


export const updateLandOffice = async (req: Request, res: Response, next : NextFunction) => {
  try {
    const { id } = req.params;

    const result = await landOfficeService.updateLandOffice(id as string, req.body);

    return res.json({
      status: "success",
      message: "Kantor Pertanahan berhasil diperbarui",
      data: result,
    });
  } catch (error: any) {
    next(error)
  }
};


export const deleteLandOffice = async (req: Request, res: Response, next : NextFunction) => {
  try {
    const { id } = req.params;

    const result = await landOfficeService.deleteLandOffice(id as string);

    return res.json({
      status: "success",
      message: "Kantor pertanahan berhasil dihapus",
      data: result,
    });
  } catch (error: any) {
    next(error)
  }
};