interface StatusBadgeProps {
  color: "red" | "amber" | "green" | "cyan";
  label: string;
}

const colorMap: Record<StatusBadgeProps["color"], string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  green: "bg-green-500",
  cyan: "bg-cyan-500",
};

export function StatusBadge({ color, label }: StatusBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 ${colorMap[color]}`} />
      <span className="text-slate-400 text-[10px] font-mono tracking-wide">
        {label}
      </span>
    </div>
  );
}
