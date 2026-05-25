import React from "react";
import { Metadata } from "next";
import { RegisterForm } from "@/components/features";

export const metadata: Metadata = {
  title: "Đăng ký | Go-Stream",
  description: "Tạo tài khoản Go-Stream miễn phí để xem livestream và trò chuyện cùng cộng đồng.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}

