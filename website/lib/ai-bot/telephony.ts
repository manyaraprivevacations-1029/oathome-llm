import type { CallRequest, CallSession } from "./types";

export type TelephonyConfig = {
  provider: string;
  fromNumber?: string;
  webhookBaseUrl?: string;
};

export interface TelephonyProvider {
  readonly name: string;
  createOutboundCall(request: CallRequest, config: TelephonyConfig): Promise<CallSession>;
  validateWebhook?(request: Request): Promise<boolean>;
}

class UnconfiguredTelephonyProvider implements TelephonyProvider {
  readonly name = "not_configured";

  async createOutboundCall(request: CallRequest): Promise<CallSession> {
    throw new Error(
      `Telephony provider is not configured. Lead ${request.leadId} is ready for calling.`,
    );
  }
}

class VapiTelephonyProvider implements TelephonyProvider {
  readonly name = "vapi";

  async createOutboundCall(
    request: CallRequest,
    config: TelephonyConfig,
  ): Promise<CallSession> {
    const apiKey = process.env.VAPI_PRIVATE_API_KEY;
    const assistantId = process.env.VAPI_ASSISTANT_ID;
    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

    if (!apiKey) throw new Error("VAPI_PRIVATE_API_KEY is not configured.");
    if (!assistantId) throw new Error("VAPI_ASSISTANT_ID is not configured.");
    if (!phoneNumberId) throw new Error("VAPI_PHONE_NUMBER_ID is not configured.");

    const response = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId,
        phoneNumberId,
        customer: {
          number: request.phone,
        },
        assistantOverrides: {
          variableValues: {
            leadId: request.leadId,
            employeeId: request.employeeId,
            phone: request.phone,
            purpose: request.purpose ?? "qualification",
          },
        },
      }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        typeof payload?.message === "string"
          ? payload.message
          : typeof payload?.error === "string"
            ? payload.error
            : `Vapi returned HTTP ${response.status}`;
      throw new Error(message);
    }

    const providerCallId = String(payload?.id ?? "");
    if (!providerCallId) {
      throw new Error("Vapi created a call without returning a call ID.");
    }

    return {
      id: crypto.randomUUID(),
      leadId: request.leadId,
      employeeId: request.employeeId,
      status: "queued",
      provider: "vapi",
      providerCallId,
    };
  }
}

export function getTelephonyProvider(): TelephonyProvider {
  const provider = (process.env.VOICE_PROVIDER ?? "").trim().toLowerCase();

  if (provider === "vapi") return new VapiTelephonyProvider();

  return new UnconfiguredTelephonyProvider();
}
