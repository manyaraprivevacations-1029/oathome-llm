import { getEmployee } from "./config";
import { processConversationTurn } from "./orchestrator";
import type { ConversationState } from "./conversation";

export type CallControlInput = {
  employeeId: string;
  leadId: string;
  phone?: string;
  text?: string;
  previousState?: ConversationState;
  completed?: boolean;
};

export type CallControlResult = {
  action: "speak" | "end";
  text: string;
  state: ConversationState;
  summary?: unknown;
};

export function handleCallTurn(input: CallControlInput): CallControlResult {
  const employee = getEmployee(input.employeeId);
  if (!employee) throw new Error("AI employee not found");

  const result = processConversationTurn(
    {
      employeeId: input.employeeId,
      leadId: input.leadId,
      phone: input.phone ?? "",
      purpose: "qualification",
    },
    input.text ?? "",
    input.previousState,
    Boolean(input.completed),
  );

  return {
    action: input.completed ? "end" : "speak",
    text: result.response,
    state: result.state,
    summary: result.summary,
  };
}
