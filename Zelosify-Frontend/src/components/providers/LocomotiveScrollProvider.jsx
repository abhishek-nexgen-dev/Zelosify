"use client";

import { useEffect } from "react";

export default function LocomotiveScrollProvider() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let scrollInstance = null;
    let disposed = false;
    let generation = 0;

    const start = async () => {
      const currentGeneration = ++generation;
      const { default: LocomotiveScroll } = await import("locomotive-scroll");

      if (disposed || reducedMotion.matches || currentGeneration !== generation) return;

      scrollInstance = new LocomotiveScroll({
        lenisOptions: {
          anchors: true,
          lerp: 0.1,
          smoothWheel: true,
        },
      });
    };

    const handleMotionPreferenceChange = () => {
      generation += 1;

      if (reducedMotion.matches) {
        scrollInstance?.destroy();
        scrollInstance = null;
      } else if (!scrollInstance) {
        void start().catch((error) => {
          if (!disposed) {
            console.error(
              "Locomotive Scroll could not initialize; native scrolling remains available.",
              error
            );
          }
        });
      }
    };

    if (!reducedMotion.matches) {
      void start().catch((error) => {
        if (!disposed) {
          console.error(
            "Locomotive Scroll could not initialize; native scrolling remains available.",
            error
          );
        }
      });
    }
    reducedMotion.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      disposed = true;
      generation += 1;
      reducedMotion.removeEventListener("change", handleMotionPreferenceChange);
      scrollInstance?.destroy();
    };
  }, []);

  return null;
}
