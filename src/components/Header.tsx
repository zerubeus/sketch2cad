import Link from "next/link";
import { Ruler } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="h-8 w-8 rounded-md flex items-center justify-center bg-[var(--accent)] text-black">
            <Ruler size={18} strokeWidth={2.5} />
          </span>
          <span className="font-semibold tracking-tight text-[var(--text)]">
            Sketch<span className="text-[var(--accent)]">2</span>CAD
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-[var(--muted)]">
          <Link href="/upload" className="hover:text-[var(--text)] transition-colors">
            Upload
          </Link>
          <Link href="/editor" className="hover:text-[var(--text)] transition-colors">
            Editor
          </Link>
          <Link
            href="/upload"
            className="btn-accent px-4 py-2 rounded-md font-medium text-sm"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
