import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';

import {
  persistThemePreference,
  setThemePreference,
  themeReducer,
} from '@/store/theme-slice';

const themePersistenceListener = createListenerMiddleware();

themePersistenceListener.startListening({
  actionCreator: setThemePreference,
  effect: async (action) => {
    await persistThemePreference(action.payload);
  },
});

export const store = configureStore({
  reducer: {
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(themePersistenceListener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
