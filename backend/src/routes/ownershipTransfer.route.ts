import express from "express";
import {
  submitApplication,
  updateApplicationStatus,
  updateApplication,
} from "../controllers/ownershipTransfer.controller";
import { authentication } from "../middlewares/authentication";
import { upload, uploadUpdate } from "../middlewares/fileUpload";

const router = express.Router();

router.use(authentication);

router.post(
  "/submit",
  upload.fields([
    { name: "cert_file", maxCount: 1 },
    { name: "ktp_penjual", maxCount: 1 },
    { name: "kk_pembeli", maxCount: 1 },
    { name: "ktp_pembeli", maxCount: 1 },
    { name: "akta_jual_beli", maxCount: 1 },
    { name: "fc_sppt", maxCount: 1 },
    { name: "fc_pbb", maxCount: 1 },
  ]),
  submitApplication,
);
router.put("/status/:id", updateApplicationStatus);
router.put(
  "/:id",
  (req, res, next) => {
    const upload = uploadUpdate(req.params.id).fields([
      { name: "cert_file", maxCount: 1 },
      { name: "ktp_penjual", maxCount: 1 },
      { name: "kk_pembeli", maxCount: 1 },
      { name: "ktp_pembeli", maxCount: 1 },
      { name: "akta_jual_beli", maxCount: 1 },
      { name: "fc_sppt", maxCount: 1 },
      { name: "fc_pbb", maxCount: 1 },
    ]);

    upload(req, res, function (err) {
      if (err) return next(err);
      next();
    });
  },
  updateApplication,
);

export default router;
