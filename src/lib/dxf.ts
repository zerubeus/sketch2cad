import type { FloorPlan, Wall, Door, Window, Room, Measurement } from "./types";

function header(): string {
  return [
    "0",
    "SECTION",
    "2",
    "HEADER",
    "9",
    "$ACADVER",
    "1",
    "AC1021",
    "9",
    "$INSUNITS",
    "70",
    "6",
    "0",
    "ENDSEC",
  ].join("\n");
}

function tablesSection(): string {
  const layer = (name: string, color: number) =>
    [
      "0",
      "LAYER",
      "2",
      name,
      "70",
      "0",
      "62",
      color.toString(),
      "6",
      "CONTINUOUS",
    ].join("\n");

  return [
    "0",
    "SECTION",
    "2",
    "TABLES",
    "0",
    "TABLE",
    "2",
    "LAYER",
    "70",
    "5",
    layer("0", 7),
    layer("WALLS", 7),
    layer("DOORS", 3),
    layer("WINDOWS", 5),
    layer("ROOMS", 4),
    layer("DIMENSIONS", 2),
    "0",
    "ENDTAB",
    "0",
    "ENDSEC",
  ].join("\n");
}

function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  layer: string
): string {
  return [
    "0",
    "LINE",
    "8",
    layer,
    "10",
    x1.toFixed(4),
    "20",
    y1.toFixed(4),
    "30",
    "0.0",
    "11",
    x2.toFixed(4),
    "21",
    y2.toFixed(4),
    "31",
    "0.0",
  ].join("\n");
}

function arc(
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
  layer: string
): string {
  return [
    "0",
    "ARC",
    "8",
    layer,
    "10",
    cx.toFixed(4),
    "20",
    cy.toFixed(4),
    "30",
    "0.0",
    "40",
    radius.toFixed(4),
    "50",
    startDeg.toFixed(2),
    "51",
    endDeg.toFixed(2),
  ].join("\n");
}

function text(
  x: number,
  y: number,
  height: number,
  content: string,
  layer: string
): string {
  return [
    "0",
    "TEXT",
    "8",
    layer,
    "10",
    x.toFixed(4),
    "20",
    y.toFixed(4),
    "30",
    "0.0",
    "40",
    height.toFixed(4),
    "1",
    content.replace(/\n/g, " "),
  ].join("\n");
}

function polyline(points: { x: number; y: number }[], layer: string): string {
  const out: string[] = [
    "0",
    "POLYLINE",
    "8",
    layer,
    "66",
    "1",
    "70",
    "1",
  ];
  for (const p of points) {
    out.push(
      "0",
      "VERTEX",
      "8",
      layer,
      "10",
      p.x.toFixed(4),
      "20",
      p.y.toFixed(4),
      "30",
      "0.0"
    );
  }
  out.push("0", "SEQEND");
  return out.join("\n");
}

export function floorPlanToDxf(plan: FloorPlan): string {
  const entities: string[] = ["0", "SECTION", "2", "ENTITIES"];

  const flipY = plan.imageHeight || 0;
  const fy = (y: number) => flipY - y;

  for (const w of plan.walls as Wall[]) {
    entities.push(line(w.startX, fy(w.startY), w.endX, fy(w.endY), "WALLS"));
  }

  for (const d of plan.doors as Door[]) {
    const rad = (d.angle * Math.PI) / 180;
    const ex = d.x + d.width * Math.cos(rad);
    const ey = d.y + d.width * Math.sin(rad);
    entities.push(line(d.x, fy(d.y), ex, fy(ey), "DOORS"));
    const startDeg = d.angle;
    const endDeg = (d.angle + 90) % 360;
    entities.push(arc(d.x, fy(d.y), d.width, startDeg, endDeg, "DOORS"));
  }

  for (const wn of plan.windows as Window[]) {
    const rad = (wn.angle * Math.PI) / 180;
    const ex = wn.x + wn.width * Math.cos(rad);
    const ey = wn.y + wn.width * Math.sin(rad);
    const nx = -Math.sin(rad) * 4;
    const ny = Math.cos(rad) * 4;
    entities.push(line(wn.x, fy(wn.y), ex, fy(ey), "WINDOWS"));
    entities.push(
      line(wn.x + nx, fy(wn.y + ny), ex + nx, fy(ey + ny), "WINDOWS")
    );
  }

  for (const r of plan.rooms as Room[]) {
    if (r.vertices.length >= 3) {
      entities.push(
        polyline(
          r.vertices.map((v) => ({ x: v.x, y: fy(v.y) })),
          "ROOMS"
        )
      );
      const cx =
        r.vertices.reduce((a, v) => a + v.x, 0) / r.vertices.length;
      const cy =
        r.vertices.reduce((a, v) => a + v.y, 0) / r.vertices.length;
      entities.push(text(cx, fy(cy), 12, r.name || "Room", "ROOMS"));
    }
  }

  for (const m of plan.measurements as Measurement[]) {
    entities.push(text(m.x, fy(m.y), 10, m.text || `${m.value} ${m.unit}`, "DIMENSIONS"));
  }

  entities.push("0", "ENDSEC", "0", "EOF");

  return [header(), tablesSection(), entities.join("\n")].join("\n");
}

export function downloadDxf(plan: FloorPlan, filename = "floorplan.dxf") {
  const dxf = floorPlanToDxf(plan);
  const blob = new Blob([dxf], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
