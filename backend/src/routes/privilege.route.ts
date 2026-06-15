import { Router } from "express";
import {
  assignPrivilege,
  getPrivilegeByRoleId,
  removePrivilege,
  getMyPrivileges,
} from "../controllers/privilege.controller.js";
import { authorize } from "../middlewares/authorization.js";
import { authentication } from "../middlewares/authentication.js";

const router = Router();

router.use(authentication);

router.get("/my-privileges", getMyPrivileges);
router.get("/:roleId", authorize("privilege", "read"), getPrivilegeByRoleId);
router.post(
  "/:roleId/assign",
  authorize("privilege", "create"),
  assignPrivilege,
);
router.delete(
  "/:roleId/remove",
  authorize("privilege", "delete"),
  removePrivilege,
);

export default router;
