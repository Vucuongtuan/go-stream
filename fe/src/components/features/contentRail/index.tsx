"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { animate, motion, useMotionValue, type PanInfo } from "motion/react";

export interface ContentRailHandle {
  scroll: (direction: "left" | "right") => void;
}

interface ContentRailProps {
  children: React.ReactNode;
  className?: string;
  onAvailabilityChange?: (availability: { canScrollLeft: boolean; canScrollRight: boolean }) => void;
}

export const ContentRail = forwardRef<ContentRailHandle, ContentRailProps>(function ContentRail(
  { children, className = "", onAvailabilityChange },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const dragMoved = useRef(false);
  const x = useMotionValue(0);
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });

  const syncAvailability = useCallback(
    (currentX: number, leftConstraint: number) => {
      onAvailabilityChange?.({
        canScrollLeft: currentX < -1,
        canScrollRight: currentX > leftConstraint + 1,
      });
    },
    [onAvailabilityChange],
  );

  const updateConstraints = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const left = Math.min(0, viewport.clientWidth - track.scrollWidth);
    setConstraints({ left, right: 0 });

    const currentX = Math.max(left, Math.min(0, x.get()));
    if (currentX !== x.get()) x.set(currentX);
    syncAvailability(currentX, left);
  }, [syncAvailability, x]);

  useEffect(() => {
    updateConstraints();
    const observer = new ResizeObserver(updateConstraints);
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (trackRef.current) observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, [children, updateConstraints]);

  useEffect(() => x.on("change", (latest) => syncAvailability(latest, constraints.left)), [constraints.left, syncAvailability, x]);

  const scroll = useCallback(
    (direction: "left" | "right") => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const distance = viewport.clientWidth * 0.82;
      const target =
        direction === "left"
          ? Math.min(0, x.get() + distance)
          : Math.max(constraints.left, x.get() - distance);

      animate(x, target, { type: "spring", stiffness: 360, damping: 36 });
    },
    [constraints.left, x],
  );

  useImperativeHandle(ref, () => ({ scroll }), [scroll]);

  const handleDragStart = () => {
    dragMoved.current = false;
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 4) dragMoved.current = true;
  };

  const preventClickAfterDrag = (event: React.MouseEvent<HTMLUListElement>) => {
    if (!dragMoved.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragMoved.current = false;
  };

  return (
    <div ref={viewportRef} className={`overflow-hidden ${className}`}>
      <motion.ul
        ref={trackRef}
        style={{ x }}
        drag="x"
        dragConstraints={constraints}
        dragElastic={0.05}
        dragMomentum
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onClickCapture={preventClickAfterDrag}
        whileDrag={{ cursor: "grabbing" }}
        className="flex w-max list-none gap-3 p-0.5 pb-3 cursor-grab select-none"
      >
        {React.Children.toArray(children).map((child, index) => (
          <li key={React.isValidElement(child) ? child.key ?? index : index} className="shrink-0">
            {child}
          </li>
        ))}
      </motion.ul>
    </div>
  );
});

ContentRail.displayName = "ContentRail";

export default ContentRail;
