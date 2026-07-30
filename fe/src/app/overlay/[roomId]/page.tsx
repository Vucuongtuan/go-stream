import { DonationOverlay } from "@/components/features/streamer/DonationOverlay";

const positions = ["top-left", "top-center", "top-right", "center", "bottom-left", "bottom-center", "bottom-right"] as const;
const themes = ["neon", "gold", "minimal"] as const;

export default async function OverlayPage({ params, searchParams }: { params: Promise<{ roomId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { roomId } = await params;
  const query = await searchParams;
  const id = Number(roomId);
  const position = positions.includes(query.position as typeof positions[number]) ? query.position as typeof positions[number] : "bottom-center";
  const theme = themes.includes(query.theme as typeof themes[number]) ? query.theme as typeof themes[number] : "neon";
  const rawDuration = Number(query.duration);
  const duration = Number.isFinite(rawDuration) ? Math.min(15, Math.max(3, rawDuration)) : 7;

  return <DonationOverlay roomId={id} position={position} theme={theme} duration={duration} />;
}
