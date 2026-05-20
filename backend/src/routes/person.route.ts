import express from "express";
import { searchPerson } from "../controllers/person.controller.js";
import { authentication } from "../middlewares/authentication.js";
// import { authorize } from "../middlewares/authorization";

const router = express.Router();

router.use(authentication);

router.get("/search", searchPerson);

export default router;
