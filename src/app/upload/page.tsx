"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload as UploadIcon,
  Camera,
  Image as ImageIcon,
  X,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import Header from "@/components/Header";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!f.type.startsWith("image/")) {
      setError("Please select an image file (JPG or PNG).");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setError("Image must be under 15 MB.");
      return;
    }
    setError(null);
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const process = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      setStage("Reading image...");
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      setStage("Sending to Gemini Vision...");
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Processing failed");
      }

      setStage("Parsing floor plan...");
      const data = await res.json();

      localStorage.setItem("sketch2cad:plan", JSON.stringify(data.plan));
      localStorage.setItem("sketch2cad:source", preview ?? "");
      router.push("/editor");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error";
      setError(msg);
      setProcessing(false);
      setStage("");
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="mb-10">
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--accent)]">
              Step 01
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Upload your sketch
            </h1>
            <p className="mt-3 text-[var(--muted)] max-w-2xl">
              JPG or PNG of a hand-drawn floor plan. Include at least one
              written dimension so the AI can resolve scale.
            </p>
          </div>

          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`card border-dashed cursor-pointer transition-all p-12 md:p-20 text-center ${
                dragOver
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "hover:border-[var(--border-strong)]"
              }`}
            >
              <div className="mx-auto h-14 w-14 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
                <UploadIcon
                  size={22}
                  className="text-[var(--accent)]"
                  strokeWidth={2}
                />
              </div>
              <h3 className="mt-6 text-lg font-semibold">
                Drop your sketch here
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                or click to browse — up to 15 MB
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="btn-outline px-4 py-2.5 rounded-md text-sm font-medium inline-flex items-center gap-2"
                >
                  <ImageIcon size={16} />
                  Choose image
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="btn-outline px-4 py-2.5 rounded-md text-sm font-medium inline-flex items-center gap-2"
                >
                  <Camera size={16} />
                  Use camera
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                hidden
                onChange={(e) => handleFiles(e.target.files)}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          ) : (
            <div className="card p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm">
                  <p className="font-medium truncate max-w-xs md:max-w-md">
                    {file.name}
                  </p>
                  <p className="text-[var(--muted)] text-xs mt-0.5">
                    {(file.size / 1024).toFixed(0)} KB · {file.type}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setError(null);
                  }}
                  disabled={processing}
                  className="h-9 w-9 rounded-md border border-[var(--border-strong)] flex items-center justify-center hover:border-[var(--danger)] hover:text-[var(--danger)] transition-colors disabled:opacity-40"
                  aria-label="Remove"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="relative rounded-md overflow-hidden border border-[var(--border)] bg-black">
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Sketch preview"
                    className="max-h-[60vh] w-full object-contain"
                  />
                )}
              </div>

              <div className="mt-6 flex flex-wrap justify-between items-center gap-4">
                <p className="text-xs text-[var(--muted)]">
                  Processing takes 10–30 seconds depending on sketch complexity.
                </p>
                <button
                  onClick={process}
                  disabled={processing}
                  className="btn-accent px-6 py-3 rounded-md font-medium inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {processing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {stage || "Processing..."}
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Digitize with AI
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-start gap-3 p-4 rounded-md border border-[var(--danger)]/50 bg-[var(--danger)]/10 text-sm">
              <AlertCircle
                size={18}
                className="text-[var(--danger)] shrink-0 mt-0.5"
              />
              <div>
                <p className="font-medium">Processing failed</p>
                <p className="text-[var(--muted)] mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
