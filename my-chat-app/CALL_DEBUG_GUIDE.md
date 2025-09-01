# 📞 Call Debug Guide

## 🔍 How to Debug Call Answer/Reject Issues

### 1. **Open Browser Developer Console**

Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)

### 2. **Look for These Console Messages**

#### When User A Calls User B:

```
🔵 User A (Caller) Console:
📤 Sending call-request signal: {type: "agora-signal", userId: "A", data: {action: "call-request", targetId: "B", ...}}

🔵 User B (Receiver) Console:
📡 Received agora-signal: {type: "agora-signal", userId: "A", data: {action: "call-request", targetId: "B", ...}}
👤 Current user ID: B
🎯 Target ID: B
📊 Signal routing analysis: {action: "call-request", targetId: "B", currentUserId: "B", isForCurrentUser: true}
✅ Processing agora-signal for current user: call-request
📞 Received callData: {action: "call-request", ...}
📲 Incoming call request received from: A
```

#### When User B Accepts/Rejects:

```
🔵 User B (Receiver) Console:
📤 Sending call-accepted signal: {type: "agora-signal", userId: "B", data: {action: "call-accepted", targetId: "A", ...}}
👤 Sender (currentUser): B
🎯 Target (callerId): A
🔌 Socket ready state: 1

🔵 User A (Caller) Console:
📡 Received agora-signal: {type: "agora-signal", userId: "B", data: {action: "call-accepted", targetId: "A", ...}}
👤 Current user ID: A
🎯 Target ID: A
📊 Signal routing analysis: {action: "call-accepted", targetId: "A", currentUserId: "A", isForCurrentUser: true}
✅ Processing agora-signal for current user: call-accepted
📞 Received callData: {action: "call-accepted", ...}
✅ Call accepted by peer: B
🧹 Clearing processed callData to allow new signals
```

### 3. **Common Issues to Check**

#### ❌ Signal Not Reaching Target:

Look for:

```
⚠️ Agora signal not for current user, ignoring: {action: "call-accepted", targetId: "A", currentUserId: "B"}
```

**Fix**: Check if targetId matches currentUserId

#### ❌ CallData Not Clearing:

Look for missing:

```
🧹 Clearing processed callData to allow new signals
```

**Fix**: Ensure setTimeout is working in useEffect

#### ❌ WebSocket Issues:

Look for:

```
❌ WebSocket not open, cannot send call-accepted signal
```

**Fix**: Check WebSocket connection state

#### ❌ Wrong Call State:

Look for:

```
⚠️ Received call-accepted but not in calling state (status: idle, initiator: false)
```

**Fix**: Ensure caller is in "calling" state when receiving acceptance

### 4. **Expected Flow**

1. **User A calls User B**:

   - A sends `call-request` to B
   - B receives and processes `call-request`
   - B shows incoming call modal

2. **User B accepts**:

   - B sends `call-accepted` to A
   - A receives and processes `call-accepted`
   - A shows "✅ Call accepted!" toast
   - Call status changes to "in-progress"

3. **User B rejects**:
   - B sends `call-rejected` to A
   - A receives and processes `call-rejected`
   - A shows "📞 Call was declined" toast
   - Call ends

### 5. **Quick Fixes**

If notifications aren't showing:

1. **Refresh both browser tabs/windows**
2. **Check browser console for errors**
3. **Verify WebSocket connection** (look for "WebSocket connected")
4. **Ensure both users are on the same chat**
5. **Check user IDs are correct** in console logs

### 6. **Test Steps**

1. Open app in two different browser windows/tabs
2. Login as different users
3. Start a conversation
4. Initiate a call from User A
5. Watch console logs in both windows
6. Accept/reject from User B
7. Verify User A receives notification

If you see all the expected console messages but no toast notifications, check:

- Toast notification system is working (try other actions that show toasts)
- No JavaScript errors blocking execution
- Theme CSS variables are loaded correctly
