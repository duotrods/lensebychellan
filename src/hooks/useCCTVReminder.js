import { useState, useEffect } from "react";

const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds
const LAST_SHOWN_HOUR_KEY = "cctv_check_last_shown_hour";

export const useCCTVReminder = () => {
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    // Check if reminder should be shown at the start of each hour
    const checkReminder = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Get the last hour we showed the reminder
      const lastShownHour = localStorage.getItem(LAST_SHOWN_HOUR_KEY);

      // Show reminder if:
      // 1. We're within the first 5 minutes of an hour (gives window to catch it)
      // 2. We haven't shown the reminder for this hour yet
      if (currentMinute < 5 && lastShownHour !== currentHour.toString()) {
        setShowReminder(true);
        localStorage.setItem(LAST_SHOWN_HOUR_KEY, currentHour.toString());
      }
    };

    // Check immediately
    checkReminder();

    // Set up interval to check every 30 seconds
    const intervalId = setInterval(checkReminder, CHECK_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const dismissReminder = () => {
    setShowReminder(false);
    // Don't update the hour - let the next hour trigger naturally
  };

  const resetTimer = () => {
    // This can be called when user submits a CCTV check form
    // Mark current hour as shown
    const currentHour = new Date().getHours();
    localStorage.setItem(LAST_SHOWN_HOUR_KEY, currentHour.toString());
    setShowReminder(false);
  };

  return {
    showReminder,
    dismissReminder,
    resetTimer,
  };
};
