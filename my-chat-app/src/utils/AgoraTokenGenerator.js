// src/utils/AgoraTokenGenerator.js
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { convertToAgoraUid } from "./AgoraUtils";

/**
 * Generate Agora RTC token for frontend-only implementation
 * @param {string} appId - Agora App ID
 * @param {string} appCertificate - Agora App Certificate
 * @param {string} channelName - Channel name
 * @param {string|number} uid - User ID
 * @param {string} role - User role (publisher or subscriber)
 * @returns {string} Agora RTC token
 */
export const generateAgoraToken = (
  appId,
  appCertificate,
  channelName,
  uid,
  role = "publisher"
) => {
  // Validate required parameters
  if (!appId || !appCertificate || !channelName || !uid) {
    throw new Error("Missing required parameters for token generation");
  }

  // Convert string user ID to numeric value as required by Agora
  const numericUid = convertToAgoraUid(uid);

  // Convert role to Agora enum
  const rtcRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  // Set token expiration time (24 hours)
  const expirationTimeInSeconds = 3600 * 24;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // Generate the token
  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      numericUid,
      rtcRole,
      privilegeExpiredTs
    );

    console.log(
      "Agora token generated successfully for channel:",
      channelName,
      "uid:",
      numericUid
    );
    return token;
  } catch (error) {
    console.error("Failed to generate Agora token:", error);
    throw new Error("Failed to generate Agora token: " + error.message);
  }
};

/**
 * Generate a temporary user ID for Agora
 * @returns {number} Random user ID
 */
export const generateAgoraUID = () => {
  // Generate a random UID between 1 and 2^32-1
  return Math.floor(Math.random() * (Math.pow(2, 32) - 1)) + 1;
};

/**
 * Generate Agora token using environment variables
 * @param {string} channelName - Channel name
 * @param {string|number} uid - User ID
 * @param {string} role - User role
 * @returns {string} Agora RTC token
 */
export const generateTokenFromEnv = (channelName, uid, role = "publisher") => {
  const appId = process.env.REACT_APP_AGORA_APP_ID;
  const appCertificate = process.env.REACT_APP_AGORA_APP_CERTIFICATE;

  if (!appCertificate) {
    throw new Error(
      "Agora App Certificate not found in environment variables. Please add REACT_APP_AGORA_APP_CERTIFICATE to your .env file."
    );
  }

  return generateAgoraToken(appId, appCertificate, channelName, uid, role);
};

export default { generateAgoraToken, generateAgoraUID, generateTokenFromEnv };
