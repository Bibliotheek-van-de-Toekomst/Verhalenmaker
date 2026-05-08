// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


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
    titel: "Plek & sfeer",
    hint: "Waar speelt het, wanneer, en wat voor gevoel hangt er?",
    voorbeeld: "Een verlaten skatepark om middernacht. Nat asfalt, sirenes in de verte.",
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
  2: "Plek, tijd én sfeer maken je verhaal levendig — een schoolaula op vrijdagmiddag voelt heel anders dan een lege parkeergarage 's nachts.",
  3: "Zonder duidelijk doel weet je lezer niet waar het verhaal heen gaat. Schrijf op wat je personage wil.",
  4: "Conflict is wat in de weg staat. Zonder tegenstand geen spanning.",
  5: "Begin, midden, einde — in drie korte zinnen. Dan heeft je verhaal een duidelijke richting.",
  6: "Genre stuurt de sfeer. De lezer weet meteen in wat voor verhaal hij zit.",
};
