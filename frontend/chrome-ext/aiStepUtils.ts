import type { CapturedStep } from './playwrightCodegen';
import { getSelectedCommand } from './playwrightCodegen';

/** Placeholder inside ai.act — user must replace before creating SmartTest */
export const AI_ACT_PLACEHOLDER = '[Explain step in english]';

/** Placeholder inside ai.verify — user must replace before creating SmartTest */
export const AI_VERIFY_PLACEHOLDER = '[Explain check in english]';

/** Synthetic AI-native action step (last option in cycle) */
export const AI_ACT_TEMPLATE = `await ai.act("${AI_ACT_PLACEHOLDER}",{page,test});`;

/** Synthetic AI-native assert step (last option in cycle) */
export const AI_VERIFY_TEMPLATE = `await ai.verify("${AI_VERIFY_PLACEHOLDER}",{page,test});`;

const AI_SYNTH_PATTERN =
  /await\s+ai\.(act|verify)\s*\(\s*["'`][^"'`]*["'`]\s*,\s*\{\s*page\s*,\s*test\s*\}\s*\)\s*;/;

/** True if any of the step's commands is an assertion (expect). */
export function isAssertStep(step: CapturedStep): boolean {
  return (step.commands || []).some((c) => c.includes('await expect('));
}

/** Build the synthetic AI command for a step (assert → verify, else → act). */
export function getAiSynthCommand(step: CapturedStep): string {
  return isAssertStep(step) ? AI_VERIFY_TEMPLATE : AI_ACT_TEMPLATE;
}

/** True if cmd is an ai.act/ai.verify line with {page,test}. */
export function isAiSynthCommand(cmd: string): boolean {
  if (!cmd || typeof cmd !== 'string') return false;
  return AI_SYNTH_PATTERN.test(cmd.trim());
}

/**
 * Ensure each step has the AI-native option as the last command.
 * Idempotent: does not duplicate if the last command is already an AI synth.
 */
export function ensureStepsHaveAiSynthOption(steps: CapturedStep[]): CapturedStep[] {
  if (!steps || steps.length === 0) return steps;
  return steps.map((step) => {
    const commands = step.commands || [];
    if (commands.length === 0) return step;
    const last = commands[commands.length - 1];
    if (isAiSynthCommand(last)) return step;
    const synth = getAiSynthCommand(step);
    const updatedCommands = [...commands, synth];
    // Keep selected index valid if it pointed at last+1 after append
    let selectedCommandIndex = step.selectedCommandIndex ?? 0;
    if (selectedCommandIndex > updatedCommands.length - 1) {
      selectedCommandIndex = updatedCommands.length - 1;
    }
    return {
      ...step,
      commands: updatedCommands,
      selectedCommandIndex,
    };
  });
}

/** True if the selected command is still the default AI template (placeholder not replaced). */
export function hasUnfilledAiSteps(steps: CapturedStep[]): boolean {
  if (!steps || steps.length === 0) return false;
  for (const step of steps) {
    const cmd = getSelectedCommand(step);
    if (!cmd) continue;
    if (cmd.includes(AI_ACT_PLACEHOLDER) || cmd.includes(AI_VERIFY_PLACEHOLDER)) {
      if (isAiSynthCommand(cmd)) return true;
    }
  }
  return false;
}
