import { Modal, useMantineTheme } from "@mantine/core";
import axios from "axios";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { uploadImage } from "../../actions/uploadAction.js";
import { updateUser } from "../../actions/userAction.js";
import "./ProfileModal.css";

function ProfileModal({ modalOpened, setModalOpened, data }) {
  const theme = useMantineTheme();

  const { password, ...other } = data;
  const [formData, setFormData] = useState(other);

  const [profileImage, setProfileImage] = useState(null);
  const [coverImage, setCoverImage] = useState(null);

  const dispatch = useDispatch();
  const param = useParams();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const onImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      let img = event.target.files[0];
      event.target.name === "profileImage"
        ? setProfileImage(img)
        : setCoverImage(img);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let UserData = { ...formData };

    try {
      // Handle profile image upload
      if (profileImage) {
        const data = new FormData();
        const fileName = Date.now() + profileImage.name;
        data.append("name", fileName);
        data.append("file", profileImage);
        data.append("upload_preset", "upload");
        UserData.profilePicture = fileName;
        const uploadRes = await axios.post(
          "https://api.cloudinary.com/v1_1/dsj99epbt/image/upload",
          data
        );
        UserData.profilePicture = uploadRes.data.url;
      }

      // Handle cover image upload
      if (coverImage) {
        const data = new FormData();
        const fileName = Date.now() + coverImage.name;
        data.append("name", fileName);
        data.append("file", coverImage);
        data.append("upload_preset", "uploadv2");
        UserData.coverPicture = fileName;
        const uploadRes = await axios.post(
          "https://api.cloudinary.com/v1_1/dsj99epbt/image/upload",
          data
        );
        UserData.coverPicture = uploadRes.data.url;
      }

      // Update user with the modified UserData
      await dispatch(updateUser(param.id, UserData));
      setModalOpened(false);
    } catch (err) {
      console.error("Error during submission:", err);
      // Optionally, notify the user of the error (e.g., with a toast or alert)
      alert("An error occurred while updating your profile. Please try again.");
    }
  };
  return (
    <Modal
      overlayColor={
        theme.colorScheme === "dark"
          ? theme.colors.dark[9]
          : theme.colors.gray[2]
      }
      overlayOpacity={0.55}
      overlayBlur={3}
      size="100%"
      opened={modalOpened}
      onClose={() => setModalOpened(false)}
    >
      <form className="infoForm">
        <h3>Your info</h3>

        <div>
          <input
            type="text"
            className="infoInput"
            name="firstname"
            placeholder="First Name"
            onChange={handleChange}
            value={formData.Firstname}
          />

          <input
            type="text"
            className="infoInput"
            name="lastname"
            placeholder="Last Name"
            onChange={handleChange}
            value={formData.Lastname}
          />
        </div>

        <div>
          <input
            type="text"
            className="infoInput"
            name="worksAt"
            placeholder="Works at"
            onChange={handleChange}
            value={formData.WorksAt}
          />
        </div>

        <div>
          <input
            type="text"
            className="infoInput"
            name="livesin"
            placeholder="Lives in"
            onChange={handleChange}
            value={formData.LivesIn}
          />

          <input
            type="text"
            className="infoInput"
            name="country"
            placeholder="Country"
            onChange={handleChange}
            value={formData.Country}
          />
        </div>

        <div>
          <input
            type="text"
            className="infoInput"
            name="relationship"
            placeholder="RelationShip Status"
            onChange={handleChange}
            value={formData.Relationship}
          />
        </div>
        <div>
          <div className="profile_image">
            <div>
              <label htmlFor=""> Profile Image</label>
              <input type="file" name="profileImage" onChange={onImageChange} />
            </div>

            <div className="mt-lg-0 mt-2">
              <label htmlFor=""> Cover Image</label>

              <input type="file" name="coverImage" onChange={onImageChange} />
            </div>
          </div>
        </div>

        <button className="button infoButton mt-5" onClick={handleSubmit}>
          Update
        </button>
      </form>
    </Modal>
  );
}

export default ProfileModal;
