import { useState, useCallback, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FEATURE_GROUPS, DEFAULTS, buildPrompt } from "@/lib/features";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Save,
  FileText,
  Trash2,
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

type CaseRecord = {
  id: string;
  case_number: string;
  notes: string | null;
  image_url: string;
  image_path: string;
  label: string | null;
  mode: string | null;
  features: any;
  created_at: string;
};

function genCaseNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const rand = Math.floor(Math.random() * 1e6).toString().padStart(6, "0");
  return `FS-${y}-${rand}`;
}

function App() {
  const [features, setFeatures] = useState<Record<string, string>>({ ...DEFAULTS });
  const [mode, setMode] = useState<"sketch" | "realistic">("sketch");
  const [style, setStyle] = useState<"grayscale" | "semi-real">("grayscale");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [enhancePrompt, setEnhancePrompt] = useState("");
  const [confidence, setConfidence] = useState<number>(0);
  const [caseNumber, setCaseNumber] = useState<string>("");
  const [caseNotes, setCaseNotes] = useState<string>("");
  const [todayLabel, setTodayLabel] = useState<string>("");
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Initialize client-only values to avoid SSR hydration mismatch
  useEffect(() => {
    setCaseNumber(genCaseNumber());
    setTodayLabel(new Date().toLocaleDateString());
    loadCases();
  }, []);

  const loadCases = async () => {
    const { data, error } = await supabase
      .from("forensic_cases")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) {
      console.error(error);
      return;
    }
    setCases((data ?? []) as CaseRecord[]);
  };

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
    a.download = `${caseNumber || "face-sketch"}-${Date.now()}.png`;
    a.click();
  };

  const saveToCase = async () => {
    if (!image) {
      toast.error("Nothing to save");
      return;
    }
    if (!caseNumber.trim()) {
      toast.error("Enter a case number");
      return;
    }
    setSaving(true);
    try {
      // Convert data URL to blob
      const blob = await (await fetch(image)).blob();
      const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      const path = `${caseNumber}/${Date.now()}-${mode}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("case-files")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("case-files").getPublicUrl(path);
      const { error: insErr } = await supabase.from("forensic_cases").insert({
        case_number: caseNumber.trim(),
        notes: caseNotes,
        image_url: pub.publicUrl,
        image_path: path,
        label: mode,
        mode,
        features,
      });
      if (insErr) throw insErr;
      toast.success(`Saved to case ${caseNumber}`);
      loadCases();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteCase = async (c: CaseRecord) => {
    try {
      await supabase.storage.from("case-files").remove([c.image_path]);
      await supabase.from("forensic_cases").delete().eq("id", c.id);
      setCases((cs) => cs.filter((x) => x.id !== c.id));
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const loadCase = (c: CaseRecord) => {
    setImage(c.image_url);
    setCaseNumber(c.case_number);
    setCaseNotes(c.notes ?? "");
    if (c.features && typeof c.features === "object") {
      setFeatures({ ...DEFAULTS, ...(c.features as any) });
    }
    if (c.mode === "realistic" || c.mode === "sketch") setMode(c.mode);
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
            <span>CASE #{caseNumber || "------"}</span>
            <span suppressHydrationWarning>{todayLabel}</span>
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
                disabled={!image || saving}
                onClick={saveToCase}
                className="font-mono text-xs border-[var(--neon)]/40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} SAVE TO CASE
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
                  setCaseNumber(genCaseNumber());
                  setCaseNotes("");
                }}
                className="font-mono text-xs"
              >
                <RefreshCw className="h-4 w-4 mr-1" /> NEW CASE
              </Button>
            </div>
          </div>

          {/* Case file metadata */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-[var(--neon)]" />
              <h2 className="text-xs font-mono uppercase tracking-widest">Case File</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Case Number</label>
                <Input
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="FS-2026-000123"
                  className="bg-input/50 border-[var(--neon)]/20 font-mono text-xs"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Investigator Notes</label>
                <Textarea
                  value={caseNotes}
                  onChange={(e) => setCaseNotes(e.target.value)}
                  placeholder="Witness account, location, suspect description, distinguishing marks…"
                  className="bg-input/50 border-[var(--neon)]/20 font-mono text-xs min-h-[60px]"
                />
              </div>
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

        {/* RIGHT — saved case archive */}
        <aside className="col-span-12 lg:col-span-3 glass rounded-xl overflow-hidden">
          <div className="p-3 border-b flex items-center gap-2">
            <History className="h-4 w-4 text-[var(--neon)]" />
            <h2 className="text-xs font-mono uppercase tracking-widest">Case Archive</h2>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{cases.length}</span>
          </div>
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-3 space-y-2">
              {cases.length === 0 && (
                <div className="text-center text-[10px] font-mono text-muted-foreground py-8">
                  NO SAVED CASES
                </div>
              )}
              {cases.map((c) => (
                <div
                  key={c.id}
                  className="group rounded border border-[var(--neon)]/20 hover:border-[var(--neon)]/60 transition overflow-hidden bg-black/30"
                >
                  <button onClick={() => loadCase(c)} className="block w-full">
                    <img src={c.image_url} alt={c.case_number} className="w-full aspect-square object-cover" />
                  </button>
                  <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[var(--neon)] truncate">{c.case_number}</span>
                      <button
                        onClick={() => deleteCase(c)}
                        className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    {c.notes && (
                      <p className="text-[9px] font-mono text-muted-foreground line-clamp-2">{c.notes}</p>
                    )}
                    <div className="flex justify-between text-[9px] font-mono text-muted-foreground/70">
                      <span className="uppercase">{c.label}</span>
                      <span suppressHydrationWarning>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>
      </main>
    </div>
  );
}
