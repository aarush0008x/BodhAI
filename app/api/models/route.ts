import { NextResponse } from "next/server";
import { AVAILABLE_MODELS } from "@/lib/config";

export async function GET() {
  return NextResponse.json({ models: AVAILABLE_MODELS });
}
