export type CampaignStatus = "draft" | "ready" | "running" | "paused" | "completed";

export type AiCampaign = {
  id: string;
  name: string;
  description: string;
  employeeId: string;
  status: CampaignStatus;
  maxAttempts: number;
  eligibleScore: number;
  scheduledAt?: string;
};

export const campaigns: AiCampaign[] = [
  {
    id: "campaign-pilgrimage-high-intent",
    name: "High Intent Pilgrimage Leads",
    description: "Telugu leads interested in pilgrimage destinations.",
    employeeId: "ananya",
    status: "ready",
    maxAttempts: 3,
    eligibleScore: 70,
  },
  {
    id: "campaign-october-holidays",
    name: "October Holiday Sales",
    description: "Manali, Kashmir, Thailand and Kerala follow-up campaign.",
    employeeId: "ananya",
    status: "draft",
    maxAttempts: 3,
    eligibleScore: 40,
  },
];
