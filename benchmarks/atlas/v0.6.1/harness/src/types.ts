/** Shared shapes for the Atlas harness — the subject case format + the dump/verdict wire formats. */

/** One rubric item the judge scores. `critical !== false` gates the case verdict. */
export interface RubricItem {
  id: string;
  description: string;
  critical?: boolean;
}

/** A required/forbidden tool-call assertion (name + a subset of args that must match). */
export interface ToolCallAssertion {
  name: string;
  anyArgs?: Record<string, unknown>;
}

/** One user turn of a case. */
export interface CaseTurn {
  userText: string;
  attachments?: string[];
}

/** A subject case (the shape authored in the exported `subject/cases-at-*.ts` files). */
export interface CaseSpec {
  id: string;
  title?: string;
  setup: { brandPreset: string; conversationMode?: string; clearConversation?: boolean };
  turns: CaseTurn[];
  expectations?: {
    invariants?: {
      requiredToolCalls?: ToolCallAssertion[];
      forbiddenToolCalls?: ToolCallAssertion[];
    };
    rubric?: RubricItem[];
  };
}

/** An executed tool call observed on the world (name + parsed args + whether it mutated state). */
export interface ObservedCall {
  name: string;
  args: Record<string, unknown>;
  tookEffect: boolean;
}

/** What one arm produced for one case+rep — the raw material for the dump. */
export interface CaseOutcome {
  caseId: string;
  rep: number;
  actualReply: string[];
  actualTrace: string[];
  actualCalls: { name: string; args: Record<string, unknown> }[];
  observed: ObservedCall[];
  errorMsg?: string;
}

/** One record in a `*.dump.json` (the full per-case dump; mirrors the exported result shape). */
export interface DumpRecord {
  caseId: string;
  rep: number;
  goldSeq: string[];
  goldReply: string[];
  actualReply: string[];
  actualTrace: string[];
  actualCalls: { name: string; args: Record<string, unknown> }[];
  status: string;
  invariantFailures: string[];
  judgeVerdict: string | null;
  judgeReasoning: unknown[];
}

/** One line in a `*.dump.tasks.jsonl` (a case that needs LLM-judge grading). */
export interface JudgeTask {
  caseId: string;
  rep: number;
  rubric: RubricItem[];
  actualReply: string[];
  actualTrace: string[];
  actualCalls: { name: string; args: Record<string, unknown> }[];
  goldSeq: string[];
  goldReply: string[];
}

/** One entry in a `*.dump.autofail.json` (a deterministic invariant-gate failure). */
export interface AutofailEntry {
  caseId: string;
  rep: number;
  reason: string;
}

/** One rubric-item verdict returned by the judge. */
export interface ItemVerdict {
  id: string;
  pass: boolean;
  reasoning: string;
}

/** One line in a `*.verdicts.jsonl`. */
export interface CaseVerdict {
  caseId: string;
  rep: number;
  verdicts: ItemVerdict[];
  overall: 'pass' | 'fail';
}
