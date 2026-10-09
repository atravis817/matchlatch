import { timingSafeEqual } from "node:crypto";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const LIMIT = 2_400_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function authorized(received, expected) {
  if (typeof received !== "string" || received.length > 256) return false;
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

const itemSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { type: "string" },
    category: { type: "string" },
    color: { type: "string" },
    details: { type: "string" }
  },
  required: ["label", "category", "color", "details"]
};
const pieceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string" },
    slot: { type: "string", enum: ["hat","scarf","jacket","shirt","watch","belt","pants","socks","shoes"] },
    color: { type: "string" },
    description: { type: "string" },
    searchQuery: { type: "string" }
  },
  required: ["type", "slot", "color", "description", "searchQuery"]
};
const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    item: itemSchema,
    styleNotes: { type: "string" },
    pieces: { type: "array", items: pieceSchema }
  },
  required: ["item", "styleNotes", "pieces"]
};

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Cross-origin requests are not allowed." }, 403);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const betaCode = process.env.MATCHLATCH_BETA_CODE;
  if (!apiKey || !betaCode || betaCode.length < 16) {
    const missing = [
      ...(!apiKey ? ["OPENAI_API_KEY"] : []),
      ...(!betaCode || betaCode.length < 16 ? ["MATCHLATCH_BETA_CODE (at least 16 characters)"] : [])
    ];
    return json({
      error: "AI_NOT_CONFIGURED",
      message: "Vercel configuration missing or incomplete: " + missing.join("; ") + ". Set it for Production, then redeploy."
    }, 503);
  }

  let input;
  try {
    const raw = await request.text();
    if (raw.length > LIMIT) return json({ error: "Photo is too large. Try a smaller photo." }, 413);
    input = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  if (!authorized(input?.betaCode, betaCode)) {
    return json({ error: "BETA_ACCESS_DENIED", message: "The private beta access code is incorrect." }, 403);
  }

  const image = input?.image;
  if (typeof image !== "string" ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image) ||
      image.length > 2_200_000) {
    return json({ error: "Please select a valid photo." }, 400);
  }

  const prefs = input?.profile && typeof input.profile === "object" ? input.profile : {};
  const clean = (value, max = 100) => String(value ?? "").slice(0, max);
  const budget = Math.max(25, Math.min(10000, Number(prefs.budget) || 200));
  const prompt = [
    "You are MATCHLATCH, a practical personal stylist.",
    "Analyze the attached clothing or accessory photo, using only visible clothing details.",
    "Return JSON matching the provided schema. 'pieces' MUST have exactly three entries.",
    "For item: describe the main garment or accessory. If the image contains many garments, pick the clearest piece.",
    "For pieces: recommend exactly three wearable complementary products, with concise search queries.",
    "Do not duplicate the photographed item's category unless layering makes sense.",
    "Style expression: " + clean(prefs.look) + ". Fit preference: " + clean(prefs.fit) + ".",
    "Style direction: " + clean(prefs.aesthetic || "No preference") + ". Color palette: " + clean(prefs.palette || "No preference") + ".",
    "Coordination preference: " + clean(prefs.coordination || "Balance / let AI decide") + ". Weather/season: " + clean(prefs.climate || "Any season") + ".",
    "Occasion: " + clean(prefs.occasion) + ". Total shopping target for three additional pieces: $" + budget + ".",
    "The following are user-entered sizes and sizing-system preferences, not verified fits. Use category-specific systems independent of gender expression:",
    "Preferred apparel sizing category: " + clean(prefs.sizeAudience || "Unisex") + ".",
    "Tops and jackets: " + clean(prefs.topSystem || "Unisex alpha") + " " + clean(prefs.topSize || "unspecified") + ".",
    "Bottoms: " + clean(prefs.bottomSystem || "Unisex alpha") + " " + clean(prefs.bottomSize || "unspecified") + "; waist (inches): " + clean(prefs.waist || "unspecified") + "; inseam (inches): " + clean(prefs.inseam || "unspecified") + ".",
    "Dresses and one-pieces: " + clean(prefs.dressSystem || "Unisex alpha") + " " + clean(prefs.dressSize || "unspecified") + ".",
    "Suit jacket / blazer: " + clean(prefs.suitJacketSystem || "unspecified") + " " + clean(prefs.suitJacketSize || "unspecified") + "; chest measurement (inches): " + clean(prefs.suitChest || "unspecified") + "; jacket length: " + clean(prefs.suitJacketLength || "unspecified") + "; sleeve measurement (inches): " + clean(prefs.suitSleeve || "unspecified") + ".",
    "Suit pants / trousers: " + clean(prefs.suitPantSystem || "unspecified") + " " + clean(prefs.suitPantSize || "unspecified") + "; waist (inches): " + clean(prefs.suitPantWaist || "unspecified") + "; inseam (inches): " + clean(prefs.suitPantInseam || "unspecified") + ".",
    "For suits, consider the jacket and trouser sizes separately, even when an ensemble is sold as one set. Do not assume a drop size, automatic jacket-to-pants conversion, or fit from stated chest/waist measurements.",
    "Use up to 6XL in apparel categories when the user selects a corresponding letter size, but never claim a retailer carries that size without live inventory evidence.",
    "Sneakers, shoes and boots: " + clean(prefs.shoeSystem || "unspecified") + " " + clean(prefs.shoeSize || "unspecified") + "; shoe width: " + clean(prefs.shoeWidth || "unspecified") + ".",
    "Hats and caps: " + clean(prefs.hatSystem || "unspecified") + " " + clean(prefs.hatSize || "unspecified") + ".",
    "Belts: " + clean(prefs.beltSystem || "unspecified") + " " + clean(prefs.beltSize || "unspecified") + ". Gloves: " + clean(prefs.gloveSize || "unspecified") + ". Rings: " + clean(prefs.ringSystem || "unspecified") + " " + clean(prefs.ringSize || "unspecified") + ".",
    "For EACH of the three complementary pieces, use one exact shopping category slot: hat, scarf, jacket, shirt, watch, belt, pants, socks or shoes. Use a different slot for each complementary piece and do not repeat the starting-photo category.",
    "For EACH complementary piece, set color to one specific garment color (e.g. navy, black, camel, olive) or an empty string if it cannot be specified. Do not use aesthetic palette labels as literal SKU colors.",
    "For EACH complementary piece, write a concise searchQuery combining garment description, suggested color and aesthetic. These are query suggestions, NOT confirmed offers or stock.",
    "Respect specified sizing in descriptions and shopping search queries for relevant categories only. Never infer sizes from a photo, assume a cross-brand conversion, or claim availability or guaranteed fit. Sizing labels are retailer-specific.",
    "Other preferences: " + clean(prefs.notes, 260) + ".",
    "Coordinate colors and realistic clothing. Be specific and useful.",
    "Do not infer demographic or sensitive traits of any person pictured.",
    "Do not claim a specific brand, product identification, price, store, discount, stock, or exact match unless clearly evident from photo.",
    "You are generating search suggestions, not checking live retailer inventory. Never fabricate products or links.",
    "Use concise labels, style notes, descriptions and shopping search phrases."
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: image, detail: "low" }
          ]
        }],
        text: {
          format: {
            type: "json_schema",
            name: "matchlatch_look",
            strict: true,
            schema
          }
        },
        max_output_tokens: 1700
      }),
      signal: controller.signal
    });
  } catch (error) {
    console.error("MATCHLATCH OpenAI request failed:", error?.name || "Unknown");
    return json({ error: "The vision engine could not connect. Try again later or use Guided Styling." }, 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    console.error("MATCHLATCH OpenAI HTTP status:", response.status);
    const message = response.status === 429
      ? "AI usage is temporarily limited. Check API credits or try again later."
      : response.status === 401
        ? "OpenAI rejected the configured API key. Check it in Vercel settings."
        : "The vision engine is unavailable right now. Try Guided Styling instead.";
    return json({ error: message }, 502);
  }

  try {
    const result = await response.json();
    const output = (result.output || [])
      .filter(x => x.type === "message")
      .flatMap(x => x.content || [])
      .filter(x => x.type === "output_text")
      .map(x => x.text || "")
      .join("");
    if (!output) {
      return json({ error: "The AI returned an empty response. Try again." }, 502);
    }
    const parsed = JSON.parse(output);
    if (!parsed.item || !Array.isArray(parsed.pieces) || parsed.pieces.length !== 3) {
      return json({ error: "The outfit response was incomplete. Try again." }, 502);
    }
    return json({
      mode: "ai",
      item: {
        label: clean(parsed.item.label, 100),
        category: clean(parsed.item.category, 50),
        color: clean(parsed.item.color, 50),
        details: clean(parsed.item.details, 260)
      },
      styleNotes: clean(parsed.styleNotes, 320),
      pieces: parsed.pieces.map(p => ({
        type: clean(p.type, 55),
        slot: p.slot,
        color: clean(p.color, 40),
        description: clean(p.description, 160),
        searchQuery: clean(p.searchQuery, 180)
      }))
    });
  } catch (error) {
    console.error("MATCHLATCH parsing error:", error?.name || "Unknown");
    return json({ error: "The vision engine returned an unexpected result. Try again." }, 502);
  }
}

export function GET() {
  const keyReady = Boolean(process.env.OPENAI_API_KEY);
  const betaReady = Boolean(process.env.MATCHLATCH_BETA_CODE && process.env.MATCHLATCH_BETA_CODE.length >= 16);
  return json({
    status: keyReady && betaReady ? "ready" : "configuration_needed",
    provider: "openai",
    openaiKeyPresent: keyReady,
    betaCodePresentAndLongEnough: betaReady,
    note: "Presence checks only. Secret values are never returned. API credit and model access are not verified by this check."
  });
}
