const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const LIMIT = 2_400_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Cross-origin requests are not allowed." }, 403);
  }

  if (!process.env.GEMINI_API_KEY) {
    return json({ error: "AI_NOT_CONFIGURED", message: "AI image analysis is not connected yet. Use Guided Styling for now." }, 503);
  }

  try {
    const raw = await request.text();
    if (raw.length > LIMIT) return json({ error: "Photo is too large. Try a smaller image." }, 413);
    const { image, profile } = JSON.parse(raw);

    if (typeof image !== "string" || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 2_200_000) {
      return json({ error: "Please select a valid photo." }, 400);
    }

    const prefs = profile && typeof profile === "object" ? profile : {};
    const clean = (value, max = 100) => String(value ?? "").slice(0, max);
    const budget = Math.max(25, Math.min(10000, Number(prefs.budget) || 200));

    const prompt = [
      "You are MATCHLATCH, a practical fashion stylist. Analyze the attached clothing/accessory photograph.",
      "Return ONE valid JSON object only, with exactly this shape:",
      '{"item":{"label":"short description","category":"top/bottom/shoes/outerwear/accessory/dress/other","color":"main color","details":"one sentence grounded in what is visible"},"styleNotes":"one sentence explaining why this outfit fits","pieces":[{"type":"category","description":"specific complementary item and color","searchQuery":"concise generic shopping search query"}]}',
      "Pieces MUST contain exactly 3 wearable complementary items; don't duplicate the photographed item category unless layering is sensible.",
      "Avoid brand identification unless visible and certain. Never invent prices, sellers, discounts, availability, product links or verified exact matches.",
      "Don't infer sensitive traits about the person in the photo. Focus only on clothing.",
      "The person's desired look is " + clean(prefs.look) + ", fit is " + clean(prefs.fit) + ", occasion is " + clean(prefs.occasion) + ", and target shopping budget (for additional pieces) is $" + budget + ".",
      "Personal notes: " + clean(prefs.notes, 260) + ".",
      "Use useful color coordination, realistic pieces, and easily searchable generic product phrases.",
      "Keep all fields brief and concrete. Return JSON only."
    ].join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let response;
    try {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(MODEL) + ":generateContent", {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: image.split(",")[1] } }] }],
          generationConfig: { temperature: 0.45, maxOutputTokens: 1600, responseMimeType: "application/json" }
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error("MATCHLATCH Gemini request failed:", response.status);
      return json({ error: "The vision engine is unavailable right now. Try Guided Styling instead." }, 502);
    }

    const payload = await response.json();
    const output = payload?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("") || "";
    let parsed;
    try {
      parsed = JSON.parse(output.trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, ""));
    } catch {
      return json({ error: "The vision engine returned an unexpected result. Try again." }, 502);
    }

    const item = parsed?.item;
    if (!item || !Array.isArray(parsed.pieces) || parsed.pieces.length < 3) {
      return json({ error: "The vision engine needs another attempt." }, 502);
    }

    return json({
      mode: "ai",
      item: {
        label: clean(item.label, 100),
        category: clean(item.category, 40),
        color: clean(item.color, 45),
        details: clean(item.details, 250)
      },
      styleNotes: clean(parsed.styleNotes, 320),
      pieces: parsed.pieces.slice(0, 3).map(piece => ({
        type: clean(piece.type, 55),
        description: clean(piece.description, 160),
        searchQuery: clean(piece.searchQuery, 180)
      }))
    });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Invalid request." }, 400);
    console.error("MATCHLATCH analysis error:", error?.name || "Unknown");
    return json({ error: "Analysis is temporarily unavailable. Try Guided Styling." }, 502);
  }
}

export function GET() {
  return json({ status: "ok", aiConfigured: Boolean(process.env.GEMINI_API_KEY) });
}
