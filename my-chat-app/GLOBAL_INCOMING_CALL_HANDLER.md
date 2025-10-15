# Global Incoming Call Handler Implementation

## Overview

The `GlobalIncomingCallHandler` component is a comprehensive solution for handling incoming audio and video calls across **all routes** in your application. This component ensures that users can receive and respond to calls regardless of which page they're currently viewing.

## Key Features

### ✅ Global Call Reception

- **Works on All Routes**: Displays incoming call modal on any page (Home, Profile, Friend List, etc.)
- **Smart Route Detection**: Automatically defers to ChatBox component when user is on the `/chat` page to avoid conflicts
- **Persistent WebSocket Connection**: Maintains connection across route changes

### ✅ Full Call Functionality

- **Accept Calls**:
  - Checks media permissions (camera/microphone)
  - Generates Agora token automatically
  - Joins Agora channel
  - Sends acceptance signal to caller
  - Navigates to video call page with full call data
- **Decline Calls**:
  - Sends rejection signal to caller
  - Stops ringing sound
  - Cleans up resources
- **Auto-Decline**:
  - Automatically declines unanswered calls after 60 seconds
  - Prevents zombie call states

### ✅ Beautiful UI

- **Material-UI Components**: Professional, modern design
- **Dark/Light Theme Support**: Automatically adapts to current theme
- **Smooth Animations**:
  - Fade and slide transitions
  - Pulse ring effect during ringing
  - Bounce animations for buttons and icons
- **Responsive Design**: Works perfectly on mobile and desktop

### ✅ Audio Feedback

- **Ringing Sound**: Plays during incoming call
- **Volume Control**: Set to 50% for comfortable experience
- **Auto-Cleanup**: Stops sound when call is accepted/declined

## Architecture

### Component Structure

```
GlobalIncomingCallHandler/
├── GlobalIncomingCallHandler.jsx    # Main component
└── globalIncomingCallHandler.css    # Styles and animations
```

### Integration Points

1. **App.js**: Component is mounted at the root level

```jsx
<GlobalIncomingCallHandler />
```

2. **WebSocketService**: Listens for incoming call signals

```javascript
// Registers handler for 'agora-signal' messages with action 'call-request'
WebSocketService.addMessageHandler(handleMessage);
```

3. **Agora RTC**: Manages media tracks and channel joining

```javascript
// Creates and manages:
- agoraClient (RTC client)
- localAudioTrack (microphone)
- localVideoTrack (camera - for video calls)
```

4. **React Router**: Navigation to video call page

```javascript
navigate("/video-call", { state: { callData } });
```

## How It Works

### 1. Receiving a Call

```
Caller initiates call → WebSocket signal sent → GlobalIncomingCallHandler receives
→ Modal appears → Ringing sound plays → 60s timeout starts
```

**WebSocket Message Format**:

```json
{
  "type": "agora-signal",
  "data": {
    "action": "call-request",
    "senderId": "caller-user-id",
    "targetId": "receiver-user-id",
    "channel": "chat_123_1234567890",
    "callType": "video",
    "timestamp": 1234567890123
  }
}
```

### 2. Accepting a Call

```
User clicks "Accept" → Media permissions checked → Agora token generated
→ Acceptance signal sent → Agora channel joined → Navigate to /video-call
```

**Acceptance Signal**:

```json
{
  "type": "agora-signal",
  "data": {
    "action": "call-accepted",
    "targetId": "caller-user-id",
    "channel": "chat_123_1234567890",
    "timestamp": 1234567890123
  }
}
```

### 3. Declining a Call

```
User clicks "Decline" (or 60s timeout) → Rejection signal sent
→ Ringing stops → Modal closes → Resources cleaned up
```

**Rejection Signal**:

```json
{
  "type": "agora-signal",
  "data": {
    "action": "call-rejected",
    "targetId": "caller-user-id",
    "channel": "chat_123_1234567890",
    "timestamp": 1234567890123
  }
}
```

## State Management

### Component State

```javascript
const [incomingCall, setIncomingCall] = useState(null);
// Stores: { callerId, channel, callType, timestamp }

const [isRinging, setIsRinging] = useState(false);
// Controls ringing sound and animations

const [callerData, setCallerData] = useState(null);
// Stores caller's profile data (username, avatar)

const [isDarkTheme, setIsDarkTheme] = useState(false);
// Tracks current theme for UI styling
```

### Refs

```javascript
const ringingAudioRef = useRef(null);
// Audio element for ringing sound

const agoraClient = useRef(null);
// Agora RTC client instance

const localAudioTrack = useRef(null);
const localVideoTrack = useRef(null);
// Media tracks for audio/video

const callTimeoutRef = useRef(null);
// 60-second auto-decline timeout
```

## Route Compatibility

### Works On:

- ✅ `/home` - Home page
- ✅ `/profile/:id` - User profile pages
- ✅ `/friend` - Friend management
- ✅ `/friend-request` - Friend requests
- ✅ `/friend_list` - Friends list
- ✅ `/addMessenger` - Add messenger
- ✅ `/video-call` - Video call page (can receive new calls during a call)
- ✅ Any other authenticated route

### Smart Deferral:

- ⚠️ `/chat` - Defers to ChatBox component's built-in call handler
  - Prevents duplicate modals
  - ChatBox has direct access to chat context
  - Better UX when already in conversation

## Comparison: ChatBox vs GlobalIncomingCallHandler

| Feature         | ChatBox                   | GlobalIncomingCallHandler    |
| --------------- | ------------------------- | ---------------------------- |
| **Scope**       | Only on `/chat` page      | All routes except `/chat`    |
| **Caller Info** | Has chat context          | Fetches user data via API    |
| **Use Case**    | Direct chat conversations | Anywhere else in app         |
| **Priority**    | High (takes precedence)   | Defers to ChatBox on `/chat` |

## Configuration

### Environment Variables Required

```env
REACT_APP_AGORA_APP_ID=your_agora_app_id
REACT_APP_AGORA_APP_CERTIFICATE=your_agora_certificate
REACT_APP_WS_URL=wss://your-backend-url/ws
```

### Customization Options

#### Change Auto-Decline Timeout

```javascript
// In handleIncomingCall function, change from 60000 (60s) to desired value
callTimeoutRef.current = setTimeout(() => {
  handleDeclineCall();
}, 60000); // Change this value
```

#### Change Ringing Volume

```javascript
// In handleIncomingCall function
ringingAudioRef.current.volume = 0.5; // Change from 0.5 (50%) to desired level
```

#### Customize Theme Colors

Edit `globalIncomingCallHandler.css`:

```css
/* For accept button */
backgroundColor: "#2ECC71" /* Change to your color */

/* For decline button */
backgroundColor: "#ff4d4f" /* Change to your color */

/* For pulse ring effect */
background: radial-gradient(circle, rgba(56, 139, 253, 0.15) 0%, transparent 70%)
```

## Troubleshooting

### Issue: Modal Not Appearing

**Possible Causes**:

1. WebSocket not connected
   - Check browser console for connection errors
   - Verify `REACT_APP_WS_URL` is correct
2. Currently on `/chat` page

   - Component defers to ChatBox on that route
   - Navigate to another page to test

3. User ID not available
   - Check Redux store: `useSelector((state) => state.authReducer.authData)`
   - Ensure user is logged in

### Issue: Cannot Accept Call

**Possible Causes**:

1. Media permissions denied
   - Browser should show permission prompt
   - Check browser settings to allow camera/microphone
2. Agora configuration missing

   - Verify environment variables are set
   - Check `.env` file has `REACT_APP_AGORA_APP_ID`

3. Network issues
   - Check internet connection
   - Verify firewall allows WebRTC connections

### Issue: No Ringing Sound

**Possible Causes**:

1. Browser autoplay policy

   - User must interact with page first
   - Some browsers block autoplay audio

2. Volume muted
   - Check system volume
   - Check browser tab is not muted

## Testing Scenarios

### Test Case 1: Receive Call on Home Page

1. User A is on `/home` page
2. User B initiates call to User A
3. ✅ Modal should appear on User A's home page
4. ✅ Ringing sound should play
5. User A clicks "Accept"
6. ✅ Should navigate to `/video-call` page with active call

### Test Case 2: Receive Call on Profile Page

1. User A is viewing `/profile/123`
2. User B calls User A
3. ✅ Modal should overlay the profile page
4. User A clicks "Decline"
5. ✅ Modal should close, stay on profile page

### Test Case 3: Receive Call on Chat Page

1. User A is on `/chat` page
2. User B calls User A
3. ✅ ChatBox component should handle the call (not GlobalIncomingCallHandler)
4. ✅ No duplicate modals

### Test Case 4: Call Timeout

1. User A receives call
2. Wait 60 seconds without responding
3. ✅ Modal should auto-close
4. ✅ Rejection signal should be sent
5. ✅ Caller should see "No answer" message

## Future Enhancements

### Potential Improvements

1. **Call History**: Track missed/declined calls
2. **Quick Reply**: Add "I'll call you back" option
3. **Do Not Disturb**: Allow users to silence calls temporarily
4. **Custom Ringtones**: Let users upload custom sounds
5. **Multiple Simultaneous Calls**: Queue incoming calls
6. **Screen Share Indicator**: Show if caller wants to screen share
7. **Call Preview**: Show video preview before accepting

## Code Example: Complete Flow

```javascript
// 1. User receives call
WebSocket receives: {
  type: "agora-signal",
  data: { action: "call-request", senderId: "user123", ... }
}

// 2. GlobalIncomingCallHandler processes
handleIncomingCall() → setIncomingCall(callData) → Modal appears

// 3. User accepts
handleAcceptCall() →
  checkMediaPermissions() →
  generateAgoraToken() →
  WebSocket.sendMessage({ action: "call-accepted" }) →
  joinAgoraChannel() →
  navigate("/video-call")

// 4. Call starts on video call page
VideoCall component receives call data via route state
```

## Summary

The `GlobalIncomingCallHandler` component provides a **robust, user-friendly solution** for receiving calls anywhere in your application. It seamlessly integrates with your existing WebSocket infrastructure and Agora RTC implementation while providing an excellent user experience with beautiful animations and reliable error handling.

**Key Benefits**:

- ✅ Never miss a call regardless of current page
- ✅ Clean, professional UI with smooth animations
- ✅ Automatic resource cleanup and error handling
- ✅ Smart integration with existing ChatBox component
- ✅ Full support for both audio and video calls
- ✅ Responsive design for mobile and desktop

---

**Created**: 2025
**Component**: GlobalIncomingCallHandler
**Version**: 1.0.0
**Author**: Your Development Team
