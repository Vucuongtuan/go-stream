"use client";

import { useEffect, useState } from "react";
import { MobileStreamerDashboard } from "./MobileStreamerDashboard";
import { StreamerDashboard } from "./StreamerDashboard";

export function StreamerExperience() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px), (pointer: coarse) and (max-width: 1024px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (isMobile === null) return null;
  return isMobile ? <MobileStreamerDashboard /> : <StreamerDashboard />;
}
