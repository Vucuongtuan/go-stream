import React from "react";
import { Metadata } from "next";
import { AuthorRegisterForm } from "@/components/features";

export const metadata: Metadata = {
  title: "Đăng ký Streamer | Go-Stream",
  description: "Đăng ký tài khoản và mở kênh phát sóng trực tiếp của riêng bạn trên Go-Stream. Chia sẻ tài năng và kết nối với hàng triệu khán giả.",
};

export default function AuthorRegisterPage() {
  return <AuthorRegisterForm />;
}
