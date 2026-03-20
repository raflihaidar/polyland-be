import { Router } from "express";
import {
  createLandOffice,
  getLandOffices,
  getLandOfficeById,
  updateLandOffice,
  deleteLandOffice,
} from "../controllers/landOffice.controller";
import { authentication } from "../middlewares/authentication";

const router = Router();

router.use(authentication);

router.post("/", createLandOffice);
router.get("/", getLandOffices);
router.get("/:id", getLandOfficeById);
router.put("/:id", updateLandOffice);
router.delete("/:id", deleteLandOffice);

export default router;