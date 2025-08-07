import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    desc: String,
    likes: [],
    image: String,
  },
  { timestamps: true }
);

const postModel = mongoose.model("Posts", PostSchema);

export default postModel;
