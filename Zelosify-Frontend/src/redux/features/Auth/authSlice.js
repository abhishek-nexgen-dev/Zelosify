import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/Axios/AxiosInstance";

const errorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;

export const checkAuthStatus = createAsyncThunk(
  "auth/checkAuthStatus",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/auth/user");
      return data.user ?? data;
    } catch (error) {
      return rejectWithValue(errorMessage(error, "You are not signed in."));
    }
  }
);

export const loginWithCredentials = createAsyncThunk(
  "auth/loginWithCredentials",
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/auth/login", credentials);
      return data;
    } catch (error) {
      return rejectWithValue(
        errorMessage(error, "Sign-in failed. Check your credentials and try again.")
      );
    }
  }
);

export const verifyTOTP = createAsyncThunk(
  "auth/verifyTOTP",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/auth/verify-totp", payload);
      return data;
    } catch (error) {
      return rejectWithValue(errorMessage(error, "The verification code was not accepted."));
    }
  }
);

export const signOut = createAsyncThunk(
  "auth/signOut",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await axiosInstance.post("/auth/logout");
      return "/login";
    } catch (error) {
      if (error?.response?.status !== 400 && error?.response?.status !== 401) {
        dispatch(logout());
        return rejectWithValue(errorMessage(error, "Sign-out could not be confirmed."));
      }
      return "/login";
    } finally {
      dispatch(logout());
    }
  }
);

const initialState = {
  user: null,
  loading: false,
  error: null,
  showSignoutConfirmation: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.error = null;
    },
    openSignoutConfirmation: (state) => {
      state.showSignoutConfirmation = true;
    },
    closeSignoutConfirmation: (state) => {
      state.showSignoutConfirmation = false;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.loading = false;
        state.user = null;
        // Auth probing is also used by public pages to decide which navbar actions to show.
        // A missing or expired session should clear stale user state without surfacing a raw
        // token validation response on the login page.
        state.error = null;
      })
      .addCase(loginWithCredentials.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithCredentials.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.user) state.user = action.payload.user;
      })
      .addCase(loginWithCredentials.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(verifyTOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyTOTP.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user ?? null;
      })
      .addCase(verifyTOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, openSignoutConfirmation, closeSignoutConfirmation, setUser } =
  authSlice.actions;
export default authSlice.reducer;
