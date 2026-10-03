import { cn } from "@/lib/utils";

export function AnonToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
      {[
        { v: true, label: "🤫 Anonymous" },
        { v: false, label: "🙋 Use my name" },
      ].map((o) => (
        <button
          key={String(o.v)}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded-full py-2 text-sm font-semibold transition-colors",
            value === o.v ? "bg-card text-foreground shadow-card" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
