import type { CallSession, Lead } from "./types";

const demoLeads: Lead[] = [
  { id: "lead-ravi", name: "Ravi Kumar", phone: "+9198XXXXXX21", destination: "Char Dham Yatra", language: "Telugu", score: 92, status: "Hot", source: "demo" },
  { id: "lead-sravani", name: "Sravani", phone: "+9193XXXXXX44", destination: "Manali & Kasol", language: "Tenglish", score: 78, status: "Hot", source: "demo" },
  { id: "lead-venkatesh", name: "Venkatesh", phone: "+9190XXXXXX18", destination: "Kashmir", language: "English", score: 64, status: "Warm", source: "demo" },
  { id: "lead-anusha", name: "Anusha", phone: "+9188XXXXXX62", destination: "Thailand", language: "Telugu", score: 41, status: "Cold", source: "demo" },
];

const sessions: CallSession[] = [];

export function listLeads(): Lead[] {
  return demoLeads;
}

export function getLeads(): Lead[] {
  return listLeads();
}

export function getLead(id: string) {
  return demoLeads.find((lead) => lead.id === id);
}

export function addCallSession(session: CallSession) {
  sessions.push(session);
  return session;
}

export function listCallSessions(): CallSession[] {
  return [...sessions].reverse();
}

export function getCallSessions(): CallSession[] {
  return listCallSessions();
}
