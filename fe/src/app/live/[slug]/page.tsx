import React from "react";
import { Metadata } from "next";
import { PublicStream } from "@/components/features/streamer/PublicStream";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Kênh Live của ${slug} - Go-Stream`,
    description: `Xem phát trực tiếp và trò chuyện cùng ${slug} trên Go-Stream.`,
  };
}

export default async function LiveStreamPage({ params }: PageProps) {
  const { slug } = await params;
  return <PublicStream slug={slug} />;
}
