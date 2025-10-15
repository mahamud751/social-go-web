# Visual Guide: Global Incoming Call Handler

## 📊 Component Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

Step 1: User is browsing the app
┌──────────────┐
│ User on      │
│ /home page   │ ← Can be ANY route (/profile, /friends, etc.)
└──────────────┘

Step 2: Someone calls
┌──────────────────────────────────────────────────────────┐
│ WebSocket Service receives call-request signal          │
│ Type: "agora-signal"                                     │
│ Action: "call-request"                                   │
│ Data: { senderId, channel, callType, targetId }         │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ GlobalIncomingCallHandler processes signal              │
│ - Checks if user is on /chat (defers to ChatBox)       │
│ - Fetches caller profile data                          │
│ - Shows modal with caller info                         │
│ - Starts ringing sound                                  │
│ - Sets 60-second timeout                               │
└──────────────────────────────────────────────────────────┘

Step 3: Modal appears on screen
┌─────────────────────────────────────────────┐
│         INCOMING CALL MODAL                 │
│  ┌───────────────────────────────────┐     │
│  │    [Pulse Ring Animation]         │     │
│  │                                   │     │
│  │    ╔═══════════════════╗          │     │
│  │    ║   [User Avatar]   ║          │     │
│  │    ║   with badge 🔊   ║          │     │
│  │    ╚═══════════════════╝          │     │
│  │                                   │     │
│  │    John Doe                       │     │
│  │    [Incoming Video Call] chip     │     │
│  │                                   │     │
│  │  [Decline ❌]    [Accept ✅]       │     │
│  └───────────────────────────────────┘     │
│         🔊 Ringing sound playing           │
└─────────────────────────────────────────────┘

Step 4A: User clicks ACCEPT
┌──────────────────────────────────────────────────────────┐
│ 1. Check media permissions                              │
│    - Camera access?                                     │
│    - Microphone access?                                 │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 2. Generate Agora token (client-side)                   │
│    - Uses REACT_APP_AGORA_APP_ID                        │
│    - Uses REACT_APP_AGORA_APP_CERTIFICATE               │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 3. Send acceptance signal via WebSocket                 │
│    Type: "agora-signal"                                 │
│    Action: "call-accepted"                              │
│    Target: caller's user ID                             │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 4. Join Agora channel                                   │
│    - Create audio track                                 │
│    - Create video track (if video call)                 │
│    - Join channel with token                            │
│    - Publish tracks                                     │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 5. Navigate to /video-call page                         │
│    - Pass call data in route state                      │
│    - Pass existing Agora client                         │
│    - Pass audio/video tracks                            │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ ✅ CALL IS NOW ACTIVE                                    │
│    User can see and hear the other person               │
└──────────────────────────────────────────────────────────┘

Step 4B: User clicks DECLINE (or timeout after 60s)
┌──────────────────────────────────────────────────────────┐
│ 1. Send rejection signal via WebSocket                  │
│    Type: "agora-signal"                                 │
│    Action: "call-rejected"                              │
│    Target: caller's user ID                             │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 2. Stop ringing sound                                   │
│    - Pause audio                                        │
│    - Reset audio time to 0                              │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 3. Clean up resources                                   │
│    - Clear incoming call state                          │
│    - Clear caller data                                  │
│    - Clear timeout                                      │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ ✅ MODAL CLOSES                                          │
│    User stays on current page                           │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 Component Lifecycle

```
┌─────────────────┐
│   App Starts    │
└────────┬────────┘
         ↓
┌─────────────────────────────────────┐
│ GlobalIncomingCallHandler mounts    │
│ - Initialize Agora client           │
│ - Connect to WebSocket              │
│ - Register message handlers         │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Listening for incoming calls...     │
│ (Component stays mounted forever)   │
└────────┬────────────────────────────┘
         ↓
         │◄─────── User navigates to different routes
         │         Component stays active!
         ↓
┌─────────────────────────────────────┐
│ Incoming call signal received       │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Process call based on current route │
│ - If /chat → Skip (ChatBox handles) │
│ - If other → Show modal             │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ User responds (accept/decline)      │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Back to listening state             │
│ Ready for next call!                │
└─────────────────────────────────────┘
```

---

## 🗺️ Route Behavior Map

```
┌────────────────────────────────────────────────────────────┐
│                    ROUTE BEHAVIOR                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Route: /home                                              │
│  ✅ GlobalIncomingCallHandler active                       │
│  ✅ Shows modal on incoming call                           │
│  ✅ Can accept/decline calls                               │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Route: /profile/:id                                       │
│  ✅ GlobalIncomingCallHandler active                       │
│  ✅ Shows modal on incoming call                           │
│  ✅ Can accept/decline calls                               │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Route: /friend, /friend-request, /friend_list             │
│  ✅ GlobalIncomingCallHandler active                       │
│  ✅ Shows modal on incoming call                           │
│  ✅ Can accept/decline calls                               │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Route: /chat                                              │
│  ⚠️  GlobalIncomingCallHandler defers to ChatBox           │
│  ✅ ChatBox handles incoming calls                         │
│  ✅ No duplicate modals                                    │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Route: /video-call                                        │
│  ✅ GlobalIncomingCallHandler active                       │
│  ✅ Can receive NEW calls during existing call             │
│  ⚠️  Should implement call waiting in future               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 📱 UI State Diagram

```
                    ┌─────────────┐
                    │   No Call   │
                    │  (Hidden)   │
                    └──────┬──────┘
                           │
                    Call Signal Received
                           │
                           ↓
                    ┌─────────────┐
                    │   Ringing   │ ◄──┐
                    │ Modal Shown │    │
                    │  🔊 Sound   │    │ Modal animations
                    └──────┬──────┘    │ Pulse effects
                           │           │
              ┌────────────┼────────────┐
              │            │            │
          Decline      Timeout      Accept
              │            │            │
              ↓            ↓            ↓
         ┌────────┐  ┌─────────┐  ┌──────────┐
         │ Close  │  │  Close  │  │ Navigate │
         │ Modal  │  │  Modal  │  │ to Call  │
         └────────┘  └─────────┘  └──────────┘
              │            │            │
              └────────────┴────────────┘
                           │
                           ↓
                    ┌─────────────┐
                    │   No Call   │
                    │  (Hidden)   │
                    └─────────────┘
```

---

## 🔌 WebSocket Integration

```
┌──────────────────────────────────────────────────────────┐
│                    WEBSOCKET FLOW                        │
└──────────────────────────────────────────────────────────┘

Backend Server
      │
      │ Incoming call from User B
      │
      ↓
  WebSocket Server
      │
      │ Sends signal to User A
      │ { type: "agora-signal",
      │   data: { action: "call-request", ... } }
      ↓
  WebSocketService (Frontend)
      │
      │ Message received
      │
      ↓
  GlobalIncomingCallHandler
      │
      │ handleMessage() → handleIncomingCall()
      │
      ↓
  Modal Appears
      │
      │ User accepts call
      │
      ↓
  Send acceptance signal
      │ { type: "agora-signal",
      │   data: { action: "call-accepted", ... } }
      ↓
  WebSocket Server
      │
      │ Forwards to User B
      │
      ↓
  User B receives acceptance
  Call connects! ✅
```

---

## 🎨 Animation Timeline

```
Modal Appearance (1.5 seconds total):

0.0s  │ Modal starts appearing
      │ ↓ Fade in
0.2s  │ Background blur visible
      │ ↓ Slide up
0.4s  │ Modal visible
      │ ↓ Avatar zoom in
0.6s  │ Avatar visible
      │ ↓ Pulse ring starts
0.8s  │ Ring animation
      │ ↓ Text fade in
1.0s  │ Caller name visible
      │ ↓ Chip fade in
1.2s  │ Call type chip visible
      │ ↓ Buttons fade in
1.5s  │ Buttons visible
      │ ✅ All animations complete

Continuous Animations (while ringing):

Ring Pulse  │ ▁▂▃▄▅▄▃▂▁ │ 2s cycle
Avatar Glow │ ▁▃▅▃▁     │ 2s cycle
Badge Bounce│  ↑↓↑↓↑    │ 1s cycle
Chip Pulse  │ ▁▂▃▂▁     │ 2s cycle
```

---

## 🎯 State Management

```
┌────────────────────────────────────────────────────┐
│              COMPONENT STATE                       │
├────────────────────────────────────────────────────┤
│                                                    │
│  incomingCall (object | null)                      │
│  {                                                 │
│    callerId: "user123",                            │
│    channel: "chat_456_1234567890",                 │
│    callType: "video",                              │
│    timestamp: 1234567890123                        │
│  }                                                 │
│                                                    │
│  callerData (object | null)                        │
│  {                                                 │
│    ID: "user123",                                  │
│    Username: "John Doe",                           │
│    ProfilePicture: "https://...",                  │
│    ...                                             │
│  }                                                 │
│                                                    │
│  isRinging (boolean)                               │
│  - Controls ringing sound                          │
│  - Controls pulse animations                       │
│                                                    │
│  isDarkTheme (boolean)                             │
│  - Dark mode: true                                 │
│  - Light mode: false                               │
│                                                    │
├────────────────────────────────────────────────────┤
│              REFS (STABLE REFERENCES)              │
├────────────────────────────────────────────────────┤
│                                                    │
│  ringingAudioRef                                   │
│  - HTML audio element for ringing                  │
│                                                    │
│  agoraClient                                       │
│  - Agora RTC client instance                       │
│                                                    │
│  localAudioTrack                                   │
│  - Microphone audio track                          │
│                                                    │
│  localVideoTrack                                   │
│  - Camera video track                              │
│                                                    │
│  callTimeoutRef                                    │
│  - 60-second auto-decline timer                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

```
┌─────────────────────────────────────────────────┐
│              TECHNOLOGY STACK                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  React Hooks                                    │
│  - useState (state management)                  │
│  - useEffect (side effects)                     │
│  - useRef (stable references)                   │
│  - useCallback (memoized functions)             │
│  - useNavigate (routing)                        │
│  - useLocation (route detection)                │
│  - useSelector (Redux state)                    │
│                                                 │
│  Material-UI                                    │
│  - Modal, Box, Typography                       │
│  - Button, Avatar, Badge                        │
│  - Fade, Slide, Zoom, Paper, Chip              │
│                                                 │
│  Agora RTC SDK                                  │
│  - createClient()                               │
│  - createMicrophoneAudioTrack()                 │
│  - createCameraVideoTrack()                     │
│  - join(), publish(), leave()                   │
│                                                 │
│  Agora Access Token                             │
│  - RtcTokenBuilder                              │
│  - Client-side token generation                 │
│                                                 │
│  WebSocket (Native)                             │
│  - Custom WebSocketService                      │
│  - Message handlers                             │
│  - Auto-reconnection                            │
│                                                 │
│  React Router                                   │
│  - Navigation with state                        │
│  - Route detection                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📊 Comparison: Before vs After

```
┌─────────────────────────────────────────────────────────┐
│                   BEFORE                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  User on /home                                          │
│  Someone calls → ❌ No notification                     │
│  Result: Missed call                                    │
│                                                         │
│  User on /profile                                       │
│  Someone calls → ❌ No notification                     │
│  Result: Missed call                                    │
│                                                         │
│  User on /chat                                          │
│  Someone calls → ✅ ChatBox modal appears               │
│  Result: Can accept call                                │
│                                                         │
│  Coverage: 1 out of 10 routes (10%)                     │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    AFTER                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  User on /home                                          │
│  Someone calls → ✅ Global modal appears                │
│  Result: Can accept call                                │
│                                                         │
│  User on /profile                                       │
│  Someone calls → ✅ Global modal appears                │
│  Result: Can accept call                                │
│                                                         │
│  User on /chat                                          │
│  Someone calls → ✅ ChatBox modal appears (priority)    │
│  Result: Can accept call                                │
│                                                         │
│  User on ANY route                                      │
│  Someone calls → ✅ Global modal appears                │
│  Result: Can accept call                                │
│                                                         │
│  Coverage: 10 out of 10 routes (100%)                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

This visual guide helps understand the complete implementation at a glance! 🎉
