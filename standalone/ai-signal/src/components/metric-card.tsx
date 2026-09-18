import type { AppStat } from "@/lib/product-model";

export function MetricCard({ stat }: { stat: AppStat }) {
  return (
    <div className="signal-card rounded-[28px] p-5">
      <div className="signal-kicker">{stat.label}</div>
      <div className="signal-metric mt-4">{stat.value}</div>
      <p className="mt-3 text-sm text-slate-300">{stat.note}</p>
    </div>
  );
}
