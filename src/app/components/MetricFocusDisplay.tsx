function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function MetricFocusDisplay({
  weight,
  flowRate,
  time,
}: {
  weight: number;
  flowRate: number;
  time: number;
}) {
  const flowProgress = Math.min(Math.abs(flowRate) / 8, 1);
  const flowBarWidth = 12 + flowProgress * 88;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#02060B]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(47,107,255,.11),transparent_52%)]" aria-hidden="true" />

      {/* 顶部流速光条 */}
      <div className="absolute left-1/2 top-4 z-20 h-[3px] w-[42%] -translate-x-1/2 rounded-full bg-white/[0.035]">
        <div
          className="absolute left-1/2 top-0 h-full -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-[#F2F5F8] to-transparent shadow-[0_0_10px_rgba(143,232,255,.9)] transition-[width] duration-300 ease-out"
          style={{ width: `${flowBarWidth}%` }}
        />
      </div>

      {/* 左上流速光斑 */}
      <div className="absolute left-[1%] top-[6%] z-[30] flex h-[116px] w-[148px] items-center justify-center">
        <div aria-hidden="true" className="home-side-orb absolute inset-0 rounded-full" />
        <div className="relative whitespace-nowrap text-[31px] font-semibold italic tabular-nums tracking-[-0.045em] text-[#F5F7FA]" style={{ textShadow: "0 2px 4px rgba(0,0,0,.95),0 0 12px rgba(255,255,255,.3)" }}>
          {flowRate.toFixed(1)}<span className="ml-1 text-[15px] font-semibold tracking-normal">g/s</span>
        </div>
      </div>

      {/* 右上时间光斑 */}
      <div className="absolute right-[1%] top-[6%] z-[30] flex h-[116px] w-[148px] items-center justify-center">
        <div aria-hidden="true" className="home-side-orb absolute inset-0 rounded-full" />
        <div className="relative whitespace-nowrap text-[31px] font-semibold tabular-nums tracking-[-0.045em] text-[#F5F7FA]" style={{ textShadow: "0 2px 4px rgba(0,0,0,.95),0 0 12px rgba(255,255,255,.3)" }}>
          {formatTime(time)}
        </div>
      </div>

      {/* 中央随重量扩散的青蓝光球 */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[55%] h-[228px] w-[300px] -translate-x-1/2 -translate-y-1/2"
      >
        <div className="home-weight-orb absolute inset-0 rounded-full" />
        <div className="home-weight-orb-wave absolute inset-[16%] rounded-full" />
      </div>

      {/* 中央重量：仅保留径向暗核，不使用矩形卡片 */}
      <div className="absolute left-1/2 top-[55%] z-20 -translate-x-1/2 -translate-y-1/2 text-center" aria-live="polite">
        <div className="relative px-9 py-8">
          <div aria-hidden="true" className="absolute inset-[-22px] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(2,6,11,.98)_0%,rgba(2,6,11,.84)_38%,rgba(2,6,11,.32)_64%,transparent_76%)] backdrop-blur-[4px]" />
          <div className="relative whitespace-nowrap text-[82px] font-semibold leading-none tabular-nums tracking-[-0.065em] text-[#F5F7FA]" style={{ textShadow: "0 3px 5px rgba(0,0,0,1),0 0 13px rgba(2,6,11,1),0 0 18px rgba(255,255,255,.15)" }}>
            {weight.toFixed(1)}<span className="ml-2.5 text-[19px] font-semibold tracking-normal">g</span>
          </div>
        </div>
      </div>
    </div>
  );
}
