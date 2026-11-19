"use client";
import { ThemeProvider } from "next-themes";
import { Provider } from "react-redux";
import { Toaster } from "@/components/UI/shadcn/sonner";
import LocomotiveScrollProvider from "@/components/providers/LocomotiveScrollProvider";
import store from "./store";
import { TooltipProvider } from "@/components/UI/shadcn/tooltip";

export default function AllProvider({ children }) {
  return (
    <Provider store={store}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        forcedTheme="dark"
        disableTransitionOnChange
      >
        <LocomotiveScrollProvider />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </ThemeProvider>
    </Provider>
  );
}
