import express from "express";
import { searchPerson } from "../controllers/person.controller";
import { authentication } from "../middlewares/authentication";
// import { authorize } from "../middlewares/authorization";

const router = express.Router();

router.use(authentication);

router.get("/search", searchPerson);

export default router;
