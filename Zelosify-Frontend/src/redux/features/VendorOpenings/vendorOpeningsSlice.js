import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchVendorOpenings,
  fetchVendorOpeningById,
  uploadVendorFiles,
  softDeleteVendorProfile,
} from "@/features/vendor/api";

const getError = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

export const loadVendorOpenings = createAsyncThunk(
  "vendorOpenings/loadOpenings",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await fetchVendorOpenings(params);
    } catch (err) {
      return rejectWithValue(getError(err, "Failed to load openings"));
    }
  }
);

export const loadVendorOpeningDetail = createAsyncThunk(
  "vendorOpenings/loadDetail",
  async (id, { rejectWithValue }) => {
    try {
      const opening = await fetchVendorOpeningById(id);
      return { opening, profiles: opening?.profiles ?? [] };
    } catch (err) {
      return rejectWithValue(getError(err, "Failed to load opening details"));
    }
  }
);

export const uploadAndSubmitProfiles = createAsyncThunk(
  "vendorOpenings/uploadSubmit",
  async ({ openingId, files, onProgress }, { rejectWithValue }) => {
    try {
      return await uploadVendorFiles(openingId, files, onProgress);
    } catch (err) {
      return rejectWithValue(getError(err, "Failed to upload/submit profiles"));
    }
  }
);

export const removeVendorProfile = createAsyncThunk(
  "vendorOpenings/removeProfile",
  async (profileId, { rejectWithValue }) => {
    try {
      await softDeleteVendorProfile(profileId);
      return profileId;
    } catch (err) {
      return rejectWithValue(getError(err, "Failed to delete profile"));
    }
  }
);

const initialState = {
  openings: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  openingsLoading: false,
  openingsError: null,
  openingsRequestId: null,
  detail: null,
  detailOpeningId: null,
  detailRequestId: null,
  profiles: [],
  detailLoading: false,
  detailError: null,
  uploadLoading: false,
  uploadError: null,
};

const vendorOpeningsSlice = createSlice({
  name: "vendorOpenings",
  initialState,
  reducers: {
    clearUploadError: (state) => {
      state.uploadError = null;
    },
    resetVendorOpenings: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadVendorOpenings.pending, (state, action) => {
        state.openingsLoading = true;
        state.openingsError = null;
        state.openingsRequestId = action.meta.requestId;
      })
      .addCase(loadVendorOpenings.fulfilled, (state, action) => {
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
      .addCase(loadVendorOpenings.rejected, (state, action) => {
        if (state.openingsRequestId !== action.meta.requestId) return;
        state.openingsLoading = false;
        state.openingsRequestId = null;
        state.openingsError = action.payload;
      })
      .addCase(loadVendorOpeningDetail.pending, (state, action) => {
        state.detailLoading = true;
        state.detailError = null;
        if (state.detailOpeningId !== action.meta.arg) {
          state.detail = null;
          state.profiles = [];
        }
        state.detailOpeningId = action.meta.arg;
        state.detailRequestId = action.meta.requestId;
      })
      .addCase(loadVendorOpeningDetail.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailRequestId = null;
        const { opening, profiles } = action.payload || {};
        state.detail = opening?.data || opening?.opening || opening || null;
        const profPayload = profiles?.data || profiles?.profiles || profiles || [];
        state.profiles = Array.isArray(profPayload) ? profPayload : profPayload.items || [];
      })
      .addCase(loadVendorOpeningDetail.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailRequestId = null;
        state.detailError = action.payload;
      })
      .addCase(uploadAndSubmitProfiles.pending, (state) => {
        state.uploadLoading = true;
        state.uploadError = null;
      })
      .addCase(uploadAndSubmitProfiles.fulfilled, (state) => {
        state.uploadLoading = false;
      })
      .addCase(uploadAndSubmitProfiles.rejected, (state, action) => {
        state.uploadLoading = false;
        state.uploadError = action.payload;
      })
      .addCase(removeVendorProfile.fulfilled, (state, action) => {
        const id = action.payload;
        state.profiles = state.profiles.filter((p) => (p.id ?? p.profileId) !== id);
      });
  },
});

export const { clearUploadError, resetVendorOpenings } = vendorOpeningsSlice.actions;

export const selectVendorOpenings = (s) => s.vendorOpenings.openings;
export const selectVendorPagination = (s) => s.vendorOpenings.pagination;
export const selectVendorOpeningsLoading = (s) => s.vendorOpenings.openingsLoading;
export const selectVendorOpeningsError = (s) => s.vendorOpenings.openingsError;
export const selectVendorDetail = (s) => s.vendorOpenings.detail;
export const selectVendorProfiles = (s) => s.vendorOpenings.profiles;
export const selectVendorDetailLoading = (s) => s.vendorOpenings.detailLoading;
export const selectVendorDetailError = (s) => s.vendorOpenings.detailError;
export const selectVendorUploadLoading = (s) => s.vendorOpenings.uploadLoading;
export const selectVendorUploadError = (s) => s.vendorOpenings.uploadError;

export default vendorOpeningsSlice.reducer;
