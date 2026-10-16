import type { CallSummary } from "./summary";
import type { ConversationState } from "./conversation";

export type AiResponse = {
  text: string;
  language: "Telugu" | "Tenglish" | "English";
  state?: ConversationState;
  confidence: number;
};

export type AiExtraction = {
  destination?: string;
  travelDate?: string;
  travellers?: number;
  budget?: number;
  intent?: "high" | "medium" | "low";
  objections: string[];
  confidence: number;
};

export interface AiModelProvider {
  readonly name: string;
  generateResponse(input: {
    employeePrompt: string;
    customerText: string;
    state?: ConversationState;
  }): Promise<AiResponse>;
  extractQualification(input: {
    transcript: string;
    state?: ConversationState;
  }): Promise<AiExtraction>;
  summarizeCall(input: {
    transcript: string;
    state?: ConversationState;
  }): Promise<CallSummary>;
}

export class LocalRuleBasedAiProvider implements AiModelProvider {
  readonly name = "local_rules";

  async generateResponse(input: {
    employeePrompt: string;
    customerText: string;
    state?: ConversationState;
  }): Promise<AiResponse> {
    return {
      text: input.state
        ? "Thank you. I have noted that. Let me confirm the remaining travel details with you."
        : "Namaste, this is Ananya from On A Trip Holidays. How can I help you with your travel plans?",
      language: input.state?.language ?? "English",
      confidence: 0.72,
    };
  }

  async extractQualification(input: {
    transcript: string;
    state?: ConversationState;
  }): Promise<AiExtraction> {
    return {
      destination: input.state?.destination,
      travelDate: input.state?.travelDate,
      travellers: input.state?.travellers,
      budget: input.state?.budget,
      intent: input.state?.intent === "unknown" ? undefined : input.state?.intent,
      objections: input.state?.objections ?? [],
      confidence: 0.68,
    };
  }

  async summarizeCall(input: {
    transcript: string;
    state?: ConversationState;
  }): Promise<CallSummary> {
    return {
      summary: "AI qualification completed using the configured conversation engine.",
      score: 0,
      status: "Cold",
      qualification: {
        destination: input.state?.destination,
        travelDate: input.state?.travelDate,
        travellers: input.state?.travellers,
        budget: input.state?.budget,
        intent: input.state?.intent ?? "unknown",
      },
      objections: input.state?.objections ?? [],
      nextAction: "Review lead and schedule the next sales action.",
    };
  }
}

export function getAiModelProvider(): AiModelProvider {
  return new LocalRuleBasedAiProvider();
}
