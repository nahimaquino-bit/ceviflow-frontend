/**
 * Haptic patterns for mobile devices.
 */
const haptics = {
  // Single subtle click (Ideal for quantity buttons)
  click: () => {
    if ("vibrate" in navigator) navigator.vibrate(12);
  },

  // Success pattern (Longer or double pulse)
  success: () => {
    if ("vibrate" in navigator) navigator.vibrate([40, 10, 40]);
  },

  // Error pattern (Rapid pulses)
  error: () => {
    if ("vibrate" in navigator) navigator.vibrate([10, 30, 10, 30, 10]);
  },

  // Warning (Soft pulse)
  warning: () => {
    if ("vibrate" in navigator) navigator.vibrate(50);
  }
};

export default haptics;
