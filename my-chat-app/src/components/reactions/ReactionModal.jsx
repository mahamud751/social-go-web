import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { motion, AnimatePresence } from "framer-motion";
import { getAllUser } from "../../api/UserRequest";
import "./ReactionModal.css";

const reactions = {
  like: { emoji: "👍", label: "Like" },
  love: { emoji: "❤️", label: "Love" },
  haha: { emoji: "😂", label: "Haha" },
  wow: { emoji: "😮", label: "Wow" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😠", label: "Angry" },
  care: { emoji: "🤗", label: "Care" },
};

const ReactionModal = ({
  isOpen,
  onClose,
  reactionData,
  currentUserId,
  triggerElement,
  hasBackdrop = true,
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalPosition, setModalPosition] = useState({
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  });
  const containerRef = useRef(null);

  const computePosition = (
    rect,
    viewportWidth,
    viewportHeight,
    modalHeight
  ) => {
    const modalWidth = Math.min(520, viewportWidth - 40);
    let top = rect.top;
    let left = rect.left;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < modalHeight && spaceAbove > spaceBelow) {
      top = rect.top - Math.min(modalHeight, spaceAbove - 20);
    } else {
      top = rect.bottom + 10;
    }

    left = rect.left + rect.width / 2 - modalWidth / 2;

    if (left < 20) left = 20;
    if (left + modalWidth > viewportWidth - 20) {
      left = viewportWidth - modalWidth - 20;
    }

    if (top < 20) {
      top = 20;
    }
    const maxTop = viewportHeight - Math.min(modalHeight, viewportHeight - 40);
    if (top > maxTop) {
      top = maxTop;
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
      transform: "none",
    };
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await getAllUser();
        const userMap = {};
        data.forEach((user) => {
          userMap[user.ID] = user;
        });
        setUsers(userMap);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching users:", error);
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchUsers();

      // Calculate optimal modal position near the trigger element only in popover mode
      if (!hasBackdrop && triggerElement) {
        const rect = triggerElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const estimatedHeight =
          containerRef.current?.offsetHeight ||
          Math.min(520, viewportHeight * 0.85);
        setModalPosition(
          computePosition(rect, viewportWidth, viewportHeight, estimatedHeight)
        );
      } else {
        // Fallback to center if no trigger element
        setModalPosition({
          top: "50%",
          left: "35%",
          transform: "translate(-50%, -50%)",
        });
      }

      // Prevent body scroll only when backdrop is used
      if (hasBackdrop) {
        document.body.style.overflow = "hidden";
      }
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, triggerElement, hasBackdrop]);

  // Recalculate with actual measured height once mounted (popover mode only)
  useEffect(() => {
    if (isOpen && !hasBackdrop && triggerElement && containerRef.current) {
      const rect = triggerElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const actualHeight = containerRef.current.offsetHeight;
      setModalPosition(
        computePosition(rect, viewportWidth, viewportHeight, actualHeight)
      );
    }
  }, [isOpen, triggerElement, hasBackdrop]);

  if (!isOpen) return null;

  const getTotalCount = () => {
    if (!reactionData) return 0;
    return Object.values(reactionData).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );
  };

  const getReactionCounts = () => {
    if (!reactionData) return [];
    return Object.entries(reactionData)
      .filter(([_, userIds]) => userIds && userIds.length > 0)
      .map(([type, userIds]) => ({
        type,
        count: userIds.length,
        emoji: reactions[type]?.emoji || "👍",
        label: reactions[type]?.label || type,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const getUsersForTab = () => {
    if (!reactionData) return [];

    if (activeTab === "all") {
      const allUsers = [];
      Object.entries(reactionData).forEach(([type, userIds]) => {
        userIds?.forEach((userId) => {
          allUsers.push({ userId, reactionType: type });
        });
      });
      return allUsers;
    } else {
      const userIds = reactionData[activeTab] || [];
      return userIds.map((userId) => ({ userId, reactionType: activeTab }));
    }
  };

  const getUserDisplayName = (userId) => {
    if (userId === currentUserId) return "You";
    const user = users[userId];
    return user?.Username || `User ${userId.substring(0, 8)}`;
  };

  const getUserAvatar = (userId) => {
    const user = users[userId];
    return (
      user?.ProfilePicture ||
      "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
    );
  };

  const getTopReactors = () => {
    const allUsers = getUsersForTab();
    const displayCount = 3;
    const names = allUsers
      .slice(0, displayCount)
      .map((item) => getUserDisplayName(item.userId));

    if (allUsers.length === 0) return "";
    if (allUsers.length === 1) return names[0];
    if (allUsers.length === 2) return `${names[0]} and ${names[1]}`;
    if (allUsers.length === 3)
      return `${names[0]}, ${names[1]} and ${names[2]}`;

    const others = allUsers.length - displayCount;
    return `${names[0]}, ${names[1]}, ${names[2]} and ${others} others`;
  };

  const reactionCounts = getReactionCounts();
  const usersToShow = getUsersForTab();
  const totalCount = getTotalCount();

  return createPortal(
    <AnimatePresence>
      {hasBackdrop ? (
        <motion.div
          className="reaction-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: "auto",
          }}
        >
          <motion.div
            className="reaction-modal-container"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: modalPosition.top,
              left: modalPosition.left,
              transform: modalPosition.transform,
              zIndex: 10001,
              pointerEvents: "auto",
              margin: 0,
            }}
            ref={containerRef}
          >
            {/* Modal Header */}
            <div className="reaction-modal-header">
              <h3>Reactions</h3>
              <button className="reaction-modal-close" onClick={onClose}>
                ✕
              </button>
            </div>

            {/* Reaction Tabs */}
            <div className="reaction-tabs">
              <motion.button
                className={`reaction-tab ${
                  activeTab === "all" ? "active" : ""
                }`}
                onClick={() => setActiveTab("all")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="tab-label">All</span>
                <span className="tab-count">{totalCount}</span>
              </motion.button>
              {reactionCounts.map(({ type, count, emoji }) => (
                <motion.button
                  key={type}
                  className={`reaction-tab ${
                    activeTab === type ? "active" : ""
                  }`}
                  onClick={() => setActiveTab(type)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="tab-emoji">{emoji}</span>
                  <span className="tab-count">{count}</span>
                </motion.button>
              ))}
            </div>

            {/* Summary Text */}
            {!loading && usersToShow.length > 0 && (
              <motion.div
                className="reaction-summary-text"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {getTopReactors()}
              </motion.div>
            )}

            {/* User List */}
            <div className="reaction-users-list">
              {loading ? (
                <div className="reaction-loading">Loading reactions...</div>
              ) : usersToShow.length === 0 ? (
                <div className="reaction-empty">No reactions yet</div>
              ) : (
                <AnimatePresence mode="wait">
                  {usersToShow.map((item, index) => (
                    <motion.div
                      key={`${item.userId}-${item.reactionType}`}
                      className="reaction-user-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div className="reaction-user-info">
                        <motion.img
                          src={getUserAvatar(item.userId)}
                          alt="Avatar"
                          className="reaction-user-avatar"
                          whileHover={{ scale: 1.1 }}
                        />
                        <span className="reaction-user-name">
                          {getUserDisplayName(item.userId)}
                        </span>
                      </div>
                      <motion.div
                        className="reaction-user-emoji"
                        whileHover={{ scale: 1.3, rotate: 15 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {reactions[item.reactionType]?.emoji}
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          className="reaction-modal-container"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{
            position: "fixed",
            top: modalPosition.top,
            left: modalPosition.left,
            transform: modalPosition.transform,
            zIndex: 10001,
            pointerEvents: "auto",
            margin: 0,
          }}
          ref={containerRef}
        >
          {/* Modal Header */}
          <div className="reaction-modal-header">
            <h3>Reactions</h3>
            <button className="reaction-modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
          {/* Reaction Tabs */}
          <div className="reaction-tabs">
            <motion.button
              className={`reaction-tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="tab-label">All</span>
              <span className="tab-count">{totalCount}</span>
            </motion.button>
            {reactionCounts.map(({ type, count, emoji }) => (
              <motion.button
                key={type}
                className={`reaction-tab ${activeTab === type ? "active" : ""}`}
                onClick={() => setActiveTab(type)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="tab-emoji">{emoji}</span>
                <span className="tab-count">{count}</span>
              </motion.button>
            ))}
          </div>
          {/* Summary Text */}
          {!loading && usersToShow.length > 0 && (
            <motion.div
              className="reaction-summary-text"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {getTopReactors()}
            </motion.div>
          )}
          {/* User List */}
          <div className="reaction-users-list">
            {loading ? (
              <div className="reaction-loading">Loading reactions...</div>
            ) : usersToShow.length === 0 ? (
              <div className="reaction-empty">No reactions yet</div>
            ) : (
              <AnimatePresence mode="wait">
                {usersToShow.map((item, index) => (
                  <motion.div
                    key={`${item.userId}-${item.reactionType}`}
                    className="reaction-user-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="reaction-user-info">
                      <motion.img
                        src={getUserAvatar(item.userId)}
                        alt="Avatar"
                        className="reaction-user-avatar"
                        whileHover={{ scale: 1.1 }}
                      />
                      <span className="reaction-user-name">
                        {getUserDisplayName(item.userId)}
                      </span>
                    </div>
                    <motion.div
                      className="reaction-user-emoji"
                      whileHover={{ scale: 1.3, rotate: 15 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {reactions[item.reactionType]?.emoji}
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ReactionModal;
