import type { LeadStatus } from "./types";

export type QualificationInput = {
  destination?: string;
  travelDate?: string;
  travellers?: number;
  budget?: number;
  intent?: "unknown" | "low" | "medium" | "high";
  responded?: boolean;
};

export function scoreLead(input: QualificationInput): { score: number; status: LeadStatus } {
  let score = 0;
  if (input.destination) score += 25;
  if (input.travelDate) score += 25;
  if (input.travellers && input.travellers > 0) score += 15;
  if (input.budget && input.budget > 0) score += 15;
  if (input.intent === "high") score += 20;
  if (input.intent === "medium") score += 10;
  if (input.responded) score += 5;

  score = Math.min(100, score);
  const status: LeadStatus = score >= 75 ? "Hot" : score >= 50 ? "Warm" : "Cold";
  return { score, status };
}
