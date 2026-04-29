import { createContext, useContext } from 'react';
import type { ViewMode } from '../types/map';

export interface ViewContextValue {
  viewMode: ViewMode;
  printMode: boolean;
  uiScale: number;
  gmShowFog: boolean;
}

export const ViewContext = createContext<ViewContextValue | null>(null);

export function useViewContext(): ViewContextValue {
  const ctx = useContext(ViewContext);
  if (!ctx) throw new Error('useViewContext must be used within a ViewContext.Provider');
  return ctx;
}
