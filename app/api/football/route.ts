import { NextRequest, NextResponse } from "next/server";

const FD_BASE = "https://api.football-data.org/v4";
const AF_BASE = "https://v3.football.api-sports.io";
const GNEWS_BASE = "https://gnews.io/api/v4";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const path = searchParams.get("path") || "";
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

    } else if (type === "news") {
      // decodedPath = keyword to search
      const url = `${GNEWS_BASE}/search?q=${encodeURIComponent(decodedPath)}&lang=en&max=10&token=${process.env.GNEWS_KEY}`;
      const res = await fetch(url, { next: { revalidate: 1800 } }); // cache 30 min
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
