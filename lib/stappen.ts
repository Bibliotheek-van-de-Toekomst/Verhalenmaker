export type Bouwsteen = {
  n: number;
  titel: string;
  hint: string;
  voorbeeld: string;
};

export const BIB_STAPPEN: Bouwsteen[] = [
  {
    n: 1,
    titel: "Personage",
    hint: "Wie is je hoofdpersoon? Geef een naam, leeftijd, één kracht en één zwakte.",
    voorbeeld: "Mira, 14 jaar. Nieuwsgierig en slim. Durft niet te zwemmen.",
  },
  {
    n: 2,
    titel: "Setting",
    hint: "Waar en wanneer speelt het verhaal? Wat voor sfeer hangt er?",
    voorbeeld: "Een Zeeuws dorp in de herfst. Mistig en heel stil.",
  },
  {
    n: 3,
    titel: "Doel",
    hint: "Wat wil je personage het liefst bereiken of vinden?",
    voorbeeld: "Mira wil ontdekken van wie de oude sleutel is die ze gevonden heeft.",
  },
  {
    n: 4,
    titel: "Conflict",
    hint: "Wat staat in de weg? Iets van buiten of iets in je personage zelf.",
    voorbeeld: "Om bij het antwoord te komen moet ze door het diepe water.",
  },
  {
    n: 5,
    titel: "Verhaallijn",
    hint: "Begin, midden, einde — in drie korte zinnen.",
    voorbeeld: "Mira vindt een sleutel. Ze zoekt de eigenaar. Ze moet haar angst overwinnen.",
  },
  {
    n: 6,
    titel: "Genre",
    hint: "Wat voor soort verhaal is dit? Welk gevoel krijgt de lezer?",
    voorbeeld: "Mysterie met een magisch randje.",
  },
];

export const BOUWSTEEN_ICON: Record<number, string> = {
  1: "person",
  2: "pin",
  3: "target",
  4: "bolt",
  5: "path",
  6: "tag",
};

export const WAAROM: Record<number, string> = {
  1: "Een personage heeft een naam, een leeftijd, een kracht én een zwakte. Die zwakte maakt het verhaal spannend.",
  2: "Setting is meer dan alleen een plek. Tijd, weer en geluid maken het beeld levendig.",
  3: "Zonder duidelijk doel weet je lezer niet waar het verhaal heen gaat. Schrijf op wat je personage wil.",
  4: "Conflict is wat in de weg staat. Zonder tegenstand geen spanning.",
  5: "Begin, midden, einde — in drie korte zinnen. Dan heeft je verhaal een duidelijke richting.",
  6: "Genre stuurt de sfeer. De lezer weet meteen in wat voor verhaal hij zit.",
};
