"use client";

import { useState } from "react";
import type { SectionFeedback, SectionRehearsalCard } from "@/lib/types";

type Draft = Omit<SectionFeedback, "sectionId" | "revision">;

const ADJUSTMENTS = ["更慢", "更快", "更轻", "更重", "更紧", "更松"];

export default function SectionFeedbackForm({
  card,
  submitting,
  onSubmit,
}: {
  card: SectionRehearsalCard;
  submitting: boolean;
  onSubmit: (d: Draft) => void;
}) {
  const [d, setD] = useState<Draft>({
    mostUsefulSeed: "",
    leastUsefulSeed: "",
    strongestBodySensation: "",
    newMovementDiscovered: "",
    awkwardOrFakeMoment: "",
    preferredSpacePoint: "",
    desiredAdjustment: "",
    freeReflection: "",
  });

  const seedOptions = ["（没有选）", ...card.movementSeeds.map((m) => `${m.id} · ${m.description.slice(0, 40)}…`)];
  const canSubmit = d.strongestBodySensation.trim().length > 0 && !submitting;

  return (
    <div className="card space-y-4 mt-6">
      <div className="label">做完这一段后，回来回答</div>

      <Field label="哪个动作种子最有感觉？">
        <select className="field" value={d.mostUsefulSeed}
          onChange={(e) => setD({ ...d, mostUsefulSeed: e.target.value })}>
          {seedOptions.map((s, i) => <option key={i} value={i === 0 ? "" : s}>{s}</option>)}
        </select>
      </Field>

      <Field label="哪个动作种子最不好用？">
        <select className="field" value={d.leastUsefulSeed}
          onChange={(e) => setD({ ...d, leastUsefulSeed: e.target.value })}>
          {seedOptions.map((s, i) => <option key={i} value={i === 0 ? "" : s}>{s}</option>)}
        </select>
      </Field>

      <Field label="身体哪个部位最有反应？">
        <input className="field"
          placeholder="例如：右肩胛、脚跟、胸骨…"
          value={d.strongestBodySensation}
          onChange={(e) => setD({ ...d, strongestBodySensation: e.target.value })} />
      </Field>

      <Field label="有没有自然产生新的动作？（卡片上没写的）">
        <textarea className="field" rows={2}
          value={d.newMovementDiscovered}
          onChange={(e) => setD({ ...d, newMovementDiscovered: e.target.value })} />
      </Field>

      <Field label="哪个瞬间最假或最尴尬？">
        <textarea className="field" rows={2}
          value={d.awkwardOrFakeMoment}
          onChange={(e) => setD({ ...d, awkwardOrFakeMoment: e.target.value })} />
      </Field>

      <Field label="这一段你最想停在舞台哪个位置？">
        <input className="field"
          placeholder="例如：椅子右前方半步、舞台中线偏后…"
          value={d.preferredSpacePoint}
          onChange={(e) => setD({ ...d, preferredSpacePoint: e.target.value })} />
      </Field>

      <Field label="你觉得这一段需要：">
        <div className="flex flex-wrap gap-2">
          {ADJUSTMENTS.map((a) => (
            <button key={a} type="button"
              className={`tag !text-sm !px-3 !py-1 cursor-pointer ${
                d.desiredAdjustment === a ? "!border-ink !text-ink" : ""
              }`}
              onClick={() => setD({ ...d, desiredAdjustment: a })}>
              {a}
            </button>
          ))}
        </div>
      </Field>

      <Field label="其他自由反馈（可选）">
        <textarea className="field" rows={3}
          value={d.freeReflection}
          onChange={(e) => setD({ ...d, freeReflection: e.target.value })} />
      </Field>

      <button className="btn" disabled={!canSubmit} onClick={() => onSubmit(d)}>
        {submitting ? "AI 编导正在看…" : "提交反馈，看编导点评"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted mb-1">{label}</div>
      {children}
    </div>
  );
}
