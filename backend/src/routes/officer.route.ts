import { Router } from "express";
import {
  createHeadOffice,
  searchHeadOfficeByOfficeLand,
} from "../controllers/officer.controller.js";
import { authentication } from "../middlewares/authentication.js";
import { authorize } from "../middlewares/authorization.js";

const router = Router();

router.use(authentication);

router.get(
  "/head-office{/:id}",
  authorize("kantah", "read"),
  searchHeadOfficeByOfficeLand,
);

router.post("/head-office", authorize("kantah", "create"), createHeadOffice);

export default router;
