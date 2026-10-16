import type { ConversationState } from "./conversation";
import { scoreLead } from "./scoring";

export type CallSummary = {
  summary: string;
  score: number;
  status: "Hot" | "Warm" | "Cold";
  qualification: {
    destination?: string;
    travelDate?: string;
    travellers?: number;
    budget?: number;
    intent: "unknown" | "low" | "medium" | "high";
  };
  objections: string[];
  nextAction: string;
};

export function buildCallSummary(state: ConversationState, transcript: string): CallSummary {
  const scored = scoreLead({
    destination: state.destination,
    travelDate: state.travelDate,
    travellers: state.travellers,
    budget: state.budget,
    intent: state.intent,
    responded: true,
  });

  const nextAction =
    state.objections.includes("timing")
      ? "Schedule a follow-up at the customer's preferred time."
      : state.intent === "high"
        ? "Assign to a salesperson for immediate booking assistance."
        : "Send package details and schedule the next follow-up.";

  const summaryParts = [
    state.destination ? `Interested in ${state.destination}.` : "Destination not confirmed.",
    state.travelDate ? `Travel date: ${state.travelDate}.` : "Travel date not confirmed.",
    state.travellers ? `Travellers: ${state.travellers}.` : "Traveller count not confirmed.",
    state.budget ? `Budget: ₹${state.budget.toLocaleString("en-IN")}.` : "Budget not confirmed.",
  ];

  return {
    summary: summaryParts.join(" "),
    score: scored.score,
    status: scored.status,
    qualification: {
      destination: state.destination,
      travelDate: state.travelDate,
      travellers: state.travellers,
      budget: state.budget,
      intent: state.intent,
    },
    objections: [...new Set(state.objections)],
    nextAction: `${nextAction} Transcript length: ${transcript.length} characters.`,
  };
}
