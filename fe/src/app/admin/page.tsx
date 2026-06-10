import React from "react";
import { Metadata } from "next";
import { AdminDashboard } from "@/components/features/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard - Go-Stream",
  description: "Bảng Phê Duyệt Streamer/Author cho quản trị viên.",
};

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
