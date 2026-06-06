"use client";

import type { ChoreoProject } from "@/lib/types";

function Section({ title, children, empty }: { title: string; children?: React.ReactNode; empty?: boolean }) {
  return (
    <div className="mb-5">
      <div className="label mb-1.5">{title}</div>
      {empty ? <div className="text-xs text-muted italic">未填写</div> : <div className="text-sm leading-relaxed">{children}</div>}
    </div>
  );
}

export default function ProjectDossier({ project }: { project: ChoreoProject }) {
  const {
    intake, choreographicConcepts, selectedConceptId, macroStructure,
    rehearsalCards, sectionFeedbacks, directorFeedbacks, finalPiece, currentSectionIndex,
  } = project;

  const selectedConcept = choreographicConcepts.find((c) => c.id === selectedConceptId);
  const title = finalPiece?.title || macroStructure?.workingTitle || selectedConcept?.title || "（尚未确定）";

  return (
    <aside className="bg-paper border-r border-line p-5 overflow-y-auto h-screen sticky top-0">
      <div className="mb-5 pb-3 border-b border-line">
        <div className="label">创作档案</div>
        <div className="text-lg font-medium mt-0.5">{title}</div>
        <div className="text-[11px] text-muted mt-0.5">
          {project.id} · 更新于 {new Date(project.updatedAt).toLocaleTimeString()}
        </div>
      </div>

      <Section title="原始素材" empty={!intake.feelings && !intake.story && !intake.existingIdea}>
        {intake.feelings && <div className="mb-1">· 感受：{intake.feelings}</div>}
        {intake.story && <div className="mb-1">· 故事：{intake.story}</div>}
        {intake.existingIdea && <div className="mb-1">· 已有构思：{intake.existingIdea}</div>}
        <div className="text-[11px] text-muted mt-1.5">
          {intake.performerCount} 人 · {intake.durationSec}s · {intake.space || "空间未填"} · {intake.props || "无道具"}
        </div>
      </Section>

      <Section title="编导构思方向" empty={!selectedConcept}>
        {selectedConcept && (
          <>
            <div className="mb-1">· {selectedConcept.title}</div>
            <div className="text-xs text-muted">问题：{selectedConcept.choreographicQuestion}</div>
          </>
        )}
      </Section>

      <Section title="宏观结构" empty={!macroStructure}>
        {macroStructure && (
          <>
            <div className="mb-1">{macroStructure.oneLineThesis}</div>
            <div className="text-xs text-muted">
              {macroStructure.sections.length} 段 · 共 {macroStructure.totalDurationSec}s
            </div>
            <div className="mt-2 space-y-0.5">
              {macroStructure.sections.map((s, i) => (
                <div key={s.id} className="text-xs">
                  <span className={`tag ${i === currentSectionIndex ? "!text-ink !border-ink" : ""}`}>
                    §{s.index}
                  </span>
                  {s.title} <span className="text-muted">· {s.durationSec}s</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title="排练痕迹" empty={rehearsalCards.length === 0}>
        {macroStructure?.sections.map((sec) => {
          const cards = rehearsalCards.filter((c) => c.sectionId === sec.id);
          const fb = sectionFeedbacks.filter((f) => f.sectionId === sec.id);
          const dfs = directorFeedbacks.filter((d) => d.sectionId === sec.id);
          if (cards.length === 0) return null;
          return (
            <div key={sec.id} className="mb-1.5 text-xs">
              <span className="tag">§{sec.index}</span>
              {sec.title}：卡 {cards.length} · 反馈 {fb.length} · 点评 {dfs.length}
            </div>
          );
        })}
      </Section>

      <Section title="最终作品" empty={!finalPiece}>
        {finalPiece && (
          <>
            <div className="font-medium">{finalPiece.title}</div>
            <div className="text-xs text-muted">{finalPiece.durationSec}s · {finalPiece.sections.length} 段</div>
          </>
        )}
      </Section>
    </aside>
  );
}
