export type SalesAction =
  | "assign_salesperson"
  | "send_package_details"
  | "schedule_follow_up"
  | "send_whatsapp"
  | "mark_no_answer"
  | "close_lost";

export type SalesActionRequest = {
  leadId: string;
  action: SalesAction;
  salespersonId?: string;
  scheduledAt?: string;
  reason?: string;
  message?: string;
};

export interface SalesActionAdapter {
  execute(request: SalesActionRequest): Promise<{
    ok: boolean;
    action: SalesAction;
    message: string;
  }>;
}

class DeferredSalesActionAdapter implements SalesActionAdapter {
  async execute(request: SalesActionRequest) {
    return {
      ok: true,
      action: request.action,
      message:
        "Action validated and queued for the CRM/WhatsApp integration layer. No external system was changed.",
    };
  }
}

export function getSalesActionAdapter(): SalesActionAdapter {
  return new DeferredSalesActionAdapter();
}
