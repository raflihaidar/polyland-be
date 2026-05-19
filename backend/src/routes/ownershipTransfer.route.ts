import express from "express";
import {
  getListApplication,
  getApplication,
  searchApplication,
  submitApplication,
  updateApplicationStatus,
  updateApplication,
  verifyPayment,
} from "../controllers/ownershipTransfer.controller";
import { authentication } from "../middlewares/authentication";
import { authorize } from "../middlewares/authorization";
import { upload, uploadUpdate } from "../middlewares/fileUpload";

const router = express.Router();

router.use(authentication);

router.get("/", authorize("peralihan-hak", "read"), searchApplication);
router.get(
  "/:land_office_id",
  authorize("peralihan-hak", "read"),
  getListApplication,
);
router.get("/detail/:id", authorize("peralihan-hak", "read"), getApplication);
router.post(
  "/submit",
  authorize("peralihan-hak", "create"),
  upload.fields([
    { name: "cert_file", maxCount: 1 },
    { name: "akta_jual_beli", maxCount: 1 },
    { name: "fc_sppt", maxCount: 1 },
    { name: "fc_pbb", maxCount: 1 },
    { name: "ssb", maxCount: 1 },

    // array files
    { name: "ktp_pembeli", maxCount: 10 },
    { name: "ktp_penjual", maxCount: 10 },
    { name: "kk_pembeli", maxCount: 10 },
  ]),
  submitApplication,
);
router.put("/verify/payment/:id", verifyPayment);
router.put(
  "/status",
  authorize("peralihan-hak", "update"),
  updateApplicationStatus,
);
router.put(
  "/:id",
  authorize("peralihan-hak", "update"),
  (req, res, next) => {
    const upload = uploadUpdate(req.params.id as string).fields([
      { name: "cert_file", maxCount: 1 },
      { name: "akta_jual_beli", maxCount: 1 },
      { name: "fc_sppt", maxCount: 1 },
      { name: "fc_pbb", maxCount: 1 },
      { name: "ssb", maxCount: 1 },

      // array files
      { name: "ktp_pembeli", maxCount: 10 },
      { name: "ktp_penjual", maxCount: 10 },
      { name: "kk_pembeli", maxCount: 10 },
    ]);

    upload(req, res, function (err) {
      if (err) return next(err);
      next();
    });
  },
  updateApplication,
);

export default router;
