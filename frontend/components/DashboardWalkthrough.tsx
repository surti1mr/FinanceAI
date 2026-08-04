"use client";

import { useEffect } from "react";
import {
  STORAGE_DASHBOARD_TOUR_COMPLETE,
  startDashboardTour,
} from "@/lib/walkthrough";

type Props = { bootReady: boolean };

export default function DashboardWalkthrough({ bootReady }: Props) {
  useEffect(() => {
    if (!bootReady || typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_DASHBOARD_TOUR_COMPLETE) === "1") return;

    const id = window.setTimeout(() => {
      startDashboardTour({ persistComplete: true });
    }, 550);

    return () => window.clearTimeout(id);
  }, [bootReady]);

  return null;
}
