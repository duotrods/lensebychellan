import { useState, useEffect } from "react";

const REMINDER_INTERVAL = 60 * 1000; // 1 minute in milliseconds (change to 60 * 60 * 1000 for production)
const CHECK_INTERVAL = 5 * 1000; // Check every 5 seconds
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
      console.log('CCTV Reminder: Login time set to', new Date(parseInt(now)));
    }

    // Check if reminder should be shown
    const checkReminder = () => {
      const lastReminderTime = parseInt(
        localStorage.getItem(LAST_REMINDER_KEY) || Date.now()
      );
      const currentTime = Date.now();
      const timeSinceLastReminder = currentTime - lastReminderTime;

      console.log('CCTV Reminder Check:', {
        lastReminderTime: new Date(lastReminderTime),
        currentTime: new Date(currentTime),
        timeSinceLastReminder: Math.floor(timeSinceLastReminder / 1000) + ' seconds',
        reminderInterval: Math.floor(REMINDER_INTERVAL / 1000) + ' seconds',
        shouldShow: timeSinceLastReminder >= REMINDER_INTERVAL
      });

      if (timeSinceLastReminder >= REMINDER_INTERVAL) {
        console.log('CCTV Reminder: Showing reminder!');
        setShowReminder(true);
      }
    };

    // Check immediately
    checkReminder();

    // Set up interval to check frequently
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
