import React from "react";
import { Metadata } from "next";
import { StreamerExperience } from "@/components/features/streamer/StreamerExperience";

export const metadata: Metadata = {
  title: "Streamer Dashboard - Go-Stream",
  description: "Bảng điều khiển phát trực tuyến của Streamer.",
};

export default function StreamerDashboardPage() {
  return <StreamerExperience />;
}
