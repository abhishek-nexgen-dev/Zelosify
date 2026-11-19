"use client";
import SignOutConfirmation from "@/components/UI/SignOutConfirmation";
import Header from "@/components/UserDashboardPage/Header/Header";
import SideBarLayout from "@/components/UserDashboardPage/SideBar/SideBarLayout";
import { useState, useEffect, useCallback } from "react";
import useAuth from "@/hooks/Auth/useAuth";

export default function UserDashboardlayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { showSignoutConfirmation, handleCloseSignoutConfirmation } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const handleBreakpoint = (event) => setIsSidebarOpen(event.matches);
    setIsSidebarOpen(desktop.matches);
    desktop.addEventListener("change", handleBreakpoint);
    return () => desktop.removeEventListener("change", handleBreakpoint);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {}
      <div className="min-h-screen bg-[#050505] text-slate-100">
        <SignOutConfirmation
          isOpen={showSignoutConfirmation}
          onCancel={handleCloseSignoutConfirmation}
        />
        <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <div className="flex">
          <SideBarLayout
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={toggleSidebar}
            className="transition-all duration-300"
          />
          <div
            className={`relative ml-0 w-full min-w-0 flex-1 transition-[margin] duration-300 ${
              isSidebarOpen ? "lg:ml-64" : "lg:ml-20"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
