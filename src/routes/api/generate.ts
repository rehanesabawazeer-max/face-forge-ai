import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { prompt, image } = (await request.json()) as { prompt: string; image?: string };
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return Response.json({ error: "Missing LOVABLE_API_KEY" }, { status: 500 });

          const userContent: any[] = [{ type: "text", text: prompt }];
          if (image) userContent.push({ type: "image_url", image_url: { url: image } });

          const res = await fetch(GATEWAY, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [{ role: "user", content: userContent }],
              modalities: ["image", "text"],
            }),
          });

          if (!res.ok) {
            const text = await res.text();
            if (res.status === 429) return Response.json({ error: "Rate limit exceeded. Please wait." }, { status: 429 });
            if (res.status === 402) return Response.json({ error: "AI credits exhausted. Add credits in Workspace settings." }, { status: 402 });
            return Response.json({ error: `Gateway error: ${text}` }, { status: 500 });
          }

          const data = await res.json();
          const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (!url) return Response.json({ error: "No image returned" }, { status: 500 });
          return Response.json({ image: url });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
        }
      },
    },
  },
});
