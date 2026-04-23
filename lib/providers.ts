export type ProviderId = "anthropic" | "openai" | "mistral";

export type ModelConfig = {
  id: string;
  label: string;
  provider: ProviderId;
  modelId: string;
  envKey: string;
  beschrijving: string;
};

// Alleen goedkope, niet-reasoning modellen — geschikt voor een schoolworkshop.
// Geen Sonnet/Opus, geen GPT-5, geen Gemini Pro, geen Mistral Large.
export const ALLE_MODELLEN: ModelConfig[] = [
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "anthropic",
    modelId: "claude-haiku-4-5",
    envKey: "ANTHROPIC_API_KEY",
    beschrijving: "Snel en goedkoop. Aanbevolen standaard voor de workshop.",
  },
  {
    id: "gpt-4-1-mini",
    label: "GPT-4.1 mini",
    provider: "openai",
    modelId: "gpt-4.1-mini",
    envKey: "OPENAI_API_KEY",
    beschrijving: "OpenAI's goedkope mini-model. Goede Nederlandse output.",
  },
  {
    id: "mistral-small",
    label: "Mistral Small",
    provider: "mistral",
    modelId: "mistral-small-latest",
    envKey: "MISTRAL_API_KEY",
    beschrijving: "Europees, goedkoop, OpenAI-compatibel formaat.",
  },
  {
    id: "ministral-8b",
    label: "Ministral 8B",
    provider: "mistral",
    modelId: "ministral-8b-latest",
    envKey: "MISTRAL_API_KEY",
    beschrijving: "Nog goedkoper alternatief van Mistral.",
  },
];

function toegestaneLijst(): string[] | null {
  const raw = process.env.LMC_TOEGESTANE_MODELLEN;
  if (!raw) return null;
  const lijst = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return lijst.length ? lijst : null;
}

export function beschikbareModellen(): ModelConfig[] {
  const toegestaan = toegestaneLijst();
  return ALLE_MODELLEN.filter((m) => {
    if (!process.env[m.envKey]) return false;
    if (toegestaan && !toegestaan.includes(m.id)) return false;
    return true;
  });
}

export function standaardModel(): ModelConfig | null {
  const lijst = beschikbareModellen();
  if (lijst.length === 0) return null;
  const gekozen = process.env.STANDAARD_MODEL;
  if (gekozen) {
    const match = lijst.find((m) => m.id === gekozen);
    if (match) return match;
  }
  return lijst[0];
}

export function vindModel(id: string): ModelConfig | null {
  return beschikbareModellen().find((m) => m.id === id) ?? null;
}
