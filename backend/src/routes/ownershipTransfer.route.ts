import express from "express";
import {
  getDashboardSummary,
  getDistribusiStatusPermohonan,
  getBlockchainSummary,
  getListApplication,
  getApplication,
  getApplicationPayment,
  getPaymentStatus,
  getMidtransNotification,
  searchApplication,
  submitApplication,
  updateApplicationStatus,
  updateApplication,
  enqueueCertificateGeneration,
  cancelPayment,
  requestMintSignature,
} from "../controllers/ownershipTransfer.controller.js";
import { authentication } from "../middlewares/authentication.js";
import { authorize } from "../middlewares/authorization.js";
import { upload, uploadUpdate } from "../middlewares/fileUpload.js";

const router = express.Router();

router.use(authentication);

router.get("/", authorize("peralihan-hak", "read"), searchApplication);
router.get(
  "/dashboard/summary/:office_id",
  authorize("peralihan-hak", "read"),
  getDashboardSummary,
);

router.get(
  "/dashboard/distribusi-status/:office_id",
  authorize("peralihan-hak", "read"),
  getDistribusiStatusPermohonan,
);

router.get(
  "/dashboard/blockchain-summary/:office_id",
  authorize("peralihan-hak", "read"),
  getBlockchainSummary,
);

router.get(
  "/:land_office_id",
  authorize("peralihan-hak", "read"),
  getListApplication,
);
router.get(
  "/payment-detail/:order_id",
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
    // ─── Dokumen tunggal (level-aplikasi) ───────────────────────────
    { name: "akta_jual_beli", maxCount: 1 },
    { name: "sppt_pbb", maxCount: 1 },
    { name: "bphtb", maxCount: 1 },
    { name: "pph", maxCount: 1 },

    // ─── Dokumen Pembeli (array, per-orang) ─────────────────────────
    { name: "ktp_pembeli", maxCount: 10 },
    { name: "kk_pembeli", maxCount: 10 },
    { name: "npwp_pembeli", maxCount: 10 },
    { name: "surat_nikah_pembeli", maxCount: 10 },

    // ─── Dokumen Penjual (array, per-orang) ─────────────────────────
    { name: "ktp_penjual", maxCount: 10 },
    { name: "kk_penjual", maxCount: 10 },
    { name: "npwp_penjual", maxCount: 10 },
    { name: "surat_nikah_penjual", maxCount: 10 },
  ]),
  submitApplication,
);
router.post(
  "/payment/:order_id/cancel",
  authorize("peralihan-hak", "update"),
  cancelPayment,
);
router.post("/enqueue-certificate/:id", enqueueCertificateGeneration);
router.post(
  "/request-mint-signature",
  authorize("peralihan-hak", "update"),
  requestMintSignature,
);
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
      // ─── Dokumen tunggal (level-aplikasi) ───────────────────────────
      { name: "akta_jual_beli", maxCount: 1 },
      { name: "sppt_pbb", maxCount: 1 },
      { name: "bphtb", maxCount: 1 },
      { name: "pph", maxCount: 1 },

      // ─── Dokumen Pembeli (array, per-orang) ─────────────────────────
      { name: "ktp_pembeli", maxCount: 10 },
      { name: "kk_pembeli", maxCount: 10 },
      { name: "npwp_pembeli", maxCount: 10 },
      { name: "surat_nikah_pembeli", maxCount: 10 },

      // ─── Dokumen Penjual (array, per-orang) ─────────────────────────
      { name: "ktp_penjual", maxCount: 10 },
      { name: "kk_penjual", maxCount: 10 },
      { name: "npwp_penjual", maxCount: 10 },
      { name: "surat_nikah_penjual", maxCount: 10 },
    ]);

    upload(req, res, function (err) {
      if (err) return next(err);
      next();
    });
  },
  updateApplication,
);

export default router;
