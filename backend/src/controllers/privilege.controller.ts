import { NextFunction, Request, Response } from "express";
import * as PrivilegeService from "../services/privilege.service.js";

export const getPrivilegeByRoleId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { roleId } = req.params;
    if (isNaN(parseInt(roleId as string)))
      throw new Error("Role ID tidak valid");

    const data = await PrivilegeService.getPrivilegeByRoleId(
      parseInt(roleId as string),
    );

    res.status(200).json({
      status: "success",
      message: "Berhasil mendapatkan privilege",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const assignPrivilege = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { roleId } = req.params;
    const { privilegeId } = req.body;

    const data = await PrivilegeService.assignPrivilege(
      parseInt(roleId as string),
      privilegeId,
    );

    res.status(201).json({
      status: "success",
      message: "Privilege berhasil diberikan",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const removePrivilege = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { roleId } = req.params;

    const { privilegeId } = req.body;

    await PrivilegeService.removePrivilege(
      parseInt(roleId as string),
      privilegeId,
    );

    res.status(200).json({
      status: "success",
      message: "Privilege berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPrivileges = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roles = req.person?.roles as string[];

    if (!roles || roles.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "Berhasil mendapatkan privilege",
        data: [],
      });
    }

    const data = await PrivilegeService.getMyPrivileges(roles);

    res.status(200).json({
      status: "success",
      message: "Berhasil mendapatkan privilege",
      data,
    });
  } catch (error) {
    next(error);
  }
};
