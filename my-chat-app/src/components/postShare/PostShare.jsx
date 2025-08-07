import React, { useState, useRef } from "react";

import "./postShare.css";
import { UilScenery } from "@iconscout/react-unicons";
import { UilPlayCircle } from "@iconscout/react-unicons";
import { UilLocationPoint } from "@iconscout/react-unicons";
import { UilTimes } from "@iconscout/react-unicons";
import { useDispatch, useSelector } from "react-redux";
import { uploadImage, uploadPost } from "../../actions/uploadAction";
import axios from "axios";
const PostShare = () => {
  const loading = useSelector((state) => state.postReducer.uploading);
  const dispatch = useDispatch();
  const [image, setImage] = useState(null);
  const imageRef = useRef();
  const serverPublic = process.env.REACT_APP_PUBLIC_FOLDER;
  const desc = useRef();
  const { user } = useSelector((state) => state.authReducer.authData);

  const onImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      let img = event.target.files[0];
      setImage(img);
    }
  };
  const reset = () => {
    setImage(null);
    desc.current.value = "";
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newPost = {
      userId: user.ID,
      desc: desc.current.value,
    };
    if (image) {
      const data = new FormData();
      const filename = Date.now() + image.name;
      data.append("name", filename);
      data.append("file", image);
      data.append("upload_preset", "upload");
      newPost.image = filename;
      console.log(newPost);
      try {
        const uploadRes = await axios.post(
          "https://api.cloudinary.com/v1_1/dsj99epbt/image/upload",
          data
        );

        const { url } = uploadRes.data;

        const newUser = {
          ...newPost,
          image: url,
        };
        dispatch(uploadPost(newUser));
      } catch (error) {
        console.log(error);
      }
    } else {
      dispatch(uploadPost(newPost));
    }
    reset();
  };
  return (
    <>
      <div className="postShare2_bg">
        <div className=" ">
          <div className="postShare2">
            <img
              src={
                user.ProfilePicture
                  ? user.ProfilePicture
                  : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
              }
              alt="ProfileImage"
            />
            <input
              ref={desc}
              required
              type="text"
              placeholder="What's happening"
            />
          </div>
          <div>
            <div className="postOptions mt-3">
              <div
                className="option"
                style={{ color: "var(--photo)" }}
                onClick={() => imageRef.current.click()}
              >
                <UilScenery />
                Photo
              </div>
              <div className="option" style={{ color: "var(--video)" }}>
                <UilPlayCircle />
                Video
              </div>{" "}
              <div className="option" style={{ color: "var(--location)" }}>
                <UilLocationPoint />
                Location
              </div>{" "}
              <button
                className="button ps-button"
                onClick={handleSubmit}
                // disabled={loading}
              >
                Share
              </button>
              <div style={{ display: "none" }}>
                <input
                  type="file"
                  name="image"
                  ref={imageRef}
                  onChange={onImageChange}
                />
              </div>
            </div>
            {image && (
              <div className="previewImage">
                <UilTimes onClick={() => setImage(null)} />
                <img src={URL.createObjectURL(image)} alt="" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PostShare;
