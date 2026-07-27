import express from "express";
import {
  getCertificates,
  getDetailCertificate,
  verifyCertificate,
  searchCertificate,
  updateLabelCertificate,
  verifyCertMock,
} from "../controllers/certificate.controller.js";
import { authentication } from "../middlewares/authentication.js";
import { authorize } from "../middlewares/authorization.js";

const router = express.Router();

router.get("/verify-mock/:certCode", verifyCertMock);
router.get("/verify/:tokenId", verifyCertificate);
router.use(authentication);

router.get("/", authorize("sertipikatku", "read"), getCertificates);
router.get("/search", authorize("sertipikatku", "read"), searchCertificate);
router.get(
  "/:certificateId",
  authorize("sertipikatku", "read"),
  getDetailCertificate,
);
router.put("/:id", authorize("sertipikatku", "update"), updateLabelCertificate);

export default router;
