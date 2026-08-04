"use client";

import { useEffect } from "react";
import {
  STORAGE_TRANSACTIONS_TOUR_COMPLETE,
  startTransactionsTour,
} from "@/lib/walkthrough";

type Props = { bootReady: boolean };

export default function TransactionsWalkthrough({ bootReady }: Props) {
  useEffect(() => {
    if (!bootReady || typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_TRANSACTIONS_TOUR_COMPLETE) === "1") return;

    const id = window.setTimeout(() => {
      startTransactionsTour({ persistComplete: true });
    }, 550);

    return () => window.clearTimeout(id);
  }, [bootReady]);

  return null;
}
