// Los logos de las empresas en los diagramas de neón (C-LOGOS-1). Lo pidió Richard el 5 oct 2026: «que
// también salgan los logos de las empresas que se nombran (OpenAI, Google), no solo las personas». Los
// trazos salen de Simple Icons (CC0, versión fija); las marcas que esa biblioteca no trae (OpenAI,
// Microsoft, Amazon…) salen con su nombre escrito en neón: no se inventa ningún logo.
// Vive dentro de la carpeta de la plantilla porque el empaquetador de Remotion no ve `@compartido`.
import {
  siAirbnb,
  siAmd,
  siAndroid,
  siAnthropic,
  siApple,
  siAppstore,
  siBinance,
  siBitcoin,
  siBluesky,
  siBmw,
  siCashapp,
  siClaude,
  siCloudflare,
  siCoinbase,
  siCursor,
  siDeepseek,
  siDiscord,
  siDropbox,
  siDuolingo,
  siElevenlabs,
  siEthereum,
  siFacebook,
  siFerrari,
  siFigma,
  siFirefoxbrowser,
  siFord,
  siGithub,
  siGithubcopilot,
  siGmail,
  siGoogle,
  siGooglechrome,
  siGooglecloud,
  siGooglegemini,
  siGoogleplay,
  siHuawei,
  siHuggingface,
  siInstagram,
  siIntel,
  siMastercard,
  siMeta,
  siMistralai,
  siNetflix,
  siNotion,
  siNvidia,
  siOllama,
  siPaypal,
  siPerplexity,
  siPinterest,
  siPlaystation,
  siReddit,
  siReplit,
  siRevolut,
  siSafari,
  siSamsung,
  siShopify,
  siSignal,
  siSnapchat,
  siSony,
  siSpacex,
  siSpotify,
  siStripe,
  siSupabase,
  siTelegram,
  siTesla,
  siThreads,
  siTiktok,
  siToyota,
  siTwitch,
  siUber,
  siVenmo,
  siVercel,
  siVisa,
  siWhatsapp,
  siWikipedia,
  siX,
  siXiaomi,
  siYoutube,
  siZelle,
  siZoom,
} from "simple-icons";

type IconoSimple = { path: string; hex: string };

/** Marca → su ícono y los otros nombres con que se la nombra (en minúscula y sin tilde). */
const CON_LOGO: [string, IconoSimple, string[]][] = [
  ["Google", siGoogle, []],
  ["Google Cloud", siGooglecloud, []],
  ["Google Gemini", siGooglegemini, ["gemini"]],
  ["Anthropic", siAnthropic, []],
  ["Claude", siClaude, []],
  ["Meta", siMeta, []],
  ["Facebook", siFacebook, []],
  ["Instagram", siInstagram, []],
  ["WhatsApp", siWhatsapp, []],
  ["YouTube", siYoutube, []],
  ["TikTok", siTiktok, []],
  ["X", siX, ["twitter"]],
  ["Apple", siApple, []],
  ["Netflix", siNetflix, []],
  ["Spotify", siSpotify, []],
  ["Tesla", siTesla, []],
  ["NVIDIA", siNvidia, []],
  ["Samsung", siSamsung, []],
  ["Cloudflare", siCloudflare, []],
  ["GitHub", siGithub, []],
  ["Android", siAndroid, []],
  ["Telegram", siTelegram, []],
  ["PayPal", siPaypal, []],
  ["Stripe", siStripe, []],
  ["Uber", siUber, []],
  ["Airbnb", siAirbnb, []],
  ["Visa", siVisa, []],
  ["Mastercard", siMastercard, []],
  ["Intel", siIntel, []],
  ["AMD", siAmd, []],
  ["Perplexity", siPerplexity, []],
  ["Mistral AI", siMistralai, ["mistral"]],
  ["Hugging Face", siHuggingface, []],
  ["DeepSeek", siDeepseek, []],
  ["Shopify", siShopify, []],
  ["Zoom", siZoom, []],
  ["Discord", siDiscord, []],
  ["Reddit", siReddit, []],
  ["Snapchat", siSnapchat, []],
  ["Pinterest", siPinterest, []],
  ["Binance", siBinance, []],
  ["Bitcoin", siBitcoin, []],
  ["Ethereum", siEthereum, []],
  ["Google Chrome", siGooglechrome, ["chrome"]],
  ["Gmail", siGmail, []],
  ["Vercel", siVercel, []],
  ["Supabase", siSupabase, []],
  ["Twitch", siTwitch, []],
  ["Notion", siNotion, []],
  ["Figma", siFigma, []],
  ["Dropbox", siDropbox, []],
  ["Ollama", siOllama, []],
  ["GitHub Copilot", siGithubcopilot, ["copilot"]],
  ["Google Play", siGoogleplay, []],
  ["App Store", siAppstore, []],
  ["Wikipedia", siWikipedia, []],
  ["Duolingo", siDuolingo, []],
  ["Bluesky", siBluesky, []],
  ["Threads", siThreads, []],
  ["Signal", siSignal, []],
  ["Firefox", siFirefoxbrowser, []],
  ["Safari", siSafari, []],
  ["Cursor", siCursor, []],
  ["Replit", siReplit, []],
  ["ElevenLabs", siElevenlabs, []],
  ["Sony", siSony, []],
  ["PlayStation", siPlaystation, []],
  ["Huawei", siHuawei, []],
  ["Xiaomi", siXiaomi, []],
  ["Coinbase", siCoinbase, []],
  ["Revolut", siRevolut, []],
  ["Venmo", siVenmo, []],
  ["Cash App", siCashapp, []],
  ["Zelle", siZelle, []],
  ["BMW", siBmw, []],
  ["Toyota", siToyota, []],
  ["Ford", siFord, []],
  ["Ferrari", siFerrari, []],
  ["SpaceX", siSpacex, []],
];

/** Las que Simple Icons no trae (las retiraron a pedido de la marca): su nombre en neón. */
const SOLO_NOMBRE: [string, string[]][] = [
  ["OpenAI", ["openai", "chatgpt", "chat gpt", "sora"]],
  ["Microsoft", ["microsoft"]],
  ["Amazon", ["amazon"]],
  ["xAI", ["xai", "grok"]],
  ["LinkedIn", ["linkedin"]],
  ["Slack", ["slack"]],
  ["Midjourney", ["midjourney"]],
  ["Adobe", ["adobe"]],
  ["Xbox", ["xbox"]],
  ["Mercado Libre", ["mercado libre", "mercadolibre"]],
  ["Walmart", ["walmart"]],
];

export type LogoDeMarca = {
  marca: string;
  /** El trazo SVG del logo (caja de 24 × 24), o `null` si la marca sale con su nombre escrito. */
  trazo: string | null;
  /** Lo que se escribe en neón cuando no hay trazo. */
  sigla: string | null;
  /** El color de la marca (#rrggbb), por si se quiere teñir el brillo. */
  color: string | null;
};

const normal = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Todas las formas de nombrar cada marca, de la más larga a la más corta («google cloud» antes que «google»). */
const FORMAS: { forma: string; logo: LogoDeMarca }[] = [
  ...CON_LOGO.flatMap(([marca, ic, otros]) =>
    [marca, ...otros].map((f) => ({
      forma: normal(f),
      logo: { marca, trazo: ic.path, sigla: null, color: `#${ic.hex}` },
    })),
  ),
  ...SOLO_NOMBRE.flatMap(([marca, formas]) =>
    formas.map((f) => ({ forma: normal(f), logo: { marca, trazo: null, sigla: marca, color: null } })),
  ),
].sort((a, b) => b.forma.length - a.forma.length);

/**
 * El logo de la empresa que nombra la etiqueta de un objeto del diagrama, o `null` si no nombra a
 * ninguna. Vale el nombre solo o seguido de otras palabras («Google Cloud», «Meta AI»); los nombres de
 * una o dos letras («X») solo si la etiqueta es exactamente eso, para no confundirlos con palabras.
 */
export function logoDeMarca(etiqueta: string): LogoDeMarca | null {
  const t = normal(etiqueta);
  const hallada = FORMAS.find(({ forma }) => t === forma || (forma.length > 2 && t.startsWith(`${forma} `)));
  return hallada?.logo ?? null;
}
