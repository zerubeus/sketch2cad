"use client";

import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/Editor"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-[var(--muted)] text-sm h-[calc(100vh-4rem)]">
      Loading editor…
    </div>
  ),
});

export default function EditorClient() {
  return <Editor />;
}
