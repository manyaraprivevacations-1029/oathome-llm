import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public diagnostics only. Never return gateway URLs, tokens, SIP details, or phone numbers. */
export async function GET() {
  const gatewayUrl = process.env.OATHOME_VOICE_GATEWAY_URL?.trim().replace(/\/+$/, "");
  const gatewayToken = process.env.OATHOME_VOICE_GATEWAY_TOKEN?.trim();

  if (!gatewayUrl || !gatewayToken) {
    return NextResponse.json({
      service: "OATHome Voice Gateway",
      status: "not_configured",
      configured: false,
      reachable: false,
      inboundCallsReady: false,
      outboundCallsReady: false,
      aiApisRequired: false,
      message: "Voice gateway is not connected yet. Configure a private gateway URL and access token after choosing a compliant telephony provider.",
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const response = await fetch(`${gatewayUrl}/health`, {
      method: "GET",
      headers: { Authorization: `Bearer ${gatewayToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return NextResponse.json({
        service: "OATHome Voice Gateway",
        status: "unhealthy",
        configured: true,
        reachable: false,
        inboundCallsReady: false,
        outboundCallsReady: false,
        aiApisRequired: false,
        message: "Voice gateway health check failed. Call handling is not ready.",
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({
      service: "OATHome Voice Gateway",
      status: "connected",
      configured: true,
      reachable: true,
      inboundCallsReady: false,
      outboundCallsReady: false,
      aiApisRequired: false,
      message: "Gateway is reachable. Inbound/outbound readiness remains disabled until telephony registration, call routing, consent controls, and end-to-end voice tests are verified.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      service: "OATHome Voice Gateway",
      status: "unreachable",
      configured: true,
      reachable: false,
      inboundCallsReady: false,
      outboundCallsReady: false,
      aiApisRequired: false,
      message: "Voice gateway could not be reached. Check private networking and gateway health.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}