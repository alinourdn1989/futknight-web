import { NextRequest, NextResponse } from "next/server";

const FD_BASE = "https://api.football-data.org/v4";
const AF_BASE = "https://v3.football.api-sports.io";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const path = searchParams.get("path") || "";

  // Decode the path (it may contain encoded query params like %3F and %26)
  const decodedPath = decodeURIComponent(path);

  try {
    if (type === "fd") {
      const res = await fetch(`${FD_BASE}/${decodedPath}`, {
        headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_KEY! },
        next: { revalidate: 300 },
      });
      const data = await res.json();
      return NextResponse.json(data);
    } else if (type === "af") {
      const res = await fetch(`${AF_BASE}/${decodedPath}`, {
        headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
        next: { revalidate: 300 },
      });
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
