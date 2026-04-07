import express from "express";
import { check, submit, verify } from "../controllers/verificationAccount.controller";
import { authentication } from "../middlewares/authentication";
import { authorize } from "../middlewares/authorization";

const router = express.Router();

router.use(authentication);

router.get("/check-account", authorize("verifikasi-akun", "read"), check);
router.post("/submit", authorize("verifikasi-akun", "create"), submit);
router.post("/verify/:id", authorize("verifikasi-akun", "update"), verify);

export default router;
