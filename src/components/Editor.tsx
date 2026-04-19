"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as fabric from "fabric";
import {
  Minus,
  DoorOpen,
  RectangleHorizontal,
  Type,
  Trash2,
  Undo2,
  Redo2,
  FileImage,
  FileText,
  FileCode2,
  MousePointer2,
  Home,
  Info,
  RotateCw,
} from "lucide-react";
import type {
  FloorPlan,
  Wall,
  Door,
  Window as WinEl,
  Room,
  Measurement,
} from "@/lib/types";
import { emptyFloorPlan } from "@/lib/types";
import { savePlan, loadPlan, demoPlan } from "@/lib/planStore";
import { downloadDxf } from "@/lib/dxf";
import jsPDF from "jspdf";

type ElementKind = "wall" | "door" | "window" | "room" | "measurement";

type Tool = "select" | "wall" | "door" | "window" | "measurement";

const WALL_COLOR = "#f5f5f5";
const DOOR_COLOR = "#4ade80";
const WINDOW_COLOR = "#60a5fa";
const ROOM_LABEL_COLOR = "#d4a843";
const MEASUREMENT_COLOR = "#d4a843";
const SELECTED_COLOR = "#d4a843";

const MAX_HISTORY = 40;

export default function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const suspendSync = useRef(false);

  const [plan, setPlan] = useState<FloorPlan>(emptyFloorPlan());
  const [tool, setTool] = useState<Tool>("select");
  const [selectedKind, setSelectedKind] = useState<ElementKind | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  const [historyLen, setHistoryLen] = useState(0);
  const [futureLen, setFutureLen] = useState(0);
  const historyRef = useRef<FloorPlan[]>([]);
  const futureRef = useRef<FloorPlan[]>([]);

  const pushHistory = useCallback((prev: FloorPlan) => {
    historyRef.current.push(JSON.parse(JSON.stringify(prev)));
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    futureRef.current = [];
    setHistoryLen(historyRef.current.length);
    setFutureLen(0);
  }, []);

  const updatePlan = useCallback(
    (mutator: (p: FloorPlan) => FloorPlan, recordHistory = true) => {
      setPlan((prev) => {
        if (recordHistory) pushHistory(prev);
        const next = mutator(prev);
        savePlan(next);
        return next;
      });
    },
    [pushHistory]
  );

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setPlan((cur) => {
      futureRef.current.push(JSON.parse(JSON.stringify(cur)));
      savePlan(prev);
      return prev;
    });
    setHistoryLen(historyRef.current.length);
    setFutureLen(futureRef.current.length);
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    setPlan((cur) => {
      historyRef.current.push(JSON.parse(JSON.stringify(cur)));
      savePlan(next);
      return next;
    });
    setHistoryLen(historyRef.current.length);
    setFutureLen(futureRef.current.length);
  }, []);

  useEffect(() => {
    const existing = loadPlan();
    /* eslint-disable react-hooks/set-state-in-effect */
    setPlan(existing ?? demoPlan());
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!loaded || !canvasRef.current) return;

    const container = containerRef.current;
    const width = container?.clientWidth ?? 1000;
    const height = container?.clientHeight ?? 700;

    const c = new fabric.Canvas(canvasRef.current, {
      backgroundColor: "#0a0a0a",
      selection: true,
      width,
      height,
      preserveObjectStacking: true,
    });
    fabricRef.current = c;

    const onResize = () => {
      if (!containerRef.current || !fabricRef.current) return;
      fabricRef.current.setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      fabricRef.current.requestRenderAll();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      c.dispose();
      fabricRef.current = null;
    };
  }, [loaded]);

  const render = useCallback(() => {
    const c = fabricRef.current;
    if (!c) return;
    suspendSync.current = true;
    c.clear();
    c.backgroundColor = "#0a0a0a";

    const gridSize = 40;
    const w = c.getWidth();
    const h = c.getHeight();
    const grid: fabric.Line[] = [];
    for (let x = 0; x <= w; x += gridSize) {
      grid.push(
        new fabric.Line([x, 0, x, h], {
          stroke: "#1a1a1a",
          selectable: false,
          evented: false,
          strokeWidth: 1,
          excludeFromExport: true,
        })
      );
    }
    for (let y = 0; y <= h; y += gridSize) {
      grid.push(
        new fabric.Line([0, y, w, y], {
          stroke: "#1a1a1a",
          selectable: false,
          evented: false,
          strokeWidth: 1,
          excludeFromExport: true,
        })
      );
    }
    grid.forEach((g) => c.add(g));

    for (const r of plan.rooms) {
      if (r.vertices.length < 3) continue;
      const poly = new fabric.Polygon(
        r.vertices.map((v) => ({ x: v.x, y: v.y })),
        {
          fill: "rgba(212,168,67,0.05)",
          stroke: "transparent",
          selectable: false,
          evented: false,
        }
      );
      c.add(poly);
      const cx = r.vertices.reduce((a, v) => a + v.x, 0) / r.vertices.length;
      const cy = r.vertices.reduce((a, v) => a + v.y, 0) / r.vertices.length;
      const label = new fabric.Textbox(r.name || "Room", {
        left: cx,
        top: cy,
        fontSize: 14,
        fontFamily: "Inter, sans-serif",
        fill: ROOM_LABEL_COLOR,
        originX: "center",
        originY: "center",
        width: 140,
        textAlign: "center",
        editable: true,
      });
      label.set({ data: { kind: "room", id: r.id } });
      c.add(label);
    }

    for (const w of plan.walls) {
      const ln = new fabric.Line([w.startX, w.startY, w.endX, w.endY], {
        stroke: WALL_COLOR,
        strokeWidth: 4,
        strokeLineCap: "square",
        selectable: true,
        hasControls: true,
        perPixelTargetFind: true,
      });
      ln.set({ data: { kind: "wall", id: w.id } });
      c.add(ln);
    }

    for (const d of plan.doors) {
      const rad = (d.angle * Math.PI) / 180;
      const ex = d.x + d.width * Math.cos(rad);
      const ey = d.y + d.width * Math.sin(rad);
      const group = new fabric.Group(
        [
          new fabric.Line([d.x, d.y, ex, ey], {
            stroke: DOOR_COLOR,
            strokeWidth: 2,
          }),
          new fabric.Circle({
            left: d.x,
            top: d.y,
            radius: d.width,
            stroke: DOOR_COLOR,
            strokeWidth: 1,
            fill: "transparent",
            startAngle: d.angle,
            endAngle: d.angle + 90,
            originX: "center",
            originY: "center",
          }),
        ],
        {
          selectable: true,
          subTargetCheck: false,
        }
      );
      group.set({ data: { kind: "door", id: d.id } });
      c.add(group);
    }

    for (const wn of plan.windows) {
      const rad = (wn.angle * Math.PI) / 180;
      const ex = wn.x + wn.width * Math.cos(rad);
      const ey = wn.y + wn.width * Math.sin(rad);
      const nx = -Math.sin(rad) * 4;
      const ny = Math.cos(rad) * 4;
      const group = new fabric.Group(
        [
          new fabric.Line([wn.x - nx, wn.y - ny, ex - nx, ey - ny], {
            stroke: WINDOW_COLOR,
            strokeWidth: 2,
          }),
          new fabric.Line([wn.x + nx, wn.y + ny, ex + nx, ey + ny], {
            stroke: WINDOW_COLOR,
            strokeWidth: 2,
          }),
        ],
        { selectable: true }
      );
      group.set({ data: { kind: "window", id: wn.id } });
      c.add(group);
    }

    for (const m of plan.measurements) {
      const tb = new fabric.Textbox(m.text || `${m.value} ${m.unit}`, {
        left: m.x,
        top: m.y,
        fontSize: 12,
        fontFamily: "Inter, sans-serif",
        fill: MEASUREMENT_COLOR,
        backgroundColor: "rgba(10,10,10,0.6)",
        padding: 2,
        width: 110,
        editable: true,
      });
      tb.set({ data: { kind: "measurement", id: m.id } });
      c.add(tb);
    }

    c.requestRenderAll();
    suspendSync.current = false;
  }, [plan]);

  useEffect(() => {
    if (loaded) render();
  }, [render, loaded]);

  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;

    const syncElement = (obj: fabric.Object) => {
      const data = (obj as unknown as { data?: { kind: ElementKind; id: string } })
        .data;
      if (!data) return;
      const { kind, id } = data;

      if (kind === "wall" && obj instanceof fabric.Line) {
        const pts = obj.calcTransformMatrix();
        const x1 = obj.x1 ?? 0;
        const y1 = obj.y1 ?? 0;
        const x2 = obj.x2 ?? 0;
        const y2 = obj.y2 ?? 0;
        const tx =
          (obj.left ?? 0) - (obj.strokeUniform ? 0 : 0);
        const ty = obj.top ?? 0;
        void pts;
        void tx;
        void ty;
        const matrix = obj.calcOwnMatrix();
        const transform = (x: number, y: number) => {
          const nx =
            matrix[0] * x + matrix[2] * y + matrix[4];
          const ny =
            matrix[1] * x + matrix[3] * y + matrix[5];
          return { x: nx, y: ny };
        };
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const p1 = transform(x1 - midX, y1 - midY);
        const p2 = transform(x2 - midX, y2 - midY);
        updatePlan(
          (p) => ({
            ...p,
            walls: p.walls.map((w) =>
              w.id === id
                ? { ...w, startX: p1.x, startY: p1.y, endX: p2.x, endY: p2.y }
                : w
            ),
          }),
          false
        );
      } else if (kind === "door") {
        const left = obj.left ?? 0;
        const top = obj.top ?? 0;
        const angle = obj.angle ?? 0;
        updatePlan(
          (p) => ({
            ...p,
            doors: p.doors.map((d) =>
              d.id === id ? { ...d, x: left, y: top, angle } : d
            ),
          }),
          false
        );
      } else if (kind === "window") {
        const left = obj.left ?? 0;
        const top = obj.top ?? 0;
        const angle = obj.angle ?? 0;
        updatePlan(
          (p) => ({
            ...p,
            windows: p.windows.map((w) =>
              w.id === id ? { ...w, x: left, y: top, angle } : w
            ),
          }),
          false
        );
      } else if (kind === "room" && obj instanceof fabric.Textbox) {
        const txt = obj.text ?? "";
        updatePlan(
          (p) => ({
            ...p,
            rooms: p.rooms.map((r) =>
              r.id === id ? { ...r, name: txt } : r
            ),
          }),
          false
        );
      } else if (kind === "measurement" && obj instanceof fabric.Textbox) {
        const txt = obj.text ?? "";
        const parsed = parseFloat(txt.replace(/[^0-9.]/g, ""));
        updatePlan(
          (p) => ({
            ...p,
            measurements: p.measurements.map((m) =>
              m.id === id
                ? {
                    ...m,
                    text: txt,
                    value: isFinite(parsed) ? parsed : m.value,
                    x: obj.left ?? m.x,
                    y: obj.top ?? m.y,
                  }
                : m
            ),
          }),
          false
        );
      }
    };

    const onSelect = (e: { selected?: fabric.Object[] }) => {
      const sel = e.selected?.[0];
      const data = (sel as unknown as { data?: { kind: ElementKind; id: string } })
        ?.data;
      if (data) {
        setSelectedKind(data.kind);
        setSelectedId(data.id);
      } else {
        setSelectedKind(null);
        setSelectedId(null);
      }
    };

    const onClear = () => {
      setSelectedKind(null);
      setSelectedId(null);
    };

    const onModified = (e: { target?: fabric.Object }) => {
      if (suspendSync.current) return;
      if (e.target) {
        pushHistory(plan);
        syncElement(e.target);
      }
    };

    const onTextChanged = (e: { target?: fabric.Object }) => {
      if (suspendSync.current) return;
      if (e.target) syncElement(e.target);
    };

    c.on("selection:created", onSelect);
    c.on("selection:updated", onSelect);
    c.on("selection:cleared", onClear);
    c.on("object:modified", onModified);
    c.on("text:changed", onTextChanged);

    return () => {
      c.off("selection:created", onSelect);
      c.off("selection:updated", onSelect);
      c.off("selection:cleared", onClear);
      c.off("object:modified", onModified);
      c.off("text:changed", onTextChanged);
    };
  }, [plan, updatePlan, pushHistory]);

  const drawingRef = useRef<{
    startX: number;
    startY: number;
    preview: fabric.Line | null;
  } | null>(null);

  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;

    const setSelectability = (enabled: boolean) => {
      c.selection = enabled;
      c.forEachObject((o) => {
        const d = (o as unknown as { data?: { kind: ElementKind } }).data;
        if (d) o.selectable = enabled;
      });
    };

    if (tool === "select") {
      setSelectability(true);
      c.defaultCursor = "default";
      return;
    }

    setSelectability(false);
    c.discardActiveObject();
    c.defaultCursor = "crosshair";

    const onDown = (opt: { e: Event; scenePoint?: fabric.Point }) => {
      const pt =
        opt.scenePoint ?? c.getScenePoint(opt.e as unknown as MouseEvent);
      if (tool === "wall") {
        const preview = new fabric.Line([pt.x, pt.y, pt.x, pt.y], {
          stroke: SELECTED_COLOR,
          strokeWidth: 3,
          strokeDashArray: [6, 4],
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        c.add(preview);
        drawingRef.current = {
          startX: pt.x,
          startY: pt.y,
          preview,
        };
      } else if (tool === "door") {
        const id = `d${Date.now()}`;
        updatePlan((p) => ({
          ...p,
          doors: [
            ...p.doors,
            { id, x: pt.x, y: pt.y, width: 40, angle: 0, swing: "right" },
          ],
        }));
        setTool("select");
      } else if (tool === "window") {
        const id = `win${Date.now()}`;
        updatePlan((p) => ({
          ...p,
          windows: [
            ...p.windows,
            { id, x: pt.x, y: pt.y, width: 80, angle: 0 },
          ],
        }));
        setTool("select");
      } else if (tool === "measurement") {
        const id = `m${Date.now()}`;
        updatePlan((p) => ({
          ...p,
          measurements: [
            ...p.measurements,
            {
              id,
              text: "0.00 m",
              x: pt.x,
              y: pt.y,
              value: 0,
              unit: p.unit,
            },
          ],
        }));
        setTool("select");
      }
    };

    const onMove = (opt: { e: Event; scenePoint?: fabric.Point }) => {
      if (tool !== "wall" || !drawingRef.current) return;
      const pt =
        opt.scenePoint ?? c.getScenePoint(opt.e as unknown as MouseEvent);
      drawingRef.current.preview?.set({ x2: pt.x, y2: pt.y });
      c.requestRenderAll();
    };

    const onUp = (opt: { e: Event; scenePoint?: fabric.Point }) => {
      if (tool !== "wall" || !drawingRef.current) return;
      const pt =
        opt.scenePoint ?? c.getScenePoint(opt.e as unknown as MouseEvent);
      const { startX, startY, preview } = drawingRef.current;
      if (preview) c.remove(preview);
      drawingRef.current = null;
      const dx = pt.x - startX;
      const dy = pt.y - startY;
      if (Math.hypot(dx, dy) < 6) return;
      const id = `w${Date.now()}`;
      updatePlan((p) => ({
        ...p,
        walls: [
          ...p.walls,
          {
            id,
            startX,
            startY,
            endX: pt.x,
            endY: pt.y,
            thickness: p.unit === "m" ? 0.15 : 15,
          },
        ],
      }));
      setTool("select");
    };

    c.on("mouse:down", onDown);
    c.on("mouse:move", onMove);
    c.on("mouse:up", onUp);

    return () => {
      c.off("mouse:down", onDown);
      c.off("mouse:move", onMove);
      c.off("mouse:up", onUp);
    };
  }, [tool, updatePlan]);

  const deleteSelected = useCallback(() => {
    if (!selectedKind || !selectedId) return;
    updatePlan((p) => {
      switch (selectedKind) {
        case "wall":
          return { ...p, walls: p.walls.filter((w) => w.id !== selectedId) };
        case "door":
          return { ...p, doors: p.doors.filter((d) => d.id !== selectedId) };
        case "window":
          return {
            ...p,
            windows: p.windows.filter((w) => w.id !== selectedId),
          };
        case "room":
          return { ...p, rooms: p.rooms.filter((r) => r.id !== selectedId) };
        case "measurement":
          return {
            ...p,
            measurements: p.measurements.filter((m) => m.id !== selectedId),
          };
      }
    });
    setSelectedId(null);
    setSelectedKind(null);
  }, [selectedId, selectedKind, updatePlan]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (fabricRef.current?.getActiveObject() as unknown as { isEditing?: boolean })
          ?.isEditing
      ) {
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteSelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      } else if (e.key === "v") setTool("select");
      else if (e.key === "w") setTool("wall");
      else if (e.key === "d") setTool("door");
      else if (e.key === "n") setTool("window");
      else if (e.key === "m") setTool("measurement");
      else if (e.key === "Escape") setTool("select");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, selectedId, undo, redo]);

  const exportPng = () => {
    const c = fabricRef.current;
    if (!c) return;
    const dataURL = c.toDataURL({ format: "png", multiplier: 2 });
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = "floorplan.png";
    a.click();
  };

  const exportPdf = () => {
    const c = fabricRef.current;
    if (!c) return;
    const dataURL = c.toDataURL({ format: "png", multiplier: 2 });
    const w = c.getWidth();
    const h = c.getHeight();
    const pdf = new jsPDF({
      orientation: w > h ? "landscape" : "portrait",
      unit: "px",
      format: [w, h],
    });
    pdf.addImage(dataURL, "PNG", 0, 0, w, h);
    pdf.save("floorplan.pdf");
  };

  const exportDxfFile = () => {
    downloadDxf(plan);
  };

  const rotateSelected = () => {
    const c = fabricRef.current;
    if (!c) return;
    const active = c.getActiveObject();
    if (!active) return;
    active.rotate(((active.angle ?? 0) + 15) % 360);
    active.setCoords();
    pushHistory(plan);
    c.requestRenderAll();
  };

  const selectedEl = useMemo(() => {
    if (!selectedKind || !selectedId) return null;
    const collection = {
      wall: plan.walls as Wall[],
      door: plan.doors as Door[],
      window: plan.windows as WinEl[],
      room: plan.rooms as Room[],
      measurement: plan.measurements as Measurement[],
    }[selectedKind];
    return collection.find((e) => e.id === selectedId) ?? null;
  }, [selectedKind, selectedId, plan]);

  const tools: { tool: Tool; label: string; Icon: typeof MousePointer2; hint: string }[] =
    [
      { tool: "select", label: "Select", Icon: MousePointer2, hint: "V" },
      { tool: "wall", label: "Wall", Icon: Minus, hint: "W" },
      { tool: "door", label: "Door", Icon: DoorOpen, hint: "D" },
      { tool: "window", label: "Window", Icon: RectangleHorizontal, hint: "N" },
      { tool: "measurement", label: "Dimension", Icon: Type, hint: "M" },
    ];

  const counts = {
    walls: plan.walls.length,
    doors: plan.doors.length,
    windows: plan.windows.length,
    rooms: plan.rooms.length,
    dims: plan.measurements.length,
  };

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-4rem)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface-2)]">
        <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
          <div className="flex items-center gap-1 pr-3 border-r border-[var(--border)]">
            {tools.map(({ tool: t, label, Icon, hint }) => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                  tool === t
                    ? "bg-[var(--accent)] text-black"
                    : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
                }`}
                title={`${label} (${hint})`}
              >
                <Icon size={15} />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 px-3 border-r border-[var(--border)]">
            <button
              onClick={undo}
              disabled={historyLen === 0}
              className="p-2 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (⌘Z)"
            >
              <Undo2 size={15} />
            </button>
            <button
              onClick={redo}
              disabled={futureLen === 0}
              className="p-2 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (⌘⇧Z)"
            >
              <Redo2 size={15} />
            </button>
            <button
              onClick={rotateSelected}
              disabled={!selectedId}
              className="p-2 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Rotate selected 15°"
            >
              <RotateCw size={15} />
            </button>
            <button
              onClick={deleteSelected}
              disabled={!selectedId}
              className="p-2 rounded text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Delete (Del)"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="flex items-center gap-1 pl-2 ml-auto">
            <span className="text-xs text-[var(--muted)] hidden md:block mr-2">
              Export
            </span>
            <button
              onClick={exportDxfFile}
              className="btn-accent flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium"
              title="Download DXF"
            >
              <FileCode2 size={15} />
              <span className="hidden sm:inline">DXF</span>
            </button>
            <button
              onClick={exportPng}
              className="btn-outline flex items-center gap-2 px-3 py-1.5 rounded text-sm"
              title="Download PNG"
            >
              <FileImage size={15} />
              <span className="hidden sm:inline">PNG</span>
            </button>
            <button
              onClick={exportPdf}
              className="btn-outline flex items-center gap-2 px-3 py-1.5 rounded text-sm"
              title="Download PDF"
            >
              <FileText size={15} />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface-2)] p-4 overflow-y-auto hidden md:block">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--muted)] mb-3">
            <Home size={13} /> Plan
          </div>
          <div className="space-y-1.5 text-sm">
            <Row label="Unit" value={plan.unit} />
            <Row label="Walls" value={String(counts.walls)} />
            <Row label="Doors" value={String(counts.doors)} />
            <Row label="Windows" value={String(counts.windows)} />
            <Row label="Rooms" value={String(counts.rooms)} />
            <Row label="Dimensions" value={String(counts.dims)} />
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--muted)] mb-3">
              <MousePointer2 size={13} /> Selection
            </div>
            {selectedEl ? (
              <div className="card p-3 text-sm">
                <p className="text-[var(--muted)] text-xs uppercase tracking-wider">
                  {selectedKind}
                </p>
                <p className="font-mono text-xs mt-1 break-all">
                  {selectedEl.id}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Nothing selected.</p>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--muted)] hover:text-[var(--text)]"
            >
              <Info size={13} /> Shortcuts
            </button>
            {showInfo && (
              <ul className="mt-3 space-y-1.5 text-xs text-[var(--muted)]">
                <li className="flex justify-between">
                  <span>Select</span>
                  <kbd className="font-mono text-[var(--text)]">V</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Wall</span>
                  <kbd className="font-mono text-[var(--text)]">W</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Door</span>
                  <kbd className="font-mono text-[var(--text)]">D</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Window</span>
                  <kbd className="font-mono text-[var(--text)]">N</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Dimension</span>
                  <kbd className="font-mono text-[var(--text)]">M</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Delete</span>
                  <kbd className="font-mono text-[var(--text)]">Del</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Undo / Redo</span>
                  <kbd className="font-mono text-[var(--text)]">⌘Z / ⌘⇧Z</kbd>
                </li>
              </ul>
            )}
          </div>
        </aside>

        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-[var(--bg)]"
        >
          <canvas ref={canvasRef} />
          {tool !== "select" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[var(--surface)] border border-[var(--border-strong)] px-4 py-2 rounded-md text-sm shadow-lg">
              {tool === "wall" && "Click and drag to draw a wall. Esc to cancel."}
              {tool === "door" && "Click on a wall to place a door. Esc to cancel."}
              {tool === "window" && "Click on a wall to place a window. Esc to cancel."}
              {tool === "measurement" && "Click to place a dimension label. Esc to cancel."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[var(--border)] last:border-b-0">
      <span className="text-[var(--muted)] text-xs uppercase tracking-wider">
        {label}
      </span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}
