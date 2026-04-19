export type Unit = "mm" | "cm" | "m" | "ft" | "in";

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
}

export interface Door {
  id: string;
  x: number;
  y: number;
  width: number;
  angle: number;
  swing?: "left" | "right";
}

export interface Window {
  id: string;
  x: number;
  y: number;
  width: number;
  angle: number;
}

export interface Room {
  id: string;
  name: string;
  vertices: Point[];
}

export interface Measurement {
  id: string;
  text: string;
  x: number;
  y: number;
  value: number;
  unit: Unit;
}

export interface FloorPlan {
  unit: Unit;
  scale: number;
  imageWidth: number;
  imageHeight: number;
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  rooms: Room[];
  measurements: Measurement[];
  notes?: string;
}

export const emptyFloorPlan = (): FloorPlan => ({
  unit: "m",
  scale: 1,
  imageWidth: 1200,
  imageHeight: 800,
  walls: [],
  doors: [],
  windows: [],
  rooms: [],
  measurements: [],
});
