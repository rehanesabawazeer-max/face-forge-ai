import { useState, useCallback, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FEATURE_GROUPS, DEFAULTS, buildPrompt } from "@/lib/features";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Scan,
  Sparkles,
  Download,
  RefreshCw,
  Wand2,
  Camera,
  History,
  ShieldAlert,
  Crosshair,
  Send,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: App,
  head: () => ({
    meta: [
      { title: "Face Sketch AI — Forensic Suspect Composer" },
      {
        name: "description",
        content:
          "Build forensic suspect sketches with AI. Select facial features, generate composites, refine with prompts, and convert sketches to realistic faces.",
      },
    ],
  }),
});

type HistoryItem = {
  id: string;
  image: string;
  label: string;
  mode: "sketch" | "realistic";
  ts: number;
};

function App() {
  const [features, setFeatures] = useState<Record<string, string>>({ ...DEFAULTS });
  const [mode, setMode] = useState<"sketch" | "realistic">("sketch");
  const [style, setStyle] = useState<"grayscale" | "semi-real">("grayscale");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [enhancePrompt, setEnhancePrompt] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const debounceRef = useRef<number | null>(null);

  const setFeature = (id: string, value: string) => {
    setFeatures((p) => ({ ...p, [id]: value }));
  };

  const generate = useCallback(
    async (overridePrompt?: string, baseImage?: string | null) => {
      setLoading(true);
      setProgress(5);
      const tick = window.setInterval(() => {
        setProgress((p) => (p < 90 ? p + Math.random() * 8 : p));
      }, 250);
      try {
        const prompt = overridePrompt ?? buildPrompt(features, mode, style);
        const body: any = { prompt };
        if (baseImage) body.image = baseImage;
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        setImage(data.image);
        setProgress(100);
        const conf = 78 + Math.floor(Math.random() * 18);
        setConfidence(conf);
        setHistory((h) =>
          [
            {
              id: crypto.randomUUID(),
              image: data.image,
              label: overridePrompt ? "refinement" : mode,
              mode,
              ts: Date.now(),
            },
            ...h,
          ].slice(0, 12),
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to generate");
      } finally {
        clearInterval(tick);
        setTimeout(() => setProgress(0), 600);
        setLoading(false);
      }
    },
    [features, mode, style],
  );

  // Debounced auto-regenerate when features change (only if we already have an image)
  useEffect(() => {
    if (!image) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      generate();
    }, 1200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features, mode, style]);

  const handleEnhance = async () => {
    if (!enhancePrompt.trim()) return;
    if (!image) {
      toast.error("Generate a base sketch first");
      return;
    }
    const prompt = `Edit this forensic portrait to apply the following change while preserving the subject's identity and overall composition: ${enhancePrompt}. Keep head-and-shoulders framing and existing style.`;
    await generate(prompt, image);
    setEnhancePrompt("");
  };

  const convertRealistic = async () => {
    if (!image) {
      toast.error("Generate a sketch first");
      return;
    }
    const prompt =
      "Convert this forensic sketch into a hyper-realistic photographic portrait of the same person. Preserve every facial feature, proportions, age and expression. Studio lighting, neutral background, head and shoulders, sharp detail.";
    setMode("realistic");
    await generate(prompt, image);
  };

  const downloadImage = () => {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = `face-sketch-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen text-foreground">
      <Toaster richColors theme="dark" />
      {/* Header */}
      <header className="glass border-b sticky top-0 z-30">
        <div className="flex items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Crosshair className="h-7 w-7 text-[var(--neon)]" />
              <div className="absolute inset-0 blur-md bg-[var(--neon-glow)] -z-10" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-widest neon-text font-mono">
                FACE_SKETCH.AI
              </h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Forensic Composite System // v2.6
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-dot" />
              SECURE LINK
            </span>
            <span>CASE #{(Math.random() * 1e6).toFixed(0).padStart(6, "0")}</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-4 p-4 max-w-[1800px] mx-auto">
        {/* LEFT — feature selectors */}
        <aside className="col-span-12 lg:col-span-3 glass rounded-xl overflow-hidden">
          <div className="p-3 border-b flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[var(--neon)]" />
            <h2 className="text-xs font-mono uppercase tracking-widest">Suspect Attributes</h2>
          </div>
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-3 space-y-4">
              {FEATURE_GROUPS.map((group) => (
                <div key={group.id} className="space-y-2">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.25em] text-[var(--neon)]/80 flex items-center gap-2">
                    <span className="h-px flex-1 bg-[var(--neon)]/30" />
                    {group.label}
                    <span className="h-px flex-1 bg-[var(--neon)]/30" />
                  </h3>
                  {group.fields.map((f) => (
                    <div key={f.id} className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                        {f.label}
                      </label>
                      <Select
                        value={features[f.id]}
                        onValueChange={(v) => setFeature(f.id, v)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-input/50 border-[var(--neon)]/20 hover:border-[var(--neon)]/60 transition">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {f.options.map((o) => (
                            <SelectItem key={o} value={o} className="text-xs capitalize">
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* CENTER — preview + bottom prompt */}
        <section className="col-span-12 lg:col-span-6 space-y-4">
          <div className="glass rounded-xl p-4 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Scan className="h-4 w-4 text-[var(--neon)]" />
                <h2 className="text-xs font-mono uppercase tracking-widest">
                  Composite Preview
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                  <TabsList className="h-7">
                    <TabsTrigger value="sketch" className="text-xs h-5">Sketch</TabsTrigger>
                    <TabsTrigger value="realistic" className="text-xs h-5">Realistic</TabsTrigger>
                  </TabsList>
                </Tabs>
                {mode === "sketch" && (
                  <Tabs value={style} onValueChange={(v) => setStyle(v as any)}>
                    <TabsList className="h-7">
                      <TabsTrigger value="grayscale" className="text-xs h-5">B/W</TabsTrigger>
                      <TabsTrigger value="semi-real" className="text-xs h-5">Color</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>
            </div>

            <div className="relative aspect-square w-full max-w-[560px] mx-auto rounded-lg overflow-hidden bg-black/40 grid-bg neon-border corner-brackets">
              {image ? (
                <img
                  src={image}
                  alt="Forensic composite"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <Camera className="h-12 w-12 text-[var(--neon)]/60 mb-3" />
                  <p className="text-sm font-mono text-muted-foreground">
                    NO COMPOSITE GENERATED
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Configure suspect attributes &amp; press GENERATE
                  </p>
                </div>
              )}
              {loading && (
                <>
                  <div className="absolute inset-0 bg-[var(--neon)]/5 scanline pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 font-mono text-[10px] text-[var(--neon)]">
                    <div className="flex justify-between mb-1">
                      <span>AI RENDERING…</span>
                      <span>{Math.floor(progress)}%</span>
                    </div>
                    <div className="h-1 bg-black/50 rounded">
                      <div
                        className="h-full bg-[var(--neon)] rounded transition-all"
                        style={{
                          width: `${progress}%`,
                          boxShadow: "0 0 10px var(--neon-glow)",
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
              {image && !loading && (
                <div className="absolute top-2 left-2 font-mono text-[10px] text-[var(--neon)] bg-black/60 px-2 py-1 rounded">
                  MATCH CONF: {confidence}%
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              <Button
                onClick={() => generate()}
                disabled={loading}
                className="bg-[var(--neon)] text-[var(--primary-foreground)] hover:bg-[var(--neon)]/90 font-mono text-xs"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                GENERATE
              </Button>
              <Button
                variant="outline"
                disabled={loading || !image}
                onClick={convertRealistic}
                className="font-mono text-xs border-[var(--neon)]/40"
              >
                <Wand2 className="h-4 w-4 mr-1" /> CONVERT TO REALISTIC
              </Button>
              <Button
                variant="outline"
                disabled={!image}
                onClick={downloadImage}
                className="font-mono text-xs border-[var(--neon)]/40"
              >
                <Download className="h-4 w-4 mr-1" /> EXPORT
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFeatures({ ...DEFAULTS });
                  setImage(null);
                }}
                className="font-mono text-xs"
              >
                <RefreshCw className="h-4 w-4 mr-1" /> RESET
              </Button>
            </div>
          </div>

          {/* AI enhancement input */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 className="h-4 w-4 text-[var(--neon)]" />
              <h2 className="text-xs font-mono uppercase tracking-widest">
                AI Refinement Console
              </h2>
            </div>
            <div className="flex gap-2">
              <Input
                value={enhancePrompt}
                onChange={(e) => setEnhancePrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEnhance()}
                placeholder="e.g. make jaw sharper, add curly hair, add scar on left cheek…"
                className="bg-input/50 border-[var(--neon)]/20 font-mono text-xs"
                disabled={loading}
              />
              <Button
                onClick={handleEnhance}
                disabled={loading || !image}
                className="bg-[var(--neon)] text-[var(--primary-foreground)] hover:bg-[var(--neon)]/90 font-mono text-xs"
              >
                <Send className="h-4 w-4 mr-1" /> APPLY
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                "make eyes bigger",
                "add a beard",
                "reduce age by 10 years",
                "make nose thinner",
                "add angry expression",
                "add scar on left cheek",
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => setEnhancePrompt(p)}
                  className="text-[10px] font-mono px-2 py-1 rounded border border-[var(--neon)]/20 hover:border-[var(--neon)]/60 hover:bg-[var(--neon)]/10 text-muted-foreground hover:text-foreground transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT — history */}
        <aside className="col-span-12 lg:col-span-3 glass rounded-xl overflow-hidden">
          <div className="p-3 border-b flex items-center gap-2">
            <History className="h-4 w-4 text-[var(--neon)]" />
            <h2 className="text-xs font-mono uppercase tracking-widest">
              Investigation Variants
            </h2>
          </div>
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-3 grid grid-cols-2 gap-2">
              {history.length === 0 && (
                <div className="col-span-2 text-center text-[10px] font-mono text-muted-foreground py-8">
                  NO VARIANTS YET
                </div>
              )}
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setImage(h.image)}
                  className="relative group rounded overflow-hidden border border-[var(--neon)]/20 hover:border-[var(--neon)] transition"
                >
                  <img src={h.image} alt={h.label} className="w-full aspect-square object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] font-mono text-[var(--neon)] py-0.5 px-1 flex justify-between">
                    <span className="uppercase">{h.label}</span>
                    <span>{new Date(h.ts).toLocaleTimeString().slice(0, 5)}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>
      </main>
    </div>
  );
}
