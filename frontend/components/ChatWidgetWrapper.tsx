"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api";
import ChatWidget from "./ChatWidget";

export default function ChatWidgetWrapper() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Read current user on mount, then poll for changes (login / logout).
    function sync() {
      const user = getCurrentUser();
      setUserId(user ? String(user.user_id) : null);
    }
    sync();

    // Re-sync on storage events (other tabs) and on focus (same tab).
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  // key forces a full remount of ChatWidget whenever the logged-in user changes,
  // which resets all useState including messages — solving the history leak.
  return <ChatWidget key={userId ?? "guest"} />;
}
