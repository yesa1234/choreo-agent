"use client";

import type { SectionRehearsalCard } from "@/lib/types";

function Block({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 py-2 border-b border-line/60 last:border-0">
      <div className="label pt-1">{k}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export default function RehearsalCardView({ card }: { card: SectionRehearsalCard }) {
  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <span className="tag !text-ink !border-ink">{card.sectionTitle}</span>
          {card.revision > 0 && <span className="tag !border-accent/40 !text-accent">修订 v{card.revision}</span>}
          <div className="text-xs text-muted mt-1">{card.sectionFunction}</div>
        </div>
      </div>

      <Block k="场景">{card.sceneDescription}</Block>
      <Block k="你的状态">{card.performerState}</Block>
      <Block k="动作灵感">{card.movementInspiration}</Block>
      <Block k="身体入口">
        <ul className="list-disc pl-4 space-y-0.5">
          {card.bodyEntryPoints.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </Block>
      <Block k="空间路线">{card.spatialRoute}</Block>
      <Block k="舞台调度">{card.stagingNotes}</Block>
      <Block k="音乐感觉">{card.musicFeeling}</Block>

      <div className="mt-4">
        <div className="label mb-2">动作种子 · {card.movementSeeds.length} 个</div>
        <div className="space-y-2">
          {card.movementSeeds.map((m) => (
            <div key={m.id} className="border border-line p-3 rounded-sm bg-white">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="tag !text-ink !border-ink">{m.id}</span>
              </div>
              <div className="text-sm mb-1.5">{m.description}</div>
              <div className="text-[11px] text-muted flex flex-wrap gap-x-3">
                <span>身体：{m.bodyFocus}</span>
                <span>空间：{m.spaceFocus}</span>
                <span>节奏：{m.timingFocus}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="label mb-2">不要做</div>
        <div>
          {card.avoid.map((a, i) => (
            <span key={i} className="tag !border-accent/40 !text-accent">✗ {a}</span>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="label mb-2">做完后回来回答</div>
        <ol className="list-decimal pl-5 text-sm space-y-0.5">
          {card.feedbackQuestions.map((q, i) => <li key={i}>{q}</li>)}
        </ol>
      </div>
    </div>
  );
}
