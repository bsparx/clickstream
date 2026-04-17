import { NextResponse } from "next/server";
import { recordConversion } from "@/app/actions/conversions";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await recordConversion(body);

    if ("error" in result) {
      if (result.error === "Internal Server Error") {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Conversion API error:", message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
