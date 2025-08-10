import React, { useEffect, useState } from "react";
import "./infoCard.css";
import { UilPen } from "@iconscout/react-unicons";
import ProfileModal from "../profileModal/ProfileModal";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import * as UserApi from "../../api/UserRequest.js";
import { logout } from "../../actions/AuthAction";

const InfoCard = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const [modalOpened, setModalOpened] = useState(false);
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
    <div className="infoCard m-3">
      <div className="infoHead">
        <h4>Profile Info</h4>
        {user.ID === profileUserId ? (
          <div>
            <UilPen
              width="2rem"
              height="1.2rem"
              onClick={() => setModalOpened(true)}
              style={{ color: "white" }}
            />
            <ProfileModal
              modalOpened={modalOpened}
              setModalOpened={setModalOpened}
              data={user}
              style={{ width: "100%" }}
            />
          </div>
        ) : (
          ""
        )}
      </div>

      <div className="info">
        {/* */}
        <span>
          <b>Status: </b>
        </span>
        <span>{profileUser.Relationship}</span>
      </div>
      <div className="info">
        <span>
          <b>Lives in: </b>
        </span>
        <span>{profileUser.LivesIn}</span>
      </div>
      <div className="info">
        <span>
          <b>Works at: </b>
        </span>
        <span>{profileUser.WorksAt}</span>
      </div>

      <button className="button logout-button" onClick={handleLogOut}>
        Log Out
      </button>
    </div>
  );
};

export default InfoCard;
