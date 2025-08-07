import UserModel from "../Models/UserModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const getAllUsers = async (req, res) => {
  try {
    let users = await UserModel.find();

    users = users.map((user) => {
      const { password, ...othersDetails } = user._doc;
      return othersDetails;
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json(err);
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (user) {
      const { password, ...othersDetails } = user._doc;

      res.status(200).json(othersDetails);
    } else {
      res.status(404).json("user not exist");
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

export const updateUser = async (req, res) => {
  const id = req.params.id;
  const { _id, currentAdminStatus, password } = req.body;

  if (id === _id) {
    try {
      if (password) {
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(password, salt);
      }

      const user = await UserModel.findByIdAndUpdate(id, req.body, {
        new: true,
      });
      const token = jwt.sign(
        { username: user.username, id: user._id },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
        }
      );
      res.status(200).json({ user, token });
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("Access failed ! You can only update your profile");
  }
};
export const deleteUser = async (req, res) => {
  const id = req.params.id;
  const { _id, currentAdminStatus, password } = req.body;

  if (id === _id || currentAdminStatus) {
    try {
      await UserModel.findByIdAndDelete(id);
      res.status(200).json("successfully deleted");
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("Access failed ! You can only delete your profile");
  }
};

export const followUser = async (req, res) => {
  const id = req.params.id;
  const { _id } = req.body;
  console.log(id, _id);
  if (_id == id) {
    res.status(403).json("Action Forbidden");
  } else {
    try {
      const followUser = await UserModel.findById(id);
      const followingUser = await UserModel.findById(_id);

      if (!followUser.followers.includes(_id)) {
        await followUser.updateOne({ $push: { followers: _id } });
        await followingUser.updateOne({ $push: { following: id } });
        res.status(200).json("User followed!");
      } else {
        res.status(403).json("you are already following this id");
      }
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
};
export const unfollowUser = async (req, res) => {
  const id = req.params.id;
  const { _id } = req.body;

  if (_id === id) {
    res.status(403).json("Action Forbidden");
  } else {
    try {
      const unFollowUser = await UserModel.findById(id);
      const unFollowingUser = await UserModel.findById(_id);

      if (unFollowUser.followers.includes(_id)) {
        await unFollowUser.updateOne({ $pull: { followers: _id } });
        await unFollowingUser.updateOne({ $pull: { following: id } });
        res.status(200).json("Unfollowed Successfully!");
      } else {
        res.status(403).json("You are not following this User");
      }
    } catch (error) {
      res.status(500).json(error);
    }
  }
};
