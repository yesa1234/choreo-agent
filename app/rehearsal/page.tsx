"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import WorkbenchLayout from "@/components/WorkbenchLayout";
import StageHeader from "@/components/StageHeader";
import RehearsalCardView from "@/components/RehearsalCardView";
import SectionFeedbackForm from "@/components/SectionFeedbackForm";
import DirectorFeedbackView from "@/components/DirectorFeedbackView";
import { loadProject, saveProject } from "@/lib/storage";
import { emptyProject, getSectionTrail } from "@/lib/types";
import type {
  ChoreoProject, DirectorFeedback, SectionFeedback, SectionRehearsalCard,
} from "@/lib/types";

export default function RehearsalPage() {
  const router = useRouter();
  const [project, setProject] = useState<ChoreoProject>(emptyProject());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const p = loadProject();
    setProject(p);
    if (!p.macroStructure || p.rehearsalCards.length === 0) router.replace("/macro");
  }, [router]);

  const macro = project.macroStructure;
  const currentSection = macro?.sections[project.currentSectionIndex];

  const trail = useMemo(() => {
    if (!currentSection) return { cards: [], feedbacks: [], directorFeedbacks: [] };
    return getSectionTrail(project, currentSection.id);
  }, [project, currentSection]);

  const currentCard: SectionRehearsalCard | undefined = trail.cards[trail.cards.length - 1];
  const currentFeedback: SectionFeedback | undefined =
    trail.feedbacks.find((f) => f.revision === currentCard?.revision);
  const currentDF: DirectorFeedback | undefined =
    trail.directorFeedbacks.find((d) => d.revision === currentCard?.revision);

  if (!macro || !currentSection || !currentCard) return null;

  /** 提交反馈，请求编导点评 */
  const submitFeedback = async (
    draft: Omit<SectionFeedback, "sectionId" | "revision">
  ) => {
    setLoading(true); setErr(null);
    try {
      const fb: SectionFeedback = {
        sectionId: currentSection.id,
        revision: currentCard.revision,
        ...draft,
      };
      const next: ChoreoProject = {
        ...project,
        sectionFeedbacks: [...project.sectionFeedbacks, fb],
      };
      setProject(next); saveProject(next);

      const res = await fetch("/api/choreo-agent", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "director_feedback", project: next,
          sectionId: currentSection.id, feedback: fb,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "请求失败");

      const df: DirectorFeedback = data.directorFeedback;
      const updated: ChoreoProject = {
        ...next,
        directorFeedbacks: [...next.directorFeedbacks, df],
      };
      setProject(updated); saveProject(updated);
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  /** 按编导建议推进 */
  const proceed = async () => {
    if (!currentDF) return;
    setLoading(true); setErr(null);
    try {
      if (currentDF.nextStep === "revise_current_section") {
        // 让 AI 出本段的修订版排练卡
        const res = await fetch("/api/choreo-agent", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "generate_section_card", project,
            sectionId: currentSection.id, revision: 1,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "请求失败");
        const updated: ChoreoProject = {
          ...project,
          rehearsalCards: [...project.rehearsalCards, data.card],
        };
        setProject(updated); saveProject(updated);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (currentDF.nextStep === "move_to_next_section") {
        const nextIdx = project.currentSectionIndex + 1;
        const nextSection = macro.sections[nextIdx];
        const res = await fetch("/api/choreo-agent", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "generate_section_card", project,
            sectionId: nextSection.id, revision: 0,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "请求失败");
        const updated: ChoreoProject = {
          ...project,
          currentSectionIndex: nextIdx,
          rehearsalCards: [...project.rehearsalCards, data.card],
        };
        setProject(updated); saveProject(updated);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (currentDF.nextStep === "generate_final_work") {
        const res = await fetch("/api/choreo-agent", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "generate_final", project }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "请求失败");
        const updated: ChoreoProject = {
          ...project, stage: "final", finalPiece: data.finalPiece,
        };
        setProject(updated); saveProject(updated);
        router.push("/final");
        return;
      }
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  const proceedLabel: Record<DirectorFeedback["nextStep"], string> = {
    revise_current_section: "按建议修订本段排练卡",
    move_to_next_section: `进入下一段 · §${project.currentSectionIndex + 2} ${macro.sections[project.currentSectionIndex + 1]?.title ?? ""}`,
    generate_final_work: "生成最终作品方案",
  };

  return (
    <WorkbenchLayout project={project}>
      <StageHeader current="rehearsal" />
      <h1 className="text-2xl font-medium mb-1">
        第 {project.currentSectionIndex + 1} / {macro.sections.length} 段 · {currentSection.title}
      </h1>
      <p className="text-sm text-muted mb-6">
        读完这张卡 → 在你的空间里实际试一次（5–10 分钟即可）→ 回来填反馈 → AI 编导点评
      </p>

      {/* 历史段折叠 */}
      {project.currentSectionIndex > 0 && (
        <details className="mb-3 card !py-3">
          <summary className="cursor-pointer text-sm">
            已完成 {project.currentSectionIndex} 段（点击展开痕迹）
          </summary>
          <div className="mt-3 space-y-2 text-xs">
            {macro.sections.slice(0, project.currentSectionIndex).map((s) => {
              const t = getSectionTrail(project, s.id);
              const lastDF = t.directorFeedbacks[t.directorFeedbacks.length - 1];
              return (
                <div key={s.id}>
                  <span className="tag !text-ink !border-ink">§{s.index}</span>
                  {s.title}
                  {lastDF && (
                    <span className="text-muted"> · 保留 {lastDF.retain.length} 条 · 删 {lastDF.discard.length} 条</span>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}

      <RehearsalCardView card={currentCard} />

      {!currentFeedback && (
        <SectionFeedbackForm card={currentCard} submitting={loading} onSubmit={submitFeedback} />
      )}

      {currentDF && (
        <>
          <DirectorFeedbackView df={currentDF} />
          <div className="mt-4">
            <button className="btn" disabled={loading} onClick={proceed}>
              {loading ? "AI 正在准备…" : proceedLabel[currentDF.nextStep]}
            </button>
          </div>
        </>
      )}

      {err && <div className="text-sm text-accent mt-4">⚠ {err}</div>}
    </WorkbenchLayout>
  );
}
