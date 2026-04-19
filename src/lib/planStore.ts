import { emptyFloorPlan, type FloorPlan } from "./types";

const PLAN_KEY = "sketch2cad:plan";

export function loadPlan(): FloorPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FloorPlan;
  } catch {
    return null;
  }
}

export function savePlan(plan: FloorPlan) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export function clearPlan() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PLAN_KEY);
}

export function demoPlan(): FloorPlan {
  const p = emptyFloorPlan();
  p.unit = "m";
  p.scale = 60;
  p.imageWidth = 900;
  p.imageHeight = 600;
  p.walls = [
    { id: "w1", startX: 100, startY: 100, endX: 700, endY: 100, thickness: 0.15 },
    { id: "w2", startX: 700, startY: 100, endX: 700, endY: 500, thickness: 0.15 },
    { id: "w3", startX: 700, startY: 500, endX: 100, endY: 500, thickness: 0.15 },
    { id: "w4", startX: 100, startY: 500, endX: 100, endY: 100, thickness: 0.15 },
    { id: "w5", startX: 400, startY: 100, endX: 400, endY: 500, thickness: 0.15 },
  ];
  p.doors = [
    { id: "d1", x: 400, y: 300, width: 60, angle: 0, swing: "right" },
  ];
  p.windows = [
    { id: "win1", x: 200, y: 100, width: 100, angle: 0 },
    { id: "win2", x: 500, y: 500, width: 120, angle: 0 },
  ];
  p.rooms = [
    {
      id: "r1",
      name: "Living",
      vertices: [
        { x: 100, y: 100 },
        { x: 400, y: 100 },
        { x: 400, y: 500 },
        { x: 100, y: 500 },
      ],
    },
    {
      id: "r2",
      name: "Bedroom",
      vertices: [
        { x: 400, y: 100 },
        { x: 700, y: 100 },
        { x: 700, y: 500 },
        { x: 400, y: 500 },
      ],
    },
  ];
  p.measurements = [
    { id: "m1", text: "5.00 m", x: 250, y: 90, value: 5, unit: "m" },
    { id: "m2", text: "4.00 m", x: 710, y: 300, value: 4, unit: "m" },
  ];
  return p;
}
