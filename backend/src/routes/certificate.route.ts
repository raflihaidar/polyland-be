import express from "express";
import {
  generateCertificate,
  getCertificates,
  getDetailCertificate,
  verifyCertificate,
  searchCertificate,
  updateLabelCertificate,
} from "../controllers/certificate.controller.js";
import { authentication } from "../middlewares/authentication.js";
import { authorize } from "../middlewares/authorization.js";

const router = express.Router();

router.get("/verify/:tokenId", verifyCertificate);
router.use(authentication);

router.get("/", getCertificates);
router.get("/search", searchCertificate);
router.get("/:certificateId", getDetailCertificate);
router.put("/:id", updateLabelCertificate);
router.post(
  "/generate",
  authorize("verifikasi-akun", "read"),
  generateCertificate,
);

export default router;
