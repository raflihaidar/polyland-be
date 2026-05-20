import { Router } from "express";
import { createHeadOffice } from "../controllers/officer.controller.js";
import { authentication } from "../middlewares/authentication.js";
import { authorize } from "../middlewares/authorization.js";

const router = Router();

router.use(authentication);

router.post("/head-office", authorize("kantah", "create"), createHeadOffice);

export default router;
