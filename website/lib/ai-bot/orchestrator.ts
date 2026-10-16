import { getEmployee } from "./config";
import { extractConversationState, nextQuestion, type ConversationState } from "./conversation";
import { buildCallSummary, type CallSummary } from "./summary";
import type { CallRequest } from "./types";

export type OrchestrationResult = {
  employeeId: string;
  state: ConversationState;
  response: string;
  summary?: CallSummary;
};

export function processConversationTurn(
  request: CallRequest,
  text: string,
  previous?: ConversationState,
  completed = false,
): OrchestrationResult {
  const employee = getEmployee(request.employeeId);
  if (!employee) throw new Error("AI employee not found");

  const state = extractConversationState(text, previous);
  if (completed) {
    state.stage = "completed";
    return {
      employeeId: employee.id,
      state,
      response: "Thank you. Our travel team will take the next step with you.",
      summary: buildCallSummary(state, text),
    };
  }

  state.nextAction = nextQuestion(state);

  return {
    employeeId: employee.id,
    state,
    response: state.nextAction,
  };
}
