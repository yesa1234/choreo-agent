// 运行时最小校验。

export function safeJSON<T = any>(text: string): T | null {
  try { return JSON.parse(text) as T; } catch { return null; }
}

export function assertConcepts(o: any): o is { concepts: any[] } {
  return o && Array.isArray(o.concepts) && o.concepts.length >= 1
    && o.concepts.every((c: any) => c.title && Array.isArray(c.sectionSketches));
}

export function assertMacro(o: any): boolean {
  return o && o.macroStructure && Array.isArray(o.macroStructure.sections)
    && o.macroStructure.sections.length >= 1;
}

export function assertCard(o: any): boolean {
  return o && o.card && Array.isArray(o.card.movementSeeds)
    && o.card.movementSeeds.length >= 3;
}

export function assertDirectorFeedback(o: any): boolean {
  return o && o.directorFeedback && typeof o.directorFeedback.nextStep === "string"
    && ["revise_current_section", "move_to_next_section", "generate_final_work"]
        .includes(o.directorFeedback.nextStep);
}

export function assertFinalPiece(o: any): boolean {
  return o && o.finalPiece && Array.isArray(o.finalPiece.sections)
    && o.finalPiece.sections.length >= 1;
}
