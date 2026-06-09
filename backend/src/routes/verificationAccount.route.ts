import express from "express";
import {
  check,
  getAllAccount,
  submit,
  verify,
} from "../controllers/verificationAccount.controller.js";
import { authentication } from "../middlewares/authentication.js";
import { authorize } from "../middlewares/authorization.js";

const router = express.Router();

router.use(authentication);

router.get(
  "/list-account",
  authorize("verifikasi-akun", "read"),
  getAllAccount,
);
router.get("/check-account", authorize("verifikasi-akun", "read"), check);
router.post("/submit", authorize("verifikasi-akun", "create"), submit);
router.post("/verify/:id", authorize("verifikasi-akun", "update"), verify);

export default router;
