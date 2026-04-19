import Link from "next/link";
import {
  Upload,
  Cpu,
  PenTool,
  FileDown,
  ArrowRight,
  Ruler,
  Layers,
  Smartphone,
} from "lucide-react";
import Header from "@/components/Header";

const steps = [
  {
    n: "01",
    title: "Upload",
    body: "Drop in a photo of your hand-drawn plan or shoot one from your phone on site.",
    Icon: Upload,
  },
  {
    n: "02",
    title: "AI Process",
    body: "Gemini Vision detects walls, doors, windows, rooms and reads your handwritten dimensions.",
    Icon: Cpu,
  },
  {
    n: "03",
    title: "Edit",
    body: "Fine-tune geometry on an interactive CAD-style canvas. Adjust measurements, add elements.",
    Icon: PenTool,
  },
  {
    n: "04",
    title: "Export",
    body: "Download clean DXF for AutoCAD, or PNG and PDF for review and documentation.",
    Icon: FileDown,
  },
];

const features = [
  {
    Icon: Ruler,
    title: "Dimension-aware",
    body: "Scale inferred from any handwritten measurement. Output is geometrically accurate, not just traced.",
  },
  {
    Icon: Layers,
    title: "Layered DXF output",
    body: "Walls, openings, and annotations are written to separate AutoCAD layers — drop straight into your CAD workflow.",
  },
  {
    Icon: Smartphone,
    title: "Site-ready",
    body: "Works on phones and tablets. Capture a sketch with the on-site camera and walk away with a digital plan.",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-[var(--border)]">
          <div className="absolute inset-0 grid-bg opacity-60" />
          <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)] border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-3 py-1 rounded-full">
                For architects and designers
              </span>
              <h1 className="mt-6 text-5xl md:text-7xl font-semibold tracking-tight leading-[1.02]">
                Hand-drawn plans,
                <br />
                <span className="text-[var(--accent)]">CAD-ready</span> in seconds.
              </h1>
              <p className="mt-6 text-lg md:text-xl text-[var(--muted)] max-w-2xl leading-relaxed">
                Sketch2CAD turns a photo of your sketch into a clean, editable
                floor plan. Reads your handwritten dimensions, rebuilds walls to
                scale, and exports straight to DXF.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/upload"
                  className="btn-accent px-6 py-3.5 rounded-md font-medium inline-flex items-center gap-2"
                >
                  Digitize a sketch
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/editor"
                  className="btn-outline px-6 py-3.5 rounded-md font-medium inline-flex items-center gap-2"
                >
                  Open editor
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-6 py-20">
            <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--accent)]">
                  Workflow
                </p>
                <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
                  Four steps, zero re-drawing
                </h2>
              </div>
              <p className="text-[var(--muted)] max-w-md">
                A deliberate pipeline engineered for the way you actually work —
                rough sketch in, precise geometry out.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {steps.map(({ n, title, body, Icon }) => (
                <div
                  key={n}
                  className="card p-6 hover:border-[var(--accent)]/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[var(--muted)] tracking-wider">
                      {n}
                    </span>
                    <Icon
                      size={18}
                      className="text-[var(--accent)]"
                      strokeWidth={2}
                    />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-6">
            {features.map(({ Icon, title, body }) => (
              <div key={title} className="py-4">
                <Icon size={22} className="text-[var(--accent)]" strokeWidth={2} />
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="max-w-7xl mx-auto px-6 py-24 text-center">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
              Ready to digitize your first sketch?
            </h2>
            <p className="mt-4 text-[var(--muted)] max-w-xl mx-auto">
              No account needed for the MVP. Upload an image and get editable
              geometry in under a minute.
            </p>
            <Link
              href="/upload"
              className="btn-accent mt-8 px-7 py-4 rounded-md font-medium inline-flex items-center gap-2"
            >
              Start now
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <footer className="border-t border-[var(--border)] py-8">
          <div className="max-w-7xl mx-auto px-6 text-xs text-[var(--muted)] flex items-center justify-between flex-wrap gap-2">
            <span>© {new Date().getFullYear()} Sketch2CAD</span>
            <span className="font-mono">v0.1 — MVP</span>
          </div>
        </footer>
      </main>
    </>
  );
}
