import type { IconName } from "@/components/BibIcon";

export type BadgeId =
  | "personage"
  | "tijd"
  | "zintuigen"
  | "conflict"
  | "rijk"
  | "eigen";

export type BadgeDef = {
  id: BadgeId;
  titel: string;
  kleur: string;
  kleurDonker: string;
  embleem: IconName;
  uitleg: string;
  hint: string;
};

export const BADGES: BadgeDef[] = [
  {
    id: "personage",
    titel: "Concreet personage",
    kleur: "#39373a",
    kleurDonker: "#1f1e20",
    embleem: "person",
    uitleg: "Je hoofdpersoon heeft een leeftijd of cijfer — geen vaag figuur.",
    hint: "Voeg een leeftijd of getal toe aan je personage.",
  },
  {
    id: "tijd",
    titel: "Tijd-gelaagd",
    kleur: "#c64a2e",
    kleurDonker: "#8e3520",
    embleem: "pin",
    uitleg: "Je setting speelt in een tijd: seizoen, dagdeel of jaartal.",
    hint: "Noem een seizoen, dagdeel of jaartal in je setting.",
  },
  {
    id: "zintuigen",
    titel: "Zintuigen erbij",
    kleur: "#3f8a5a",
    kleurDonker: "#2b6140",
    embleem: "bolt",
    uitleg: "Je bouwstenen prikkelen meer dan alleen het zicht.",
    hint: "Gebruik woorden als 'hoor', 'voel', 'ruik' of 'smaak'.",
  },
  {
    id: "conflict",
    titel: "Helder conflict",
    kleur: "#6b4a9e",
    kleurDonker: "#4a3370",
    embleem: "target",
    uitleg: "Er staat iets duidelijks in de weg — dat maakt het spannend.",
    hint: "Beschrijf je conflict in meer dan 20 tekens.",
  },
  {
    id: "rijk",
    titel: "Rijke context",
    kleur: "#b8832a",
    kleurDonker: "#805a1c",
    embleem: "book",
    uitleg: "Bijna al je bouwstenen zijn uitgewerkt met detail.",
    hint: "Vul vijf bouwstenen in met minstens 40 tekens per stuk.",
  },
  {
    id: "eigen",
    titel: "Eigen zinnen",
    kleur: "#1f5a68",
    kleurDonker: "#143e48",
    embleem: "path",
    uitleg: "Je hebt meer dan 100 woorden van je eigen verhaal geschreven.",
    hint: "Schrijf in stap 2 minstens 100 woorden.",
  },
];

export function berekenBadgeIds(
  bouwstenen: Record<string, string>,
  verhaalTekst: string,
): Set<BadgeId> {
  const ids = new Set<BadgeId>();
  const alles = Object.values(bouwstenen).join(" ").toLowerCase();

  if (bouwstenen["1"] && /\d/.test(bouwstenen["1"])) ids.add("personage");
  if (
    bouwstenen["2"] &&
    /\d{4}|jaar|herfst|winter|lente|zomer|ochtend|avond|nacht/.test(
      bouwstenen["2"].toLowerCase(),
    )
  )
    ids.add("tijd");
  if (/hoor|geluid|zien|voel|ruik|smaak/.test(alles)) ids.add("zintuigen");
  if (bouwstenen["4"] && bouwstenen["4"].length > 20) ids.add("conflict");
  if (
    Object.values(bouwstenen).filter((v) => v && v.length > 40).length >= 5
  )
    ids.add("rijk");
  if (verhaalTekst.split(/\s+/).filter(Boolean).length > 100)
    ids.add("eigen");

  return ids;
}
