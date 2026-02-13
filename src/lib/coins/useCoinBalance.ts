"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCurrentCoinBalanceState,
  refreshCoinBalance,
  setActiveCoinUser,
  subscribeCoinBalance,
} from "./coinBalanceStore";

export function useCoinBalance(userId: string | null) {
  const [state, setState] = useState(getCurrentCoinBalanceState());

  useEffect(() => {
    const unsubscribe = subscribeCoinBalance(setState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    setActiveCoinUser(userId);
  }, [userId]);

  const refresh = useCallback(() => {
    refreshCoinBalance();
  }, []);

  return {
    coinBalance: state.balance,
    coinLoading: state.loading,
    refreshCoinBalance: refresh,
  };
}
