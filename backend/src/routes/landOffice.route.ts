import { Router } from "express";
import {
  createLandOffice,
  getLandOffices,
  getStatusOperationalOffice,
  getLandOfficeById,
  updateLandOffice,
  deleteLandOffice,
} from "../controllers/landOffice.controller";
import { authentication } from "../middlewares/authentication";
import { authorize } from "../middlewares/authorization";

const router = Router();

router.use(authentication);

router.post("/", authorize("kantah", "create"), createLandOffice);
router.get(
  "/:id/status",
  authorize("kantah", "read"),
  getStatusOperationalOffice,
);
router.get("/", authorize("kantah", "read"), getLandOffices);
router.get("/:id", authorize("kantah", "read"), getLandOfficeById);
router.put("/:id", authorize("kantah", "update"), updateLandOffice);
router.delete("/:id", authorize("kantah", "delete"), deleteLandOffice);

export default router;
