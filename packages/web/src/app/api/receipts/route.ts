import { gatewayWriteReceipt, type ActionType, type ReceiptStatus } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const body = await req.json();
  return gatewayResponse(
    await gatewayWriteReceipt(
      network,
      {
        matchId: body.matchId,
        actorEntityId: body.actorEntityId,
        counterpartyEntityId: String(body.counterpartyEntityId ?? ""),
        actionType: String(body.actionType ?? "") as ActionType,
        status: String(body.status ?? "") as ReceiptStatus,
        outcome: body.outcome,
        task: body.task,
      },
      caller,
    ),
  );
}
