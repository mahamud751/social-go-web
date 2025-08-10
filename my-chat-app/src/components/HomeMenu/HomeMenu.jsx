import React from "react";

import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import HomeIcon from "@mui/icons-material/Home";
import "./HomeMenu.css";

import { Menu } from "@mui/material";
import { logout } from "../../actions/AuthAction";

const HomeMenu = ({ location }) => {
  const [anchorElUser, setAnchorElUser] = React.useState(null);

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  const { user } = useSelector((state) => state.authReducer.authData);
  const admin = user.IsAdmin;
  const serverPublic = process.env.REACT_APP_PUBLIC_FOLDER;
  const dispatch = useDispatch();
  const handleLogOut = () => {
    dispatch(logout());
  };

  return (
    <>
      <div className="navbar_lg">
        <div>
          <div className="d-flex justify-content-between mb-4 mt-3 p-2">
            <Menu
              sx={{ mt: "45px", border: "none" }}
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
              MenuListProps={{
                disablePadding: true,
              }}
            >
              <div style={{ background: "#18191A" }}>
                <ListItem disablePadding>
                  {location === "profilePage" ? (
                    ""
                  ) : (
                    <span style={{ width: "100%" }}>
                      <Link
                        to={`/profile/${user.ID}`}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        <ListItemButton>
                          <ListItemIcon>
                            <img
                              src={
                                user.ProfilePicture
                                  ? user.ProfilePicture
                                  : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                              }
                              alt="ProfileImage"
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 50,
                              }}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={`${user.Username}`}
                            sx={{ textTransform: "capitalize", color: "black" }}
                          />
                        </ListItemButton>
                      </Link>
                    </span>
                  )}
                </ListItem>
                <ListItem disablePadding onClick={handleLogOut}>
                  <ListItemButton>
                    <ListItemIcon>
                      <i className="fa-solid fa-right-from-bracket icon_bg"></i>
                    </ListItemIcon>

                    <ListItemText primary="Log Out" />
                  </ListItemButton>
                </ListItem>
              </div>
            </Menu>
            <i
              className="fa-solid fa-bars fs-2"
              data-bs-toggle="offcanvas"
              data-bs-target="#offcanvasExample"
              aria-controls="offcanvasExample"
              style={{ cursor: "pointer", color: "white" }}
            ></i>
            <img
              src={
                user.ProfilePicture
                  ? user.ProfilePicture
                  : serverPublic +
                    "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
              }
              alt="ProfileImage"
              style={{ width: 30, height: 30, borderRadius: 50 }}
              onClick={handleOpenUserMenu}
            />
          </div>
          <div
            className="offcanvas offcanvas-start"
            tabIndex={-1}
            id="offcanvasExample"
            aria-labelledby="offcanvasExampleLabel"
            style={{ width: "75%", background: "#18191A" }}
          >
            <div className="offcanvas-body">
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 360,
                  background: "#242526",
                  height: "100vh",
                }}
              >
                <nav aria-label="main mailbox folders">
                  <List>
                    <ListItem disablePadding>
                      <Link to={"/"} style={{ width: "100%" }}>
                        <ListItemButton>
                          <ListItemIcon>
                            <HomeIcon className="icon_bg" />
                          </ListItemIcon>
                          <ListItemText primary="Home" />
                        </ListItemButton>
                      </Link>
                    </ListItem>
                    <ListItem disablePadding>
                      {location === "profilePage" ? (
                        ""
                      ) : (
                        <span style={{ width: "100%" }}>
                          <Link
                            to={`/profile/${user.ID}`}
                            style={{
                              textDecoration: "none",
                              color: "inherit",
                            }}
                          >
                            <ListItemButton>
                              <ListItemIcon>
                                <img
                                  src={
                                    user.ProfilePicture
                                      ? user.ProfilePicture
                                      : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                                  }
                                  alt="ProfileImage"
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 50,
                                  }}
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={`${user.Username}`}
                                sx={{ textTransform: "capitalize" }}
                              />
                            </ListItemButton>
                          </Link>
                        </span>
                      )}
                    </ListItem>
                    <hr />
                    <ListItem disablePadding>
                      <Link to={"/friend"} style={{ width: "100%" }}>
                        <ListItemButton>
                          <ListItemIcon>
                            <PeopleAltIcon className="icon_bg" />
                          </ListItemIcon>
                          <ListItemText primary="Find Friends" />
                        </ListItemButton>
                      </Link>
                    </ListItem>
                    <ListItem disablePadding>
                      <Link to={"/friend-request"} style={{ width: "100%" }}>
                        <ListItemButton>
                          <ListItemIcon>
                            <PeopleAltIcon className="icon_bg" />
                          </ListItemIcon>
                          <ListItemText primary="Friend Request" />
                        </ListItemButton>
                      </Link>
                    </ListItem>

                    <ListItem disablePadding>
                      <Link to={"/friend_list"} style={{ width: "100%" }}>
                        <ListItemButton>
                          <ListItemIcon>
                            <i className="fa-solid fa-message icon_bg"></i>
                          </ListItemIcon>
                          <ListItemText primary="Friend List" />
                        </ListItemButton>
                      </Link>
                    </ListItem>

                    <ListItem disablePadding>
                      <Link to={"/addMessenger"} style={{ width: "100%" }}>
                        <ListItemButton>
                          <ListItemIcon>
                            <i className="fa-solid fa-message icon_bg"></i>
                          </ListItemIcon>
                          <ListItemText primary="Add Messenger" />
                        </ListItemButton>
                      </Link>
                    </ListItem>

                    <ListItem disablePadding>
                      <Link to={"/chat"} style={{ width: "100%" }}>
                        <ListItemButton>
                          <ListItemIcon>
                            <i
                              className="fa-brands fa-facebook-messenger icon_bg"
                              // style={{ color: "red" }}
                            ></i>
                          </ListItemIcon>
                          <ListItemText primary="Messenger" />
                        </ListItemButton>
                      </Link>
                    </ListItem>
                    <hr />
                    <h6 className="ms-3">Your Shortcuts</h6>
                    <ListItem disablePadding>
                      <a
                        href={"https://www.facebook.com/groups/talkjs.net"}
                        style={{ width: "100%" }}
                      >
                        <ListItemButton>
                          <ListItemIcon>
                            <i className="fa-solid fa-person-chalkboard icon_bg"></i>
                          </ListItemIcon>
                          <ListItemText primary="Talk.js" />
                        </ListItemButton>
                      </a>
                    </ListItem>
                    <ListItem disablePadding>
                      <a
                        href={"https://www.facebook.com/groups/161616437580654"}
                        style={{ width: "100%" }}
                      >
                        <ListItemButton>
                          <ListItemIcon>
                            <i className="fa-solid fa-person-chalkboard icon_bg"></i>
                          </ListItemIcon>
                          <ListItemText primary="CSE/EEE/IT Jobs in Bangladesh" />
                        </ListItemButton>
                      </a>
                    </ListItem>
                  </List>
                </nav>
              </Box>
            </div>
          </div>
        </div>
      </div>
      <div
        className="navbar_sm"
        style={{ position: "fixed", background: "unset" }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 360,

            height: "100vh",
          }}
        >
          <nav aria-label="main mailbox folders">
            <List>
              <ListItem disablePadding>
                <Link to={"/"} style={{ width: "100%" }}>
                  <ListItemButton>
                    <ListItemIcon>
                      <HomeIcon className="icon_bg" />
                    </ListItemIcon>
                    <ListItemText primary="Home" />
                  </ListItemButton>
                </Link>
              </ListItem>
              <ListItem disablePadding>
                {location === "profilePage" ? (
                  ""
                ) : (
                  <span style={{ width: "100%" }}>
                    <Link
                      to={`/profile/${user.ID}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <ListItemButton>
                        <ListItemIcon>
                          <img
                            src={
                              user.ProfilePicture
                                ? user.ProfilePicture
                                : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                            }
                            alt="ProfileImage"
                            style={{ width: 20, height: 20, borderRadius: 50 }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${user.Username}`}
                          sx={{ textTransform: "capitalize" }}
                        />
                      </ListItemButton>
                    </Link>
                  </span>
                )}
              </ListItem>
              <hr />
              <ListItem disablePadding>
                <Link to={"/friend"} style={{ width: "100%" }}>
                  <ListItemButton>
                    <ListItemIcon>
                      <i className="fa-solid fa-person-chalkboard icon_bg"></i>
                    </ListItemIcon>
                    <ListItemText primary="Find Friends" />
                  </ListItemButton>
                </Link>
              </ListItem>
              <ListItem disablePadding>
                <Link to={"/friend-request"} style={{ width: "100%" }}>
                  <ListItemButton>
                    <ListItemIcon>
                      <PeopleAltIcon className="icon_bg" />
                    </ListItemIcon>
                    <ListItemText primary="Friend Request" />
                  </ListItemButton>
                </Link>
              </ListItem>
              <ListItem disablePadding>
                <Link to={"/friend_list"} style={{ width: "100%" }}>
                  <ListItemButton>
                    <ListItemIcon>
                      <PeopleAltIcon className="icon_bg" />
                    </ListItemIcon>
                    <ListItemText primary="Friend List" />
                  </ListItemButton>
                </Link>
              </ListItem>

              <ListItem disablePadding>
                <Link to={"/addMessenger"} style={{ width: "100%" }}>
                  <ListItemButton>
                    <ListItemIcon>
                      <i className="fa-solid fa-message icon_bg"></i>
                    </ListItemIcon>
                    <ListItemText primary="Add Messenger" />
                  </ListItemButton>
                </Link>
              </ListItem>

              <ListItem disablePadding>
                <Link to={"/chat"} style={{ width: "100%" }}>
                  <ListItemButton>
                    <ListItemIcon>
                      <i
                        className="fa-brands fa-facebook-messenger icon_bg"
                        // style={{ color: "red" }}
                      ></i>
                    </ListItemIcon>
                    <ListItemText primary="Messenger" />
                  </ListItemButton>
                </Link>
              </ListItem>

              <hr />
              <h6 className="ms-3">Your Shortcuts</h6>
              <ListItem disablePadding>
                <a
                  href={"https://www.facebook.com/groups/talkjs.net"}
                  style={{ width: "100%" }}
                >
                  <ListItemButton>
                    <ListItemIcon>
                      <i className="fa-solid fa-person-chalkboard icon_bg"></i>
                    </ListItemIcon>
                    <ListItemText primary="Talk.js" />
                  </ListItemButton>
                </a>
              </ListItem>
              <ListItem disablePadding>
                <a
                  href={"https://www.facebook.com/groups/161616437580654"}
                  style={{ width: "100%" }}
                >
                  <ListItemButton>
                    <ListItemIcon>
                      <i className="fa-solid fa-person-chalkboard icon_bg"></i>
                    </ListItemIcon>
                    <ListItemText primary="CSE/EEE/IT Jobs in Bangladesh" />
                  </ListItemButton>
                </a>
              </ListItem>
            </List>
          </nav>
        </Box>
      </div>
    </>
  );
};

export default HomeMenu;
