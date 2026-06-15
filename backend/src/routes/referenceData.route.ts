import express from "express";
import { authentication } from "../middlewares/authentication.js";
import {
  getAllRole,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/referenceData.controller.js";
import { authorize } from "../middlewares/authorization.js";

const router = express.Router();

router.use(authentication);

router.get("/role", authorize("role", "read"), getAllRole);
router.post("/role/create", authorize("role", "create"), createRole);
router.put("/role/:id/update", authorize("role", "update"), updateRole);
router.delete("/role/:id/delete", authorize("role", "delete"), deleteRole);

export default router;
