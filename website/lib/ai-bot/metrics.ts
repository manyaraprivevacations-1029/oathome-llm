import type { Lead } from "./types";

export type FunnelMetrics = {
  totalLeads: number;
  contacted: number;
  answered: number;
  qualified: number;
  hot: number;
  warm: number;
  cold: number;
  contactRate: number;
  qualificationRate: number;
  hotRate: number;
};

export function calculateFunnelMetrics(leads: Lead[]): FunnelMetrics {
  const totalLeads = leads.length;
  const contacted = leads.filter((lead) => lead.lastContactAt).length;
  const answered = leads.filter((lead) => lead.status !== "Cold").length;
  const qualified = leads.filter((lead) => (lead.score ?? 0) >= 50).length;
  const hot = leads.filter((lead) => lead.status === "Hot").length;
  const warm = leads.filter((lead) => lead.status === "Warm").length;
  const cold = leads.filter((lead) => lead.status === "Cold").length;

  const pct = (value: number, base: number) =>
    base === 0 ? 0 : Math.round((value / base) * 1000) / 10;

  return {
    totalLeads,
    contacted,
    answered,
    qualified,
    hot,
    warm,
    cold,
    contactRate: pct(contacted, totalLeads),
    qualificationRate: pct(qualified, totalLeads),
    hotRate: pct(hot, totalLeads),
  };
}
