export type LeadStatus = "Hot" | "Warm" | "Cold";
export type CallStatus = "queued" | "ringing" | "in_progress" | "completed" | "failed" | "no_answer";

export type CallAttempt = {
  attemptNumber: number;
  status: CallStatus;
  startedAt?: string;
  endedAt?: string;
  providerCallId?: string;
};

export type AiEmployee = {
  id: string;
  name: string;
  role: string;
  languages: string[];
  voice?: string;
  active: boolean;
  systemPrompt: string;
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  destination?: string;
  travelDate?: string;
  travellers?: number;
  language?: string;
  score?: number;
  status?: LeadStatus;
  source?: string;
  lastContactAt?: string;
};

export type CallRequest = {
  leadId: string;
  employeeId: string;
  phone: string;
  purpose?: "qualification" | "follow_up" | "support";
  context?: Record<string, unknown>;
};

export type CallSession = {
  id: string;
  leadId: string;
  employeeId: string;
  status: CallStatus;
  provider: string;
  providerCallId?: string;
  startedAt?: string;
  endedAt?: string;
};
