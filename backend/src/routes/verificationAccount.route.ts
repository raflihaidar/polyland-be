import express from "express";
import { check, submit, verify } from "../controllers/verificationAccount.controller";
import { authentication } from "../middlewares/authentication";

const router = express.Router();

router.use(authentication);

router.get("/check-account", check);
router.post("/submit", submit);
router.post("/verify/:id", verify);

export default router;
