import express from "express";
import {
  getListApplication,
  getApplication,
  getApplicationPayment,
  getPaymentStatus,
  searchApplication,
  submitApplication,
  updateApplicationStatus,
  updateApplication,
  verifyPayment,
  cancelPayment,
} from "../controllers/ownershipTransfer.controller.js";
import { authentication } from "../middlewares/authentication.js";
import { authorize } from "../middlewares/authorization.js";
import { upload, uploadUpdate } from "../middlewares/fileUpload.js";

const router = express.Router();

router.use(authentication);

router.get("/", authorize("peralihan-hak", "read"), searchApplication);
router.get(
  "/:land_office_id",
  authorize("peralihan-hak", "read"),
  getListApplication,
);
router.get(
  "/payment-detail/:id",
  authorize("peralihan-hak", "read"),
  getApplicationPayment,
);
router.get(
  "/payment-status/:order_id",
  authorize("peralihan-hak", "read"),
  getPaymentStatus,
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
router.post(
  "/payment/:order_id/cancel",
  authorize("peralihan-hak", "update"),
  cancelPayment,
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
