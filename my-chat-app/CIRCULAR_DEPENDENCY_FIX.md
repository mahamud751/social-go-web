# Circular Dependency Fix - "Cannot access before initialization" Error

## Problem

After implementing the bidirectional video calling fixes, a new error appeared:

```
Uncaught ReferenceError: Cannot access 'handleDeviceError' before initialization
    at ChatBox (ChatBox.jsx:494:1)
```

## Root Cause

The error was caused by a **function ordering issue** where `joinAgoraChannel` was trying to use `handleDeviceError` in its dependency array and function body, but `handleDeviceError` was defined later in the file.

### Problematic Code Structure:

```javascript
// ❌ WRONG: joinAgoraChannel defined first
const joinAgoraChannel = useCallback(
  async (channelName, token, uid) => {
    try {
      // ... logic
    } catch (trackError) {
      handleDeviceError(trackError); // ❌ Error: Cannot access before initialization
      throw trackError;
    }
  },
  [callType, handleDeviceError, showToast]
); // ❌ handleDeviceError not yet defined

// ❌ handleDeviceError defined later
const handleDeviceError = useCallback(
  (error) => {
    // ... error handling
  },
  [showToast]
);
```

## Solution Applied

### 1. **Reordered Function Definitions**

Moved `handleDeviceError` definition **before** `joinAgoraChannel`:

```javascript
// ✅ CORRECT: handleDeviceError defined first
const handleDeviceError = useCallback(
  (error) => {
    console.error("Device error:", error);

    if (error.name === "NotAllowedError") {
      showToast("Camera/microphone access denied...", "error", 5000);
    } else if (
      error.name === "NotFoundError" ||
      error.name === "OverconstrainedError"
    ) {
      showToast("Required device not found...", "error", 5000);
    } else if (error.name === "NotReadableError") {
      showToast("Camera/microphone is already in use...", "error", 5000);
    } else {
      showToast(
        `Failed to access camera/microphone: ${error.message}`,
        "error",
        5000
      );
    }

    // Don't call endCall here to avoid circular dependency
  },
  [showToast]
);

// ✅ CORRECT: joinAgoraChannel can now access handleDeviceError
const joinAgoraChannel = useCallback(
  async (channelName, token, uid) => {
    try {
      // ... join logic
    } catch (trackError) {
      handleDeviceError(trackError); // ✅ Now accessible
      throw trackError;
    }
  },
  [callType, handleDeviceError, showToast]
);
```

### 2. **Removed Duplicate Function**

Removed the duplicate `handleDeviceError` function that appeared later in the file.

### 3. **Fixed Circular Dependencies**

Broke circular dependencies by modifying `handleUserLeft`:

```javascript
// ✅ CORRECT: Avoid calling endCall directly
const handleUserLeft = useCallback(
  (user, reason) => {
    console.log("Remote user left:", user.uid, "reason:", reason);
    // Clear remote media when user leaves
    if (remoteMediaRef.current) {
      remoteMediaRef.current.srcObject = null;
    }
    showToast("Remote user left the call", "info", 3000);
    // Set status to trigger cleanup, instead of calling endCall directly
    setCallStatus("idle");
  },
  [showToast]
);
```

## Best Practices Applied

### ✅ **Function Ordering Rules**

1. **Define dependencies first**: Functions used by other functions should be defined earlier
2. **Avoid circular references**: Don't have functions calling each other in a circle
3. **Use state setters**: Instead of calling complex functions, use state setters to trigger effects

### ✅ **useCallback Dependencies**

1. **Include all dependencies**: All variables and functions used inside useCallback must be in the dependency array
2. **Order matters**: Functions must be defined before being used in dependency arrays
3. **Break cycles**: Use indirect methods (like state changes) to avoid circular dependencies

### ✅ **Error Prevention**

1. **Define utility functions first**: Error handlers, validators, and helpers should come first
2. **Main logic functions second**: Functions that use utilities come after
3. **Effect cleanup last**: Cleanup and teardown functions come at the end

## Final Working Order

The correct function definition order in ChatBox.jsx is now:

1. **Utility Functions**

   - `showToast` (defined in state)
   - `handleDeviceError`
   - `checkMediaPermissions`

2. **Event Handlers**

   - `handleUserPublished`
   - `handleUserUnpublished`
   - `handleUserLeft`

3. **Core Logic Functions**

   - `joinAgoraChannel`
   - `fetchAgoraToken`
   - `startCall`
   - `answerCall`

4. **Control Functions**
   - `declineCall`
   - `endCall`
   - `toggleMute`
   - `toggleVideo`

This order ensures no function references another function before it's defined, eliminating all "Cannot access before initialization" errors.

## Validation

- ✅ No syntax errors
- ✅ No circular dependency errors
- ✅ All useCallback functions have proper dependencies
- ✅ Function ordering follows best practices
- ✅ Video calling functionality works correctly
