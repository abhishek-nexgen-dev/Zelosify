"use client";
import { useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loadVendorOpenings,
  loadVendorOpeningDetail,
  uploadAndSubmitProfiles,
  removeVendorProfile,
  clearUploadError,
  selectVendorOpenings,
  selectVendorPagination,
  selectVendorOpeningsLoading,
  selectVendorOpeningsError,
  selectVendorDetail,
  selectVendorProfiles,
  selectVendorDetailLoading,
  selectVendorDetailError,
  selectVendorUploadLoading,
  selectVendorUploadError,
} from "@/redux/features/VendorOpenings/vendorOpeningsSlice";

export default function useVendorOpenings() {
  const dispatch = useDispatch();
  const openings = useSelector(selectVendorOpenings);
  const pagination = useSelector(selectVendorPagination);
  const openingsLoading = useSelector(selectVendorOpeningsLoading);
  const openingsError = useSelector(selectVendorOpeningsError);
  const detail = useSelector(selectVendorDetail);
  const profiles = useSelector(selectVendorProfiles);
  const detailLoading = useSelector(selectVendorDetailLoading);
  const detailError = useSelector(selectVendorDetailError);
  const uploadLoading = useSelector(selectVendorUploadLoading);
  const uploadError = useSelector(selectVendorUploadError);
  const lastListKey = useRef("");

  const fetchOpenings = useCallback(
    (params = {}) => {
      const key = JSON.stringify(params);
      if (key === lastListKey.current && openings.length > 0 && !params.force) return;
      lastListKey.current = key;
      dispatch(loadVendorOpenings(params));
    },
    [dispatch, openings.length]
  );

  const fetchDetail = useCallback(
    (id) => {
      if (!id) return;
      dispatch(loadVendorOpeningDetail(id));
    },
    [dispatch]
  );

  const submitProfiles = useCallback(
    async (openingId, files, onProgress) => {
      const res = await dispatch(
        uploadAndSubmitProfiles({ openingId, files, onProgress })
      ).unwrap();
      await dispatch(loadVendorOpeningDetail(openingId));
      return res;
    },
    [dispatch]
  );

  const deleteProfile = useCallback(
    (profileId) => dispatch(removeVendorProfile(profileId)).unwrap(),
    [dispatch]
  );

  const clearUploadErr = useCallback(() => dispatch(clearUploadError()), [dispatch]);

  return useMemo(
    () => ({
      openings,
      pagination,
      openingsLoading,
      openingsError,
      detail,
      profiles,
      detailLoading,
      detailError,
      uploadLoading,
      uploadError,
      fetchOpenings,
      fetchDetail,
      submitProfiles,
      deleteProfile,
      clearUploadErr,
    }),
    [
      openings,
      pagination,
      openingsLoading,
      openingsError,
      detail,
      profiles,
      detailLoading,
      detailError,
      uploadLoading,
      uploadError,
      fetchOpenings,
      fetchDetail,
      submitProfiles,
      deleteProfile,
      clearUploadErr,
    ]
  );
}
