import React, { useEffect, useState } from "react";
import "./infoCard.css";
import { UilPen } from "@iconscout/react-unicons";
import ProfileModal from "../profileModal/ProfileModal";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import * as UserApi from "../../api/UserRequest.js";
import { logout } from "../../actions/AuthAction";

const InfoCard = ({ isCurrentUser }) => {
  const dispatch = useDispatch();
  const params = useParams();
  const [profileModal, setProfileModal] = useState(false);
  const profileUserId = params.id;
  const [profileUser, setProfileUser] = useState({});
  const { user } = useSelector((state) => state.authReducer.authData);

  const handleLogOut = () => {
    dispatch(logout());
  };

  useEffect(() => {
    const fetchProfileUser = async () => {
      if (profileUserId === user.ID) {
        setProfileUser(user);
      } else {
        console.log("fetching");
        const profileUser = await UserApi.getUser(profileUserId);
        setProfileUser(profileUser);
        console.log(profileUser);
      }
    };
    fetchProfileUser();
  }, [profileUserId, user]);

  return (
    <div className="infoCard animated-card">
      <div className="infoHead">
        <h4>Profile Info</h4>
        {user.ID === profileUserId ? (
          <div className="edit-icon-wrapper">
            <UilPen
              width="2rem"
              height="1.2rem"
              onClick={() => setProfileModal(true)}
              className="edit-icon"
            />
            <ProfileModal
              profileModal={profileModal}
              setProfileModal={setProfileModal}
              data={user}
              style={{ width: "100%" }}
            />
          </div>
        ) : (
          ""
        )}
      </div>

      <div className="info animated-info">
        <span>
          <b>Status: </b>
        </span>
        <span>{profileUser.Relationship || "Not specified"}</span>
      </div>
      <div className="info animated-info">
        <span>
          <b>Lives in: </b>
        </span>
        <span>{profileUser.LivesIn || "Not specified"}</span>
      </div>
      <div className="info animated-info">
        <span>
          <b>Works at: </b>
        </span>
        <span>{profileUser.WorksAt || "Not specified"}</span>
      </div>
      {isCurrentUser && (
        <button
          className="button logout-button animated-button"
          onClick={handleLogOut}
        >
          Log Out
        </button>
      )}
    </div>
  );
};

export default InfoCard;
