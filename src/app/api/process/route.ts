import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { emptyFloorPlan, type FloorPlan } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a precise computer-vision system that digitizes hand-drawn architectural floor plans.

INPUT
- A single photograph of a hand-drawn floor plan. The sketch may be rough, on graph paper or plain paper, with handwritten numeric dimensions (e.g. "3.20 m", "4'6\\"", "250").

OUTPUT
- Return ONLY a single JSON object, no markdown fences, no commentary.
- The JSON must strictly follow this schema:

{
  "unit": "mm" | "cm" | "m" | "ft" | "in",
  "scale": number,                       // pixels-per-unit in the ORIGINAL image
  "imageWidth": number,                  // image width in pixels
  "imageHeight": number,                 // image height in pixels
  "walls": [
    { "id": string, "startX": number, "startY": number, "endX": number, "endY": number, "thickness": number }
  ],
  "doors": [
    { "id": string, "x": number, "y": number, "width": number, "angle": number, "swing": "left" | "right" }
  ],
  "windows": [
    { "id": string, "x": number, "y": number, "width": number, "angle": number }
  ],
  "rooms": [
    { "id": string, "name": string, "vertices": [{ "x": number, "y": number }] }
  ],
  "measurements": [
    { "id": string, "text": string, "x": number, "y": number, "value": number, "unit": "mm" | "cm" | "m" | "ft" | "in" }
  ],
  "notes": string
}

RULES
1. Coordinates are in ORIGINAL image pixel space, with origin (0,0) at the top-left.
2. Detect every visible wall as a straight line segment. If walls are drawn as thick strokes, return the centerline. Set "thickness" in the same unit as the plan (typical 100–250 mm, 10–25 cm, 0.1–0.25 m).
3. Detect doors where an arc, diagonal swing or a gap in the wall is visible. "x","y" is the hinge point, "width" is the leaf length, "angle" is the wall angle in degrees (0 = horizontal, 90 = vertical).
4. Detect windows as double/parallel lines within a wall gap. "x","y" is the start point, "angle" is the wall angle.
5. Identify enclosed rooms from wall loops. Give each room a reasonable label from any text in the image (bedroom, living, kitchen, bathroom, etc.). If no label is visible, use "Room 1", "Room 2", etc. Vertices are ordered going around the polygon.
6. For every handwritten dimension, add a "measurements" entry with the raw OCR text, pixel position, parsed numeric value and detected unit. If mixed units appear, normalize all measurements to the most common unit and set "unit" on the root object to that unit.
7. "scale" = pixels per one unit. Derive it from the longest handwritten dimension and the pixel length of the line it annotates.
8. Generate stable short ids like "w1","w2","d1","win1","r1","m1".
9. If the image is not a floor plan, return an object with empty arrays and notes explaining what you saw.

Be conservative: only include elements you are reasonably confident about. Do not invent geometry. Return STRICT JSON.`;

const USER_PROMPT = `Analyse the attached hand-drawn floor plan photograph. Extract all walls, doors, windows, rooms and handwritten dimensions. Resolve the drawing scale from the dimensions. Respond with the JSON object only, exactly matching the schema above.`;

function stripFences(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
  }
  return trimmed;
}

function coerce(raw: unknown): FloorPlan {
  const base = emptyFloorPlan();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, fallback = 0) =>
    typeof v === "number" && isFinite(v) ? v : fallback;
  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v : fallback;
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  const allowedUnits = ["mm", "cm", "m", "ft", "in"] as const;
  const rawUnit = str(r.unit, "m");
  const unit = (allowedUnits as readonly string[]).includes(rawUnit)
    ? (rawUnit as FloorPlan["unit"])
    : "m";

  let idCounter = 0;
  const uid = (prefix: string) => `${prefix}${++idCounter}`;

  const walls = arr<Record<string, unknown>>(r.walls).map((w) => ({
    id: str(w.id, uid("w")),
    startX: num(w.startX),
    startY: num(w.startY),
    endX: num(w.endX),
    endY: num(w.endY),
    thickness: num(w.thickness, unit === "m" ? 0.15 : unit === "cm" ? 15 : 150),
  }));

  idCounter = 0;
  const doors = arr<Record<string, unknown>>(r.doors).map((d) => ({
    id: str(d.id, uid("d")),
    x: num(d.x),
    y: num(d.y),
    width: num(d.width, unit === "m" ? 0.9 : unit === "cm" ? 90 : 900),
    angle: num(d.angle),
    swing: (d.swing === "left" ? "left" : "right") as "left" | "right",
  }));

  idCounter = 0;
  const windows = arr<Record<string, unknown>>(r.windows).map((w) => ({
    id: str(w.id, uid("win")),
    x: num(w.x),
    y: num(w.y),
    width: num(w.width, unit === "m" ? 1.2 : unit === "cm" ? 120 : 1200),
    angle: num(w.angle),
  }));

  idCounter = 0;
  const rooms = arr<Record<string, unknown>>(r.rooms).map((rm) => ({
    id: str(rm.id, uid("r")),
    name: str(rm.name, `Room ${idCounter}`),
    vertices: arr<Record<string, unknown>>(rm.vertices).map((v) => ({
      x: num(v.x),
      y: num(v.y),
    })),
  }));

  idCounter = 0;
  const measurements = arr<Record<string, unknown>>(r.measurements).map((m) => {
    const mUnit = str(m.unit, unit);
    return {
      id: str(m.id, uid("m")),
      text: str(m.text),
      x: num(m.x),
      y: num(m.y),
      value: num(m.value),
      unit: ((allowedUnits as readonly string[]).includes(mUnit)
        ? mUnit
        : unit) as FloorPlan["unit"],
    };
  });

  return {
    unit,
    scale: num(r.scale, 100),
    imageWidth: num(r.imageWidth, 1200),
    imageHeight: num(r.imageHeight, 800),
    walls,
    doors,
    windows,
    rooms,
    measurements,
    notes: str(r.notes, ""),
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const image: string | undefined = body?.image;
    const mimeType: string = body?.mimeType || "image/jpeg";
    if (!image) {
      return NextResponse.json(
        { error: "Missing 'image' base64 payload" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent([
      { text: USER_PROMPT },
      { inlineData: { mimeType, data: image } },
    ]);

    const text = result.response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripFences(text));
    } catch {
      return NextResponse.json(
        { error: "Gemini returned non-JSON response", raw: text },
        { status: 502 }
      );
    }

    const plan = coerce(parsed);
    return NextResponse.json({ plan });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
