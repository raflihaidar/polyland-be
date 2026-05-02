import express from "express";
import {
  generateCertificate,
  getCertificates,
  getDetailCertificate,
  verifyCertificate,
} from "../controllers/certificate.controller";
import { authentication } from "../middlewares/authentication";
import { authorize } from "../middlewares/authorization";

const router = express.Router();

router.get("/verify/:tokenId", verifyCertificate);
router.use(authentication);

router.get("/", getCertificates);
router.get("/:certificateId", getDetailCertificate);
router.post(
  "/generate",
  authorize("verifikasi-akun", "read"),
  generateCertificate,
);

export default router;
