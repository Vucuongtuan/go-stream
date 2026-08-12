import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeState = {
  preference: ThemePreference;
  isHydrated: boolean;
};

const THEME_STORAGE_KEY = '@go-stream/theme-preference';

const initialState: ThemeState = {
  preference: 'system',
  isHydrated: false,
};

export const loadThemePreference = createAsyncThunk('theme/loadPreference', async () => {
  const savedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);

  return isThemePreference(savedPreference) ? savedPreference : initialState.preference;
});

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemePreference: (state, action: PayloadAction<ThemePreference>) => {
      state.preference = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadThemePreference.fulfilled, (state, action) => {
        state.preference = action.payload;
        state.isHydrated = true;
      })
      .addCase(loadThemePreference.rejected, (state) => {
        state.isHydrated = true;
      });
  },
});

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export async function persistThemePreference(preference: ThemePreference) {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
}

export const { setThemePreference } = themeSlice.actions;
export const themeReducer = themeSlice.reducer;
