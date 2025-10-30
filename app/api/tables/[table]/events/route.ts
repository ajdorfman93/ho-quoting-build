import { NextRequest, NextResponse } from "next/server";
import { subscribeToTable } from "@/utils/realtime";

const encoder = new TextEncoder();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await context.params;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        send({ type: "connected", table, timestamp: new Date().toISOString() });

        const unsubscribe = subscribeToTable(table, (event) => {
          send(event);
        });

        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(":keep-alive\n\n"));
        }, 15000);

        const close = () => {
          clearInterval(heartbeat);
          unsubscribe();
          controller.close();
        };

        request.signal.addEventListener("abort", close, { once: true });
      },
      cancel() {
        /* handled via abort listener */
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error(`Failed to open event stream for ${params.table}`, error);
    return NextResponse.json(
      { error: "Failed to open event stream" },
      { status: 500 }
    );
  }
}
