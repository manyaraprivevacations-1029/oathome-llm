import type { CallRequest, CallSession } from "./types";

export interface VoiceProvider {
  readonly name: string;
  placeCall(request: CallRequest): Promise<CallSession>;
  endCall?(providerCallId: string): Promise<void>;
}

class NotConfiguredVoiceProvider implements VoiceProvider {
  readonly name = "not_configured";

  async placeCall(request: CallRequest): Promise<CallSession> {
    throw new Error(
      `Voice provider is not configured. Lead ${request.leadId} is ready, but no live call was placed.`,
    );
  }
}

export function getVoiceProvider(): VoiceProvider {
  // Production provider adapters will be selected by VOICE_PROVIDER.
  // Example: "twilio", "exotel", or another supported telephony provider.
  return new NotConfiguredVoiceProvider();
}
