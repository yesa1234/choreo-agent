import { NextRequest, NextResponse } from "next/server";
import { callLLM, detectProvider } from "@/lib/llm";
import {
  SYSTEM_PROMPT,
  conceptPrompt,
  macroStructurePrompt,
  sectionRehearsalCardPrompt,
  directorFeedbackPrompt,
  finalPiecePrompt,
} from "@/lib/prompts";
import {
  safeJSON,
  assertConcepts,
  assertMacro,
  assertCard,
  assertDirectorFeedback,
  assertFinalPiece,
} from "@/lib/schema";
import type {
  ChoreoProject,
  SectionRehearsalCard,
  SectionFeedback,
  MacroSection,
} from "@/lib/types";
import { getSectionTrail } from "@/lib/types";

export const runtime = "nodejs";

type Action =
  | { action: "generate_concepts"; project: ChoreoProject }
  | { action: "build_macro"; project: ChoreoProject; conceptId: string }
  | { action: "generate_section_card"; project: ChoreoProject; sectionId: string; revision: 0 | 1 }
  | {
      action: "director_feedback";
      project: ChoreoProject;
      sectionId: string;
      feedback: SectionFeedback;
    }
  | { action: "generate_final"; project: ChoreoProject };

function trailSummary(p: ChoreoProject, beforeIndex: number) {
  if (!p.macroStructure) return [];
  const before = p.macroStructure.sections.slice(0, beforeIndex);
  return before.map((s) => {
    const t = getSectionTrail(p, s.id);
    return {
      sectionId: s.id,
      title: s.title,
      cards: t.cards.map((c) => ({
        revision: c.revision,
        movementSeeds: c.movementSeeds.map((m) => ({ id: m.id, description: m.description })),
      })),
      feedbacks: t.feedbacks,
      directorFeedbacks: t.directorFeedbacks,
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Action;
    const provider = detectProvider();

    switch (body.action) {
      /* ─────────── concept ─────────── */
      case "generate_concepts": {
        const user = conceptPrompt(JSON.stringify(body.project.intake));
        const raw = await callLLM({ system: SYSTEM_PROMPT, user });
        const parsed = safeJSON(raw);
        if (!assertConcepts(parsed)) {
          return NextResponse.json({ error: "invalid_concepts", raw }, { status: 502 });
        }
        return NextResponse.json({ provider, ...parsed });
      }

      /* ─────────── macro ─────────── */
      case "build_macro": {
        const concept = body.project.choreographicConcepts.find((c) => c.id === body.conceptId);
        if (!concept) return NextResponse.json({ error: "concept_not_found" }, { status: 400 });
        const user = macroStructurePrompt(
          JSON.stringify(body.project.intake),
          JSON.stringify(concept)
        );
        const raw = await callLLM({ system: SYSTEM_PROMPT, user });
        const parsed = safeJSON(raw);
        if (!assertMacro(parsed)) {
          return NextResponse.json({ error: "invalid_macro", raw }, { status: 502 });
        }
        // 保险：确保每个 section 有 id
        const macro = (parsed as any).macroStructure;
        macro.sections = macro.sections.map((s: MacroSection, i: number) => ({
          ...s,
          index: s.index ?? i + 1,
          id: s.id ?? `s${s.index ?? i + 1}`,
        }));
        return NextResponse.json({ provider, macroStructure: macro, selectedConcept: concept });
      }

      /* ─────────── section rehearsal card ─────────── */
      case "generate_section_card": {
        const macro = body.project.macroStructure;
        if (!macro) return NextResponse.json({ error: "no_macro" }, { status: 400 });
        const section = macro.sections.find((s) => s.id === body.sectionId);
        if (!section) return NextResponse.json({ error: "section_not_found" }, { status: 400 });
        const idx = macro.sections.findIndex((s) => s.id === body.sectionId);

        // 修订指令：若 revision=1，把最近一条 directorFeedback 喂进去
        let revisionDirective: any = {};
        if (body.revision === 1) {
          const all = body.project.directorFeedbacks.filter((d) => d.sectionId === body.sectionId);
          revisionDirective = all[all.length - 1] ?? {};
        }

        const user = sectionRehearsalCardPrompt({
          intakeJson: JSON.stringify(body.project.intake),
          macroJson: JSON.stringify(macro),
          currentSectionJson: JSON.stringify(section),
          priorSectionTrailsJson: JSON.stringify(trailSummary(body.project, idx)),
          revisionDirectiveJson: JSON.stringify(revisionDirective),
          revision: body.revision,
        });
        const raw = await callLLM({ system: SYSTEM_PROMPT, user });
        const parsed = safeJSON(raw);
        if (!assertCard(parsed)) {
          return NextResponse.json({ error: "invalid_card", raw }, { status: 502 });
        }
        // 兜底：补齐字段
        const card = (parsed as any).card as SectionRehearsalCard;
        card.sectionId = body.sectionId;
        card.sectionTitle = card.sectionTitle || section.title;
        card.sectionFunction = card.sectionFunction || section.function;
        card.revision = body.revision;
        return NextResponse.json({ provider, card });
      }

      /* ─────────── director feedback ─────────── */
      case "director_feedback": {
        const macro = body.project.macroStructure;
        if (!macro) return NextResponse.json({ error: "no_macro" }, { status: 400 });
        const section = macro.sections.find((s) => s.id === body.sectionId);
        if (!section) return NextResponse.json({ error: "section_not_found" }, { status: 400 });
        const idx = macro.sections.findIndex((s) => s.id === body.sectionId);
        const isLast = idx === macro.sections.length - 1;
        const cardsForThisSection = body.project.rehearsalCards.filter(
          (c) => c.sectionId === body.sectionId
        );
        const currentCard = cardsForThisSection[cardsForThisSection.length - 1];
        if (!currentCard) {
          return NextResponse.json({ error: "no_current_card" }, { status: 400 });
        }
        const alreadyRevisedOnce =
          body.project.directorFeedbacks.filter((d) => d.sectionId === body.sectionId).length >= 1;

        const user = directorFeedbackPrompt({
          macroJson: JSON.stringify(macro),
          currentSectionJson: JSON.stringify(section),
          currentCardJson: JSON.stringify(currentCard),
          currentFeedbackJson: JSON.stringify(body.feedback),
          priorSectionTrailsJson: JSON.stringify(trailSummary(body.project, idx)),
          isLastSection: isLast,
          alreadyRevisedOnce,
        });
        const raw = await callLLM({ system: SYSTEM_PROMPT, user });
        const parsed = safeJSON(raw);
        if (!assertDirectorFeedback(parsed)) {
          return NextResponse.json({ error: "invalid_director_feedback", raw }, { status: 502 });
        }
        const df = (parsed as any).directorFeedback;
        // 强制收口 nextStep，避免模型违规
        if (isLast && df.nextStep === "move_to_next_section") df.nextStep = "generate_final_work";
        if (!isLast && df.nextStep === "generate_final_work") df.nextStep = "move_to_next_section";
        if (alreadyRevisedOnce && df.nextStep === "revise_current_section") {
          df.nextStep = isLast ? "generate_final_work" : "move_to_next_section";
        }
        df.sectionId = body.sectionId;
        df.revision = currentCard.revision;
        return NextResponse.json({ provider, directorFeedback: df });
      }

      /* ─────────── final ─────────── */
      case "generate_final": {
        const user = finalPiecePrompt(JSON.stringify(body.project));
        const raw = await callLLM({ system: SYSTEM_PROMPT, user });
        const parsed = safeJSON(raw);
        if (!assertFinalPiece(parsed)) {
          return NextResponse.json({ error: "invalid_final", raw }, { status: 502 });
        }
        return NextResponse.json({ provider, ...parsed });
      }

      default:
        return NextResponse.json({ error: "unknown_action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
