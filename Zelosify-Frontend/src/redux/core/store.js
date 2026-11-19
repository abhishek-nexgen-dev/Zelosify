import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/redux/features/Auth/authSlice";
import vendorOpeningsReducer from "@/redux/features/VendorOpenings/vendorOpeningsSlice";
import hmOpeningsReducer from "@/redux/features/HiringManagerOpenings/hiringManagerOpeningsSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    vendorOpenings: vendorOpeningsReducer,
    hmOpenings: hmOpeningsReducer,
  },
});

export default store;
