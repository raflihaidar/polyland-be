import * as RoleService from "../services/referenceData.service.js";
import { NextFunction, Request, Response } from "express";

export const getAllRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { search, page, limit } = req.query;

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;

    const result = await RoleService.findAllRole(
      pageNumber,
      limitNumber,
      search as string,
    );

    res.status(200).json({
      status: "success",
      message: "Daftar role berhasil didapatkan",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name } = req.body;
    if (!name) throw new Error("Nama role wajib diisi");

    const data = await RoleService.createRole(name);
    res
      .status(201)
      .json({ status: "success", message: "Role berhasil dibuat", data });
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name } = req.body;
    if (!name) throw new Error("Nama role wajib diisi");

    const data = await RoleService.updateRole(id, name);
    res
      .status(200)
      .json({ status: "success", message: "Role berhasil diperbarui", data });
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseInt(req.params.id as string);
    await RoleService.deleteRole(id);
    res
      .status(200)
      .json({ status: "success", message: "Role berhasil dihapus" });
  } catch (error) {
    next(error);
  }
};
