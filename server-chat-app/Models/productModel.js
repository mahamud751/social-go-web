import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    mobileicon: {
      type: String,
    },
    desktopicon: {
      type: String,
    },
    brandicon: {
      type: String,
    },
  },
  { timestamps: true }
);

const productModel = mongoose.model("Product", ProductSchema);

export default productModel;
