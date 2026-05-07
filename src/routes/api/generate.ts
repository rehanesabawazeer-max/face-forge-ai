import { createFileRoute } from "@tanstack/react-router";

// Google Generative Language API — image generation/editing via Gemini 2.5 Flash Image
const MODEL = "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { prompt, image } = (await request.json()) as { prompt: string; image?: string };
          const apiKey = process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return Response.json(
              { error: "Missing GEMINI_API_KEY. Add it to your .env file (get one at https://aistudio.google.com/apikey)." },
              { status: 500 },
            );
          }

          // Build parts: text + optional inline image
          const parts: any[] = [{ text: prompt }];
          if (image) {
            // image is a data URL like data:image/png;base64,XXXX
            const match = /^data:(.+?);base64,(.+)$/.exec(image);
            if (match) {
              parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
            }
          }

          const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
            }),
          });

          if (!res.ok) {
            const text = await res.text();
            if (res.status === 429) return Response.json({ error: "Rate limit exceeded. Please wait." }, { status: 429 });
            if (res.status === 402 || res.status === 403)
              return Response.json({ error: "API quota/credits exhausted or key invalid." }, { status: res.status });
            return Response.json({ error: `Gemini error: ${text}` }, { status: 500 });
          }

          const data = await res.json();
          const imgPart = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inline_data || p.inlineData);
          const inline = imgPart?.inline_data || imgPart?.inlineData;
          if (!inline?.data) return Response.json({ error: "No image returned" }, { status: 500 });

          const mime = inline.mime_type || inline.mimeType || "image/png";
          const url = `data:${mime};base64,${inline.data}`;
          return Response.json({ image: url });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
        }
      },
    },
  },
});
