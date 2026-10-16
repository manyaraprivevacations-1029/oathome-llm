import type { CallStatus } from "./types";

export type NormalizedCallEvent = {
  provider: string;
  providerCallId: string;
  status: CallStatus;
  direction: "inbound" | "outbound";
  from?: string;
  to?: string;
  timestamp: string;
  durationSeconds?: number;
  recordingUrl?: string;
  transcriptUrl?: string;
  raw?: unknown;
};

export function normalizeCallStatus(value: string): CallStatus {
  switch (value.toLowerCase()) {
    case "queued":
    case "scheduled":
      return "queued";
    case "ringing":
    case "initiated":
      return "ringing";
    case "in-progress":
    case "in_progress":
    case "answered":
      return "in_progress";
    case "completed":
    case "ended":
      return "completed";
    case "busy":
    case "no-answer":
    case "no_answer":
      return "no_answer";
    case "failed":
    case "canceled":
    case "cancelled":
      return "failed";
    default:
      return "failed";
  }
}
