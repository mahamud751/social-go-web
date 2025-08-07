import React, { useEffect, useState } from "react";

import User from "../User/User";
import { useSelector } from "react-redux";
import { getAllUser } from "../../api/UserRequest";
import "./followersCard.css";

const FollowersCard = () => {
  const [persons, setPersons] = useState([]);
  const { user } = useSelector((state) => state.authReducer.authData);

  useEffect(() => {
    const fetchPersons = async () => {
      const { data } = await getAllUser();
      setPersons(data);
    };
    fetchPersons();
  }, [user]);
  return (
    <div className="followerCard my-5">
      <h3>People you may know</h3>

      {persons.map((person, id) => {
        if (person.ID !== user.ID) return <User person={person} key={id} />;
      })}
    </div>
  );
};

export default FollowersCard;
