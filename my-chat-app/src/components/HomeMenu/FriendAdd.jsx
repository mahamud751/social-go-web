import Grid from "@mui/material/Unstable_Grid2";
import React, { useEffect } from "react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { getAllUser } from "../../api/UserRequest";

import User from "../User/User";

const FriendAdd = ({ location }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [persons, setPersons] = useState([]);

  useEffect(() => {
    const fetchPersons = async () => {
      const { data } = await getAllUser();
      setPersons(data);
    };
    fetchPersons();
  }, [user]);
  console.log("persons", persons);

  return (
    <div>
      <h3>People you may know</h3>

      <Grid container spacing={2} sx={{ overflow: "scroll" }}>
        {persons?.map((person, id) => {
          if (person.ID !== user.ID)
            return (
              <Grid item xs={6} md={3} key={person.ID}>
                <User person={person} key={id} />
              </Grid>
            );
        })}
      </Grid>
    </div>
  );
};

export default FriendAdd;
