"use client";

import type { DirectorFeedback } from "@/lib/types";

const STEP_LABEL: Record<DirectorFeedback["nextStep"], string> = {
  revise_current_section: "建议：再修订一次本段",
  move_to_next_section: "建议：进入下一段",
  generate_final_work: "建议：生成最终作品",
};

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 py-1.5 border-b border-line/60 last:border-0">
      <div className="label pt-1">{k}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export default function DirectorFeedbackView({ df }: { df: DirectorFeedback }) {
  return (
    <div className="card mt-6 border-ink/40">
      <div className="flex items-baseline justify-between mb-3">
        <div className="label">编导点评</div>
        <span className="tag !text-ink !border-ink">{STEP_LABEL[df.nextStep]}</span>
      </div>

      <Row k="本段诊断"><div className="italic">{df.diagnosis}</div></Row>
      <Row k="应当保留">
        <ul className="list-disc pl-4">{df.retain.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </Row>
      <Row k="需要调整">
        <ul className="list-disc pl-4">{df.revise.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </Row>
      <Row k="应该删掉">
        <ul className="list-disc pl-4 text-accent">{df.discard.map((s, i) => <li key={i}>✗ {s}</li>)}</ul>
      </Row>
      <Row k="具体建议">
        <ol className="list-decimal pl-4 space-y-1">
          {df.concreteSuggestions.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </Row>
      <Row k="本段最终方向">{df.revisedMovementDirection}</Row>
      <Row k="转入下一段">{df.transitionToNextSection}</Row>
    </div>
  );
}
