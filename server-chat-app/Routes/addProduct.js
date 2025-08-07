import express from "express";

import {
  createProduct,
  getAllProduct,
  getProduct,
} from "../Controllers/productController.js";

const router = express.Router();

router.post("/", createProduct);
router.get("/:id", getProduct);
router.get("/", getAllProduct);

export default router;
