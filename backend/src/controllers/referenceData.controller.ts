import * as RoleService from "../services/referenceData.service.js"
import { NextFunction, Request, Response } from "express";


export const getAllRole = async (
    req: Request,
    res: Response,
    next: NextFunction) => {
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
            status : "success",
            message: "Daftar role berhasil didapatkan",
            data: result,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }

}