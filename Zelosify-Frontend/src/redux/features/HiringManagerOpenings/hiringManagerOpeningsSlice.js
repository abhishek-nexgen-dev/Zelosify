import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchManagerOpenings,
  fetchManagerOpeningProfiles,
  shortlistProfile,
  rejectProfile,
} from "@/features/hiring-manager/api";

const getError = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

export const loadManagerOpenings = createAsyncThunk(
  "hmOpenings/loadOpenings",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await fetchManagerOpenings(params);
    } catch (err) {
      return rejectWithValue(getError(err, "Failed to load openings"));
    }
  }
);

export const loadManagerProfiles = createAsyncThunk(
  "hmOpenings/loadProfiles",
  async ({ openingId, params = {} }, { rejectWithValue }) => {
    try {
      return await fetchManagerOpeningProfiles(openingId, params);
    } catch (err) {
      return rejectWithValue(getError(err, "Failed to load profiles"));
    }
  }
);

export const decideProfile = createAsyncThunk(
  "hmOpenings/decideProfile",
  async ({ profileId, action }, { rejectWithValue }) => {
    try {
      const res =
        action === "shortlist" ? await shortlistProfile(profileId) : await rejectProfile(profileId);
      return { profileId, action, res };
    } catch (err) {
      return rejectWithValue(getError(err, `Failed to ${action} profile`));
    }
  }
);

const initialState = {
  openings: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  openingsLoading: false,
  openingsError: null,
  openingsRequestId: null,
  profiles: [],
  profilesPagination: { page: 1, limit: 50, total: 0, totalPages: 1 },
  profilesLoading: false,
  profilesError: null,
  profilesOpeningId: null,
  profilesRequestId: null,
  decisionLoadingId: null,
  decisionError: null,
};

const hiringManagerOpeningsSlice = createSlice({
  name: "hmOpenings",
  initialState,
  reducers: {
    clearDecisionError: (state) => {
      state.decisionError = null;
    },
    resetHmOpenings: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadManagerOpenings.pending, (state, action) => {
        state.openingsLoading = true;
        state.openingsError = null;
        state.openingsRequestId = action.meta.requestId;
      })
      .addCase(loadManagerOpenings.fulfilled, (state, action) => {
        if (state.openingsRequestId !== action.meta.requestId) return;
        state.openingsLoading = false;
        state.openingsRequestId = null;
        const p = action.payload || {};
        const data = p.data || p.openings || p.items || (Array.isArray(p) ? p : []);
        state.openings = data;
        const meta = p.pagination || p.meta || {};
        state.pagination = {
          page: Number(meta.page || action.meta.arg?.page || 1),
          limit: Number(meta.limit || action.meta.arg?.limit || 10),
          total: Number(meta.total ?? meta.totalCount ?? data.length ?? 0),
          totalPages: Number(meta.totalPages || meta.pages || 1),
        };
      })
      .addCase(loadManagerOpenings.rejected, (state, action) => {
        if (state.openingsRequestId !== action.meta.requestId) return;
        state.openingsLoading = false;
        state.openingsRequestId = null;
        state.openingsError = action.payload;
      })
      .addCase(loadManagerProfiles.pending, (state, action) => {
        state.profilesLoading = true;
        state.profilesError = null;
        if (state.profilesOpeningId !== action.meta.arg.openingId) state.profiles = [];
        state.profilesOpeningId = action.meta.arg.openingId;
        state.profilesRequestId = action.meta.requestId;
      })
      .addCase(loadManagerProfiles.fulfilled, (state, action) => {
        if (state.profilesRequestId !== action.meta.requestId) return;
        state.profilesLoading = false;
        state.profilesRequestId = null;
        const p = action.payload || {};
        const data = p.data || p.profiles || p.items || (Array.isArray(p) ? p : []);
        state.profiles = Array.isArray(data) ? data : [];
        const meta = p.pagination || p.meta || {};
        state.profilesPagination = {
          page: Number(meta.page || action.meta.arg?.params?.page || 1),
          limit: Number(meta.limit || action.meta.arg?.params?.limit || 50),
          total: Number(meta.total ?? meta.totalCount ?? (Array.isArray(data) ? data.length : 0)),
          totalPages: Number(meta.totalPages || meta.pages || 1),
        };
      })
      .addCase(loadManagerProfiles.rejected, (state, action) => {
        if (state.profilesRequestId !== action.meta.requestId) return;
        state.profilesLoading = false;
        state.profilesRequestId = null;
        state.profilesError = action.payload;
      })
      .addCase(decideProfile.pending, (state, action) => {
        state.decisionLoadingId = action.meta.arg.profileId;
        state.decisionError = null;
      })
      .addCase(decideProfile.fulfilled, (state, action) => {
        state.decisionLoadingId = null;
        const { profileId, action: act, res } = action.payload;
        const updated = res?.data || res?.profile || res;
        state.profiles = state.profiles.map((p) => {
          if ((p.id ?? p.profileId) !== profileId) return p;
          if (updated && typeof updated === "object" && (updated.id || updated.status))
            return { ...p, ...updated };
          return {
            ...p,
            status: act === "shortlist" ? "SHORTLISTED" : "REJECTED",
          };
        });
      })
      .addCase(decideProfile.rejected, (state, action) => {
        state.decisionLoadingId = null;
        state.decisionError = action.payload;
      });
  },
});

export const { clearDecisionError, resetHmOpenings } = hiringManagerOpeningsSlice.actions;

export const selectHmOpenings = (s) => s.hmOpenings.openings;
export const selectHmPagination = (s) => s.hmOpenings.pagination;
export const selectHmOpeningsLoading = (s) => s.hmOpenings.openingsLoading;
export const selectHmOpeningsError = (s) => s.hmOpenings.openingsError;
export const selectHmProfiles = (s) => s.hmOpenings.profiles;
export const selectHmProfilesPagination = (s) => s.hmOpenings.profilesPagination;
export const selectHmProfilesLoading = (s) => s.hmOpenings.profilesLoading;
export const selectHmProfilesError = (s) => s.hmOpenings.profilesError;
export const selectHmDecisionLoadingId = (s) => s.hmOpenings.decisionLoadingId;
export const selectHmDecisionError = (s) => s.hmOpenings.decisionError;

export default hiringManagerOpeningsSlice.reducer;
