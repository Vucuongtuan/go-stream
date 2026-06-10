import React from "react";
import { Metadata } from "next";
import { AuthorProfile } from "@/components/features/streamer/AuthorProfile";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Trang cá nhân của ${slug} - Go-Stream`,
    description: `Xem thông tin, danh sách stream và các nội dung của ${slug} trên Go-Stream.`,
  };
}

export default async function AuthorProfilePage({ params }: PageProps) {
  const { slug } = await params;
  return <AuthorProfile slug={slug} />;
}
