import { createContext, useContext } from 'react';

export const MOE_TAB_BOTTOM_PADDING = 96;
export const MoeTabInsetContext = createContext(0);
export const useMoeTabInset = () => useContext(MoeTabInsetContext);
