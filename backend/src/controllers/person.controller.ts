import * as PersonService from "../services/person.service.js";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error.js";
import { UpdatePerson } from "../types/person.type.js";

export const searchPerson = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { q } = req.query;

    const queue = await PersonService.searchPerson(q as string);

    res
      .json({
        status: "success",
        message: "Berhasil mendapatkan data warga",
        data: queue,
      })
      .status(200);
  } catch (error: unknown) {
    next(error);
  }
};

export const getAllUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { search, page, limit, role_id } = req.query;

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const roleId = Number(role_id);

    const result = await PersonService.findAllUser(
      pageNumber,
      limitNumber,
      search as string,
      roleId,
    );

    res.status(200).json({
      status: "success",
      message: "Daftar user berhasil didapatkan",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getDetailUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const result = await PersonService.findDetailUser(id as string);

    res.status(200).json({
      status: "success",
      message: "Detail user berhasil didapatkan",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    console.log("id di controller : ", id);

    await PersonService.deleteUser(id as string);

    res.status(200).json({
      status: "success",
      message: "Berhasil menghapus user",
    });
  } catch (error) {
    next(error);
  }
};

export const updatePerson = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const body: UpdatePerson = req.body;

    const result = await PersonService.updateUser(id as string, body);

    res.status(200).json({
      status: "success",
      message: "Berhasil mengupdate user",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
