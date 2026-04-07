import express from "express";
import { generateCertificate } from "../controllers/document.controller";
import { authentication } from "../middlewares/authentication";
import { authorize } from "../middlewares/authorization";

const router = express.Router();

router.use(authentication);

router.post("/generate-certificate", authorize("verifikasi-akun", "read"), generateCertificate);

export default router;
