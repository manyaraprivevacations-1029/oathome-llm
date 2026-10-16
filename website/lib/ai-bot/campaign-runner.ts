import { campaigns } from "./campaigns";
import { getLeads } from "./store";

export type CampaignRunResult = {
  campaignId: string;
  eligibleLeadIds: string[];
  skippedLeadIds: string[];
  attemptsAllowed: number;
  status: "preview" | "blocked";
  reason?: string;
};

export function previewCampaignRun(campaignId: string): CampaignRunResult {
  const campaign = campaigns.find((item) => item.id === campaignId);
  if (!campaign) throw new Error("Campaign not found");

  const leads = getLeads();
  const eligible = leads.filter((lead) => (lead.score ?? 0) >= campaign.eligibleScore);
  const skipped = leads.filter((lead) => (lead.score ?? 0) < campaign.eligibleScore);

  if (campaign.status !== "ready" && campaign.status !== "running") {
    return {
      campaignId,
      eligibleLeadIds: [],
      skippedLeadIds: leads.map((lead) => lead.id),
      attemptsAllowed: campaign.maxAttempts,
      status: "blocked",
      reason: "Campaign must be ready or running before execution.",
    };
  }

  return {
    campaignId,
    eligibleLeadIds: eligible.map((lead) => lead.id),
    skippedLeadIds: skipped.map((lead) => lead.id),
    attemptsAllowed: campaign.maxAttempts,
    status: "preview",
  };
}
