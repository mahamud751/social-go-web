// src/utils/AgoraUtils.js
/**
 * Utility functions for Agora integration
 */

/**
 * Convert a string user ID to a numeric value as required by Agora
 * @param {string|number} uid - User ID (string or number)
 * @returns {number} Numeric user ID
 */
export const convertToAgoraUid = (uid) => {
  // If already a number, return as is
  if (typeof uid === "number") {
    return uid;
  }

  // If it's a string, convert to numeric
  if (typeof uid === "string") {
    // Convert string ID to numeric using a hash-based approach to ensure consistency
    const numericUid = uid.split("").reduce((acc, char) => {
      return (acc * 31 + char.charCodeAt(0)) % (Math.pow(2, 32) - 1);
    }, 0);

    // Ensure the numeric UID is within Agora's valid range (1 to 2^32-1)
    // If the result is 0, use 1 instead as Agora doesn't allow UID 0 for token generation
    return numericUid === 0 ? 1 : numericUid;
  }

  // For any other type, convert to string first then to numeric
  return convertToAgoraUid(String(uid));
};

/**
 * Validate if a user ID is valid for Agora
 * @param {number} uid - User ID
 * @returns {boolean} Whether the UID is valid
 */
export const isValidAgoraUid = (uid) => {
  return (
    typeof uid === "number" &&
    uid >= 1 &&
    uid <= Math.pow(2, 32) - 1 &&
    !isNaN(uid) &&
    isFinite(uid)
  );
};

export default { convertToAgoraUid, isValidAgoraUid };
