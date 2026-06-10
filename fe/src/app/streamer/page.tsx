import React from "react";
import { Metadata } from "next";
import { StreamerDashboard } from "@/components/features/streamer/StreamerDashboard";

export const metadata: Metadata = {
  title: "Streamer Dashboard - Go-Stream",
  description: "Bảng điều khiển phát trực tuyến của Streamer.",
};

export default function StreamerDashboardPage() {
  return <StreamerDashboard />;
}
