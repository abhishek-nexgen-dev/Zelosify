"use client";
import { useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loadManagerOpenings,
  loadManagerProfiles,
  decideProfile,
  clearDecisionError,
  selectHmOpenings,
  selectHmPagination,
  selectHmOpeningsLoading,
  selectHmOpeningsError,
  selectHmProfiles,
  selectHmProfilesPagination,
  selectHmProfilesLoading,
  selectHmProfilesError,
  selectHmDecisionLoadingId,
  selectHmDecisionError,
} from "@/redux/features/HiringManagerOpenings/hiringManagerOpeningsSlice";

export default function useHiringManagerOpenings() {
  const dispatch = useDispatch();
  const openings = useSelector(selectHmOpenings);
  const pagination = useSelector(selectHmPagination);
  const openingsLoading = useSelector(selectHmOpeningsLoading);
  const openingsError = useSelector(selectHmOpeningsError);
  const profiles = useSelector(selectHmProfiles);
  const profilesPagination = useSelector(selectHmProfilesPagination);
  const profilesLoading = useSelector(selectHmProfilesLoading);
  const profilesError = useSelector(selectHmProfilesError);
  const decisionLoadingId = useSelector(selectHmDecisionLoadingId);
  const decisionError = useSelector(selectHmDecisionError);
  const lastListKey = useRef("");

  const fetchOpenings = useCallback(
    (params = {}) => {
      const key = JSON.stringify(params);
      if (key === lastListKey.current && openings.length > 0 && !params.force) return;
      lastListKey.current = key;
      dispatch(loadManagerOpenings(params));
    },
    [dispatch, openings.length]
  );

  const fetchProfiles = useCallback(
    (openingId, params = {}) => {
      if (!openingId) return;
      dispatch(loadManagerProfiles({ openingId, params }));
    },
    [dispatch]
  );

  const shortlist = useCallback(
    (profileId) => dispatch(decideProfile({ profileId, action: "shortlist" })).unwrap(),
    [dispatch]
  );

  const reject = useCallback(
    (profileId) => dispatch(decideProfile({ profileId, action: "reject" })).unwrap(),
    [dispatch]
  );

  const clearDecisionErr = useCallback(() => dispatch(clearDecisionError()), [dispatch]);

  return useMemo(
    () => ({
      openings,
      pagination,
      openingsLoading,
      openingsError,
      profiles,
      profilesPagination,
      profilesLoading,
      profilesError,
      decisionLoadingId,
      decisionError,
      fetchOpenings,
      fetchProfiles,
      shortlist,
      reject,
      clearDecisionErr,
    }),
    [
      openings,
      pagination,
      openingsLoading,
      openingsError,
      profiles,
      profilesPagination,
      profilesLoading,
      profilesError,
      decisionLoadingId,
      decisionError,
      fetchOpenings,
      fetchProfiles,
      shortlist,
      reject,
      clearDecisionErr,
    ]
  );
}
