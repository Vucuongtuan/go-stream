import React from "react";
import { Metadata } from "next";
import { LoginForm } from "@/components/features";

export const metadata: Metadata = {
  title: "Đăng nhập | Go-Stream",
  description: "Đăng nhập vào tài khoản Go-Stream để bắt đầu xem livestream và trò chuyện cùng cộng đồng.",
};

export default function LoginPage() {
  return <LoginForm />;
}

