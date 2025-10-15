# 🧪 Testing Checklist: Global Incoming Call Handler

## Pre-Testing Setup

### Environment Check

- [ ] `.env` file has `REACT_APP_AGORA_APP_ID`
- [ ] `.env` file has `REACT_APP_AGORA_APP_CERTIFICATE`
- [ ] `.env` file has `REACT_APP_WS_URL`
- [ ] Backend server is running
- [ ] WebSocket server is accessible

### Browser Setup

- [ ] Camera and microphone are connected
- [ ] Browser has camera/microphone permissions allowed
- [ ] Browser console is open (F12) for debugging
- [ ] Network tab is monitoring WebSocket connection

---

## Test Suite 1: Basic Functionality

### Test 1.1: Receive Call on Home Page

**Steps**:

1. [ ] User A logs in and navigates to `/home`
2. [ ] User B initiates a video call to User A
3. [ ] Verify modal appears on User A's screen
4. [ ] Verify ringing sound plays
5. [ ] Verify caller info displays correctly (name, avatar)
6. [ ] Verify "Incoming Video Call" chip shows

**Expected Result**: ✅ Modal appears with all information

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 1.2: Accept Call from Home Page

**Steps**:

1. [ ] Continue from Test 1.1
2. [ ] User A clicks "Accept" button
3. [ ] Allow camera/microphone permissions if prompted
4. [ ] Verify navigation to `/video-call` page
5. [ ] Verify video call starts successfully
6. [ ] Verify audio and video streams work

**Expected Result**: ✅ Call starts, both users can see/hear each other

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 1.3: Decline Call from Home Page

**Steps**:

1. [ ] User A is on `/home`
2. [ ] User B calls User A
3. [ ] User A clicks "Decline" button
4. [ ] Verify modal closes
5. [ ] Verify ringing stops
6. [ ] Verify User A stays on `/home` page
7. [ ] Verify User B sees "Call declined" message

**Expected Result**: ✅ Modal closes, call rejected

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

## Test Suite 2: Route Coverage

### Test 2.1: Profile Page

**Steps**:

1. [ ] User A navigates to `/profile/:id`
2. [ ] User B calls User A
3. [ ] Verify modal appears overlaying profile page
4. [ ] Accept call
5. [ ] Verify navigation to `/video-call`

**Expected Result**: ✅ Works identically to home page

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 2.2: Friend Page

**Steps**:

1. [ ] User A navigates to `/friend`
2. [ ] User B calls User A
3. [ ] Verify modal appears
4. [ ] Decline call
5. [ ] Verify User A stays on `/friend` page

**Expected Result**: ✅ Modal appears and functions correctly

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 2.3: Friend List Page

**Steps**:

1. [ ] User A navigates to `/friend_list`
2. [ ] User B calls User A
3. [ ] Verify modal appears
4. [ ] Accept call
5. [ ] Verify call works

**Expected Result**: ✅ Full functionality on this route

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 2.4: Chat Page (Should Defer to ChatBox)

**Steps**:

1. [ ] User A navigates to `/chat`
2. [ ] User B calls User A
3. [ ] Verify GlobalIncomingCallHandler does NOT show modal
4. [ ] Verify ChatBox component shows its modal instead
5. [ ] Verify only ONE modal appears (no duplicates)

**Expected Result**: ✅ ChatBox handles call, no duplicate

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

## Test Suite 3: Audio vs Video Calls

### Test 3.1: Audio Call

**Steps**:

1. [ ] User B initiates AUDIO call to User A
2. [ ] Verify modal shows "Incoming Audio Call" chip
3. [ ] Verify phone icon appears (not video camera)
4. [ ] Accept call
5. [ ] Verify only audio works (no video)

**Expected Result**: ✅ Audio-only call works correctly

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 3.2: Video Call

**Steps**:

1. [ ] User B initiates VIDEO call to User A
2. [ ] Verify modal shows "Incoming Video Call" chip
3. [ ] Verify video camera icon appears
4. [ ] Accept call
5. [ ] Verify both audio and video work

**Expected Result**: ✅ Full video call works

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

## Test Suite 4: Timeout and Auto-Decline

### Test 4.1: 60-Second Timeout

**Steps**:

1. [ ] User B calls User A
2. [ ] User A does NOT respond
3. [ ] Wait 60 seconds
4. [ ] Verify modal auto-closes
5. [ ] Verify ringing stops
6. [ ] Verify User B sees "No answer" or timeout message

**Expected Result**: ✅ Auto-decline after 60 seconds

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

## Test Suite 5: UI and Animations

### Test 5.1: Dark Theme

**Steps**:

1. [ ] Set theme to dark mode
2. [ ] Receive incoming call
3. [ ] Verify modal uses dark theme colors
4. [ ] Verify text is readable
5. [ ] Verify buttons look good

**Expected Result**: ✅ Dark theme looks professional

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 5.2: Light Theme

**Steps**:

1. [ ] Set theme to light mode
2. [ ] Receive incoming call
3. [ ] Verify modal uses light theme colors
4. [ ] Verify text is readable
5. [ ] Verify buttons look good

**Expected Result**: ✅ Light theme looks professional

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 5.3: Animations

**Steps**:

1. [ ] Receive incoming call
2. [ ] Verify pulse ring animation plays
3. [ ] Verify avatar has glow effect
4. [ ] Verify badge bounces
5. [ ] Verify modal slides up smoothly
6. [ ] Verify fade-in effect works

**Expected Result**: ✅ All animations smooth and professional

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 5.4: Ringing Sound

**Steps**:

1. [ ] Receive incoming call
2. [ ] Verify ringing sound plays
3. [ ] Verify sound loops continuously
4. [ ] Accept call
5. [ ] Verify sound stops
6. [ ] Decline a new call
7. [ ] Verify sound stops

**Expected Result**: ✅ Sound plays and stops correctly

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

## Test Suite 6: Mobile Responsiveness

### Test 6.1: Mobile Screen Size

**Steps**:

1. [ ] Open browser DevTools
2. [ ] Set to mobile view (375x667)
3. [ ] Receive incoming call
4. [ ] Verify modal fits screen
5. [ ] Verify buttons are tappable
6. [ ] Verify text is readable
7. [ ] Accept/decline call

**Expected Result**: ✅ Works perfectly on mobile

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 6.2: Tablet Screen Size

**Steps**:

1. [ ] Set to tablet view (768x1024)
2. [ ] Receive incoming call
3. [ ] Verify modal looks good
4. [ ] Test all interactions

**Expected Result**: ✅ Works perfectly on tablet

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

## Test Suite 7: Error Handling

### Test 7.1: Permission Denied

**Steps**:

1. [ ] Block camera/microphone in browser settings
2. [ ] Receive incoming call
3. [ ] Click "Accept"
4. [ ] Verify error message appears
5. [ ] Verify modal auto-declines call

**Expected Result**: ✅ User-friendly error message

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 7.2: Network Disconnection

**Steps**:

1. [ ] Receive incoming call
2. [ ] Disconnect internet
3. [ ] Try to accept call
4. [ ] Verify appropriate error handling

**Expected Result**: ✅ Graceful error handling

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 7.3: WebSocket Disconnection

**Steps**:

1. [ ] Stop WebSocket server
2. [ ] Try to receive call
3. [ ] Verify error handling
4. [ ] Restart WebSocket server
5. [ ] Verify reconnection works

**Expected Result**: ✅ Reconnects automatically

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

## Test Suite 8: Edge Cases

### Test 8.1: Multiple Quick Calls

**Steps**:

1. [ ] User B calls User A
2. [ ] User A declines
3. [ ] User B immediately calls again
4. [ ] User A accepts
5. [ ] Verify no state issues

**Expected Result**: ✅ Handles rapid calls correctly

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 8.2: Call During Page Navigation

**Steps**:

1. [ ] User A starts navigating to different page
2. [ ] User B calls during navigation
3. [ ] Verify modal still appears
4. [ ] Accept call
5. [ ] Verify call works

**Expected Result**: ✅ Handles navigation correctly

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 8.3: Caller Cancels Before Answer

**Steps**:

1. [ ] User B calls User A
2. [ ] User B ends call before User A answers
3. [ ] Verify modal closes on User A's side
4. [ ] Verify ringing stops

**Expected Result**: ✅ Modal closes when caller cancels

**Actual Result**: **********\_**********

**Status**: ⬜ Pass / ⬜ Fail

---

## Test Suite 9: Browser Compatibility

### Test 9.1: Chrome

- [ ] All tests pass on Chrome
- [ ] Version: **\_**

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 9.2: Firefox

- [ ] All tests pass on Firefox
- [ ] Version: **\_**

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 9.3: Safari

- [ ] All tests pass on Safari
- [ ] Version: **\_**

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 9.4: Edge

- [ ] All tests pass on Edge
- [ ] Version: **\_**

**Status**: ⬜ Pass / ⬜ Fail

---

## Final Checklist

### Code Quality

- [ ] No console errors
- [ ] No console warnings
- [ ] Clean code structure
- [ ] Proper error handling
- [ ] Resource cleanup works

### Performance

- [ ] Fast modal appearance (<500ms)
- [ ] Smooth animations (60fps)
- [ ] No memory leaks
- [ ] Efficient re-renders

### User Experience

- [ ] Clear visual feedback
- [ ] Intuitive button placement
- [ ] Readable text
- [ ] Professional appearance
- [ ] Responsive design

### Documentation

- [ ] All docs are accurate
- [ ] Examples work correctly
- [ ] Troubleshooting guide helpful

---

## Test Summary

**Total Tests**: 32
**Tests Passed**: **\_**
**Tests Failed**: **\_**
**Pass Rate**: **\_**%

**Critical Issues Found**: **********\_**********

**Minor Issues Found**: **********\_**********

**Recommendations**: **********\_**********

---

## Sign-Off

**Tester Name**: **********\_**********

**Date**: **********\_**********

**Signature**: **********\_**********

**Status**: ⬜ Approved for Production / ⬜ Needs Fixes

---

## Notes

_Add any additional notes or observations here:_

---

---

---

---

---

**Good luck with testing! 🚀**
