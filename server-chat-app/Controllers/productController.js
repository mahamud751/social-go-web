import productModel from "../Models/productModel.js";

export const createProduct = async (req, res) => {
  const newPost = new productModel(req.body);

  try {
    await newPost.save();
    res.status(200).json("product successfully created ");
  } catch (error) {
    res.status(500).json(error);
  }
};

export const getProduct = async (req, res) => {
  const id = req.params.id;

  try {
    const post = await productModel.findById(id);
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json(error);
  }
};
export const getAllProduct = async (req, res) => {
  try {
    const post = await productModel.find({});
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json(error);
  }
};
