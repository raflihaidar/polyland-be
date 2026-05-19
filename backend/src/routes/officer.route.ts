import { Router } from "express";
import { createHeadOffice } from "../controllers/officer.controller";
import { authentication } from "../middlewares/authentication";
import { authorize } from "../middlewares/authorization";

const router = Router();

router.use(authentication);

router.post("/head-office", authorize("kantah", "create"), createHeadOffice);

export default router;