import { ChevronRight, Circle } from "lucide-react";
import type { ComponentType, WheelEvent } from "react";
import { useEffect, useRef, useState } from "react";

type ScreenIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

export type MenuItem = {
  key?: string;
  label: string;
  /** subtitle shown below label */
  subtitle?: string;
  /** alias for subtitle (backward-compat) */
  info?: string;
  /** optional extra path for navigation (backward-compat) */
  path?: string;
  /** optional leading icon */
  icon?: ScreenIcon;
  /** optional right badge text */
  badge?: string;
  /** optional right value text */
  value?: string;
  /** optional extra classes */
  className?: string;
  /** optional right-side icon (replaces chevron) */
  rightIcon?: ScreenIcon;
  /** optional right-side icon/text classes */
  rightClassName?: string;
  /** destructive action styling */
  danger?: boolean;
};

export function MenuList({
  items,
  selectedIndex = -1,
  onSelect,
  onBack,
  onMove,
  title,
  subtitle,
  pageSize,
}: {
  items: MenuItem[];
  selectedIndex?: number;
  onSelect: (index: number) => void;
  onBack?: () => void;
  onMove?: (index: number) => void;
  title?: string;
  subtitle?: string;
  /** Limits each hardware screen to a fixed number of visible menu rows. */
  pageSize?: number;
}) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const lastWheelAtRef = useRef(0);
  const previousSelectedIndexRef = useRef(selectedIndex);
  const hideIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const resolvedPageSize = pageSize && pageSize > 0
    ? Math.max(1, Math.floor(pageSize))
    : Math.max(1, items.length);
  const visibleCount = Math.min(resolvedPageSize, items.length);
  const hasScrollableItems = Boolean(pageSize && items.length > visibleCount);
  const maxWindowStart = Math.max(0, items.length - visibleCount);
  const selectedWindowStart = selectedIndex >= 0
    ? selectedIndex - Math.floor(visibleCount / 2)
    : 0;
  const pageStart = pageSize
    ? Math.min(maxWindowStart, Math.max(0, selectedWindowStart))
    : 0;
  const visibleItems = pageSize
    ? items.slice(pageStart, pageStart + visibleCount)
    : items;
  const thumbHeightPercent = hasScrollableItems
    ? Math.max(18, (visibleCount / items.length) * 100)
    : 100;
  const thumbTopPercent = hasScrollableItems && maxWindowStart > 0
    ? (pageStart / maxWindowStart) * (100 - thumbHeightPercent)
    : 0;

  useEffect(() => {
    if (!pageSize) {
      selectedRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [selectedIndex, pageSize]);

  useEffect(() => {
    if (previousSelectedIndexRef.current === selectedIndex) return;
    previousSelectedIndexRef.current = selectedIndex;
    if (!hasScrollableItems) return;

    setShowScrollIndicator(true);
    if (hideIndicatorTimerRef.current) {
      clearTimeout(hideIndicatorTimerRef.current);
    }
    hideIndicatorTimerRef.current = setTimeout(() => {
      setShowScrollIndicator(false);
      hideIndicatorTimerRef.current = null;
    }, 1000);

    return () => {
      if (hideIndicatorTimerRef.current) {
        clearTimeout(hideIndicatorTimerRef.current);
        hideIndicatorTimerRef.current = null;
      }
    };
  }, [hasScrollableItems, selectedIndex]);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!onMove || items.length < 2 || Math.abs(event.deltaY) < 1) return;
    event.preventDefault();

    const now = Date.now();
    if (now - lastWheelAtRef.current < 90) return;
    lastWheelAtRef.current = now;

    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const direction = event.deltaY > 0 ? 1 : -1;
    const nextIndex = Math.max(0, Math.min(items.length - 1, currentIndex + direction));
    if (nextIndex !== currentIndex) onMove(nextIndex);
  };

  return (
    <div
      className="menu-list relative flex h-full flex-col overflow-hidden px-3"
      onWheel={handleWheel}
    >
      {/* 标题区 */}
      {title && (
        <div className="menu-header flex-none px-1 pb-2 pt-3 text-center">
          <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-[#F5F7FA]">{title}</h2>
        </div>
      )}

      {/* 菜单项 */}
      <div
        className={`menu-scroll min-h-0 flex-1 pt-1 ${
          pageSize
            ? "grid gap-2 overflow-hidden pb-2"
            : "space-y-1.5 overflow-y-auto pb-3"
        }`}
        style={pageSize ? { gridTemplateRows: `repeat(${resolvedPageSize}, minmax(0, 1fr))` } : undefined}
      >
        {visibleItems.map((item, localIndex) => {
          const idx = pageStart + localIndex;
          const isSelected = idx === selectedIndex;
          const Icon = item.icon ?? Circle;

          return (
            <button
              key={item.key ?? item.label}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              onClick={() => onSelect(idx)}
              className={`menu-row group flex w-full items-center gap-3 px-3 py-2.5 text-left ${pageSize ? "min-h-0" : ""} ${isSelected ? "is-selected" : ""} ${item.danger ? "is-danger" : ""} ${item.className ?? ""}`}
            >
              <span className={`menu-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border transition-colors ${
                isSelected
                  ? "border-[#43C7FF]/25 bg-[#2F6BFF]/18 text-[#C7E3FF]"
                  : "border-white/[0.06] bg-white/[0.025] text-[#8291A6] group-hover:border-[#2F6BFF]/30 group-hover:bg-[#2F6BFF]/10 group-hover:text-[#43C7FF]"
              }`}>
                <Icon className={item.icon ? "h-4 w-4" : "h-1.5 w-1.5 fill-current"} strokeWidth={item.icon ? 1.5 : 0} />
              </span>

              <div className="flex-1 min-w-0 text-left">
                <div className={`menu-label truncate text-[12px] font-medium tracking-wide transition-colors ${isSelected ? "text-[#F5F7FA]" : "text-[#D8E0EA] group-hover:text-white"}`}>
                  {item.label}
                </div>
              </div>

              {item.value && (
                <span className={`max-w-[112px] truncate text-[10px] tabular-nums ${isSelected ? "text-[#A8C5FF]" : "text-[#8291A6]"}`}>{item.value}</span>
              )}
              {item.badge && (
                <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[9px] font-medium text-blue-300">{item.badge}</span>
              )}

              {item.rightIcon ? (
                <item.rightIcon className={`h-4 w-4 shrink-0 transition-all ${item.rightClassName ?? ""} ${isSelected ? "translate-x-0.5" : ""}`} strokeWidth={1.5} />
              ) : (
                <ChevronRight className={`menu-chevron h-3.5 w-3.5 shrink-0 transition-all ${isSelected ? "translate-x-0.5 text-[#43C7FF]" : "text-[#4C5B70] group-hover:text-[#8291A6]"}`} strokeWidth={1.5} />
              )}
            </button>
          );
        })}
      </div>

      {hasScrollableItems && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-3 right-1 w-[3px] overflow-hidden rounded-full bg-white/[0.045] transition-opacity duration-300 ${
            title ? "top-14" : "top-3"
          } ${showScrollIndicator ? "opacity-100" : "opacity-0"}`}
        >
          <span
            className="absolute left-0 w-full rounded-full bg-[#43C7FF] shadow-[0_0_8px_rgba(67,199,255,.65)] transition-[top,height] duration-200 ease-out"
            style={{
              height: `${thumbHeightPercent}%`,
              top: `${thumbTopPercent}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
