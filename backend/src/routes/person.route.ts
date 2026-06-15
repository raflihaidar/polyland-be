import express from "express";
import {
  searchPerson,
  getAllUser,
  getDetailUser,
  deleteUser,
  updatePerson,
} from "../controllers/person.controller.js";
import { authentication } from "../middlewares/authentication.js";
import { authorize } from "../middlewares/authorization.js";

const router = express.Router();

router.use(authentication);

router.get("/search", authorize("user", "read"), searchPerson);
router.get("/", authorize("user", "read"), getAllUser);
router.get("/detail/:id", authorize("user", "read"), getDetailUser);
router.delete("/:id", authorize("user", "delete"), deleteUser);
router.put("/:id", authorize("user", "update"), updatePerson);

export default router;
