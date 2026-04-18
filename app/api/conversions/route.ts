import { NextResponse } from "next/server";
import { recordConversion } from "@/app/actions/conversions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await recordConversion(body);

    if ("error" in result) {
      if (result.error === "Internal Server Error") {
        return NextResponse.json(
          { error: result.error },
          { status: 500, headers: CORS_HEADERS }
        );
      }
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(result, {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Conversion API error:", message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
