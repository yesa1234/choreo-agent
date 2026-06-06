"use client";

import type { Stage } from "@/lib/types";
import { STAGE_LABEL } from "@/lib/types";

const order: Stage[] = ["intake", "concept", "macro", "rehearsal", "final"];

export default function StageHeader({ current, children }: { current: Stage; children?: React.ReactNode }) {
  const idx = order.indexOf(current);
  return (
    <div className="mb-6">
      <div className="flex items-center gap-0 mb-5 flex-wrap">
        {order.map((s, i) => {
          const state = i < idx ? "done" : i === idx ? "active" : "todo";
          return (
            <div key={s} className="flex items-center">
              <div
                className={`text-[11px] uppercase tracking-[0.12em] px-3 py-1.5 border ${
                  state === "active"
                    ? "border-ink bg-ink text-paper"
                    : state === "done"
                    ? "border-ink/30 bg-ink/10 text-ink/60"
                    : "border-line text-muted"
                }`}
              >
                {state === "done" ? "✓ " : ""}{STAGE_LABEL[s]}
              </div>
              {i < order.length - 1 && <div className="w-3 h-px bg-line mx-0" />}
            </div>
          );
        })}
      </div>
      {children}
    </div>
  );
}
