import { useState, useEffect } from "react";

const REMINDER_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
const CHECK_INTERVAL = 60 * 1000; // Check every minute
const LOGIN_TIME_KEY = "cctv_check_login_time";
const LAST_REMINDER_KEY = "cctv_check_last_reminder";

export const useCCTVReminder = () => {
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    // Set login time when component mounts (user logs in)
    const loginTime = localStorage.getItem(LOGIN_TIME_KEY);
    if (!loginTime) {
      const now = Date.now().toString();
      localStorage.setItem(LOGIN_TIME_KEY, now);
      localStorage.setItem(LAST_REMINDER_KEY, now);
    }

    // Check if reminder should be shown
    const checkReminder = () => {
      const lastReminderTime = parseInt(
        localStorage.getItem(LAST_REMINDER_KEY) || Date.now()
      );
      const currentTime = Date.now();
      const timeSinceLastReminder = currentTime - lastReminderTime;

      if (timeSinceLastReminder >= REMINDER_INTERVAL) {
        setShowReminder(true);
      }
    };

    // Check immediately
    checkReminder();

    // Set up interval to check every minute
    const intervalId = setInterval(checkReminder, CHECK_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const dismissReminder = () => {
    setShowReminder(false);
    // Update last reminder time
    localStorage.setItem(LAST_REMINDER_KEY, Date.now().toString());
  };

  const resetTimer = () => {
    // This can be called when user submits a CCTV check form
    localStorage.setItem(LAST_REMINDER_KEY, Date.now().toString());
    setShowReminder(false);
  };

  return {
    showReminder,
    dismissReminder,
    resetTimer,
  };
};
