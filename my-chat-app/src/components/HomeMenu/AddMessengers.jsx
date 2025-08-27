import Grid from "@mui/material/Unstable_Grid2";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { userChats } from "../../api/ChatRequest";
import { getAllUser } from "../../api/UserRequest";
import MessengerAdd from "../User/MessengerAdd";
import { CircularProgress, Typography, Box, Fade, Zoom } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import "./addMessengers.css";
const AddMessengers = ({ location }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [persons, setPersons] = useState([]);
  const [member, setMember] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOnline, setFilterOnline] = useState(false);

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersResponse, chatsResponse] = await Promise.all([
          getAllUser(),
          userChats(user.ID),
        ]);

        setPersons(usersResponse.data);
        setMember(chatsResponse.data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.ID) {
      fetchData();
    }
  }, [user]);

  // Process data to get available users
  const getAvailableUsers = () => {
    const allMembersId = persons.map((pd) => pd.ID);
    const newMemberId = member.map((pd) => pd.Members[1]);
    const newMemberId2 = member.map((pd) => pd.Members[0]);

    const newMembersId = allMembersId.filter((element) =>
      newMemberId.includes(element)
    );

    const newMembersDetails = newMembersId.map((id) =>
      persons.find((el) => el.ID === id)
    );

    const result = persons.filter(function (o1) {
      return !newMembersDetails.some(function (o2) {
        return o1.ID === o2.ID;
      });
    });

    const newMembersId3 = result.filter((element) =>
      newMemberId2.includes(element.ID)
    );

    const availableUsers = result.filter(function (o1) {
      return !newMembersId3.some(function (o2) {
        return o1.ID === o2.ID;
      });
    });

    // Filter out current user
    return availableUsers.filter((user_item) => user_item.ID !== user.ID);
  };

  // Filter users based on search and online status
  const getFilteredUsers = () => {
    let filtered = getAvailableUsers();

    if (searchTerm) {
      filtered = filtered.filter(
        (user_item) =>
          user_item.Username?.toLowerCase().includes(
            searchTerm.toLowerCase()
          ) || user_item.Email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterOnline) {
      // Assuming we have an isOnline property, otherwise show all
      filtered = filtered.filter((user_item) => user_item.isOnline !== false);
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  if (loading) {
    return (
      <div
        className={`add-messengers-container ${
          isDarkTheme ? "dark" : "light"
        } loading`}
      >
        <Box className="loading-container">
          <CircularProgress
            size={60}
            sx={{
              color: isDarkTheme ? "#f5c32c" : "#1976d2",
              mb: 2,
            }}
          />
          <Typography
            variant="h6"
            className="loading-text"
            sx={{ color: isDarkTheme ? "#ffffff" : "#000000" }}
          >
            Discovering people you may know...
          </Typography>
        </Box>
      </div>
    );
  }

  return (
    <div
      className={`add-messengers-container ${isDarkTheme ? "dark" : "light"}`}
    >
      <div className="messengers-header">
        <div className="header-content">
          <div className="title-section">
            <PeopleIcon className="title-icon" />
            <Typography variant="h4" component="h3" className="section-title">
              People you may know
            </Typography>
          </div>

          <div className="stats-section">
            <Typography className="stats-text">
              {filteredUsers.length}{" "}
              {filteredUsers.length === 1 ? "person" : "people"} available
            </Typography>
          </div>
        </div>

        <div className="controls-section">
          <div className="search-container">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <button
            className={`filter-btn ${filterOnline ? "active" : ""}`}
            onClick={() => setFilterOnline(!filterOnline)}
            aria-label="Toggle online filter"
          >
            <FilterListIcon className="filter-icon" />
            <span>Online Only</span>
          </button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <Fade in={true}>
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <Typography variant="h6" className="empty-title">
              {searchTerm ? "No matches found" : "No new people to add"}
            </Typography>
            <Typography variant="body2" className="empty-description">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Check back later for new suggestions"}
            </Typography>
          </div>
        </Fade>
      ) : (
        <Fade in={true}>
          <Grid container spacing={3} className="messengers-grid">
            {filteredUsers.map((message, index) => (
              <Zoom
                in={true}
                key={message.ID}
                style={{
                  transitionDelay: `${index * 100}ms`,
                }}
              >
                <Grid item xs={12} sm={6} md={4} lg={4}>
                  <MessengerAdd message={message} />
                </Grid>
              </Zoom>
            ))}
          </Grid>
        </Fade>
      )}
    </div>
  );
};

export default AddMessengers;
