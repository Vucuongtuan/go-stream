interface ViewerBadgeProps {
  viewers: number;
}

export function ViewerBadge({ viewers }: ViewerBadgeProps) {
  return (
    <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
      {viewers.toLocaleString()}
    </div>
  );
}
