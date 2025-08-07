import Grid from "@mui/material/Unstable_Grid2";
import React, { useEffect } from "react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { userChats } from "../../api/ChatRequest";
import { getAllUser } from "../../api/UserRequest";
import MessengerAdd from "../User/MessengerAdd";
const AddMessengers = ({ location }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [persons, setPersons] = useState([]);
  const [member, setMember] = useState([]);

  useEffect(() => {
    const fetchPersons = async () => {
      const { data } = await getAllUser();
      setPersons(data);
    };
    fetchPersons();
  }, [user]);

  useEffect(() => {
    const fetchPersons = async () => {
      const { data } = await userChats(user.ID);
      setMember(data);
    };
    fetchPersons();
  }, [user]);

  const allMembersId = persons.map((pd) => pd.ID);

  const newMemberId = member.map((pd) => pd.Members[1]);
  const newMemberId2 = member.map((pd) => pd.Members[0]);

  const newMembersId = allMembersId.filter((element) =>
    newMemberId.includes(element)
  );

  const newMembersDetails = newMembersId.map((id) =>
    persons.find((el) => el.ID == id)
  );

  const result = persons.filter(function (o1) {
    return !newMembersDetails.some(function (o2) {
      return o1.ID == o2.ID;
    });
  });

  const newMembersId3 = result.filter((element) =>
    newMemberId2.includes(element.ID)
  );

  const result2 = result.filter(function (o1) {
    return !newMembersId3.some(function (o2) {
      return o1.ID == o2.ID;
    });
  });

  return (
    <div>
      <h3>People you may know</h3>
      <Grid container spacing={2}>
        {result2.map((message, id) => {
          if (message.ID !== user.ID && newMembersId3)
            return <MessengerAdd message={message} key={id} />;
        })}
      </Grid>
    </div>
  );
};

export default AddMessengers;
