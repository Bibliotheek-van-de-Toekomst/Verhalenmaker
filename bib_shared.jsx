// Bibliotheek-huisstijl tokens voor variant_bibliotheek
// Strikt: wit, beige (#fde5d0), antraciet (#39373a). Oranje (#ec7404) ALLEEN in logo.
// Kleine goedgekeurde afwijkingen:
// - scores: donker-oranje (vaag) + groen (levendig) voor toegankelijkheid
// - coach-bubble: beige; jouw-bubble: wit — contrast zonder extra kleur
// - pulse op auto-save dot
// - handgetekend underline-accent onder merknaam (antraciet)
// Typografie: The Mix (koppen) + Arial (broodtekst). Links uitlijnen. Letterhoogte : interlinie = 1 : 1.2

const BIB = {
  wit:         '#ffffff',
  beige:       '#fde5d0',        // PMS P 24-10 C — achtergrondkleur voor secundaire content
  beigeSoft:   '#fef3e6',        // lichtere beige voor subtiele tinten
  antraciet:   '#39373a',        // PMS 426 C — hoofdtekstkleur
  antracietSoft:'#6a6870',       // secundaire tekst
  oranje:      '#ec7404',        // PMS 021 C — ALLEEN logo-vignet
  line:        '#e5ddd1',        // lijnkleur — beige-tinted, niet grijs

  // Toegankelijkheidssignalen (goedgekeurde afwijkingen)
  vaag:        '#c64a2e',        // donker oranje-rood voor "te vaag" score
  levendig:    '#3f8a5a',        // groen voor "levendig" score

  // Type stacks
  kop:         '"The Mix", "TheMixOT", Georgia, serif',  // The Mix Semi Light/Regular
  tekst:       'Arial, Helvetica, sans-serif',           // broodtekst + bijschriften
};

// De 5 pijlers van de Bibliotheek
const PIJLERS = ['Ontmoet', 'Vraag', 'Lees', 'Doe', 'Leer'];
const ACTIEVE_PIJLER = 'Lees';

// Bouwstenen — zelfde inhoud, nieuwe copy-tone (actief/positief, jij-vorm)
const BIB_STAPPEN = [
  { n: 1, titel: 'Personage',   hint: 'Wie is je hoofdpersoon? Geef een naam, leeftijd, één kracht en één zwakte.',
    voorbeeld: 'Mira, 14 jaar. Nieuwsgierig en slim. Durft niet te zwemmen.' },
  { n: 2, titel: 'Setting',     hint: 'Waar en wanneer speelt het verhaal? Wat voor sfeer hangt er?',
    voorbeeld: 'Een Zeeuws dorp in de herfst. Mistig en heel stil.' },
  { n: 3, titel: 'Doel',        hint: 'Wat wil je personage het liefst bereiken of vinden?',
    voorbeeld: 'Mira wil ontdekken van wie de oude sleutel is die ze gevonden heeft.' },
  { n: 4, titel: 'Conflict',    hint: 'Wat staat in de weg? Iets van buiten of iets in je personage zelf.',
    voorbeeld: 'Om bij het antwoord te komen moet ze door het diepe water.' },
  { n: 5, titel: 'Verhaallijn', hint: 'Begin, midden, einde — in drie korte zinnen.',
    voorbeeld: 'Mira vindt een sleutel. Ze zoekt de eigenaar. Ze moet haar angst overwinnen.' },
  { n: 6, titel: 'Genre',       hint: 'Wat voor soort verhaal is dit? Welk gevoel krijgt de lezer?',
    voorbeeld: 'Mysterie met een magisch randje.' },
];

// Bibliotheek-logo placeholder (SVG)
// Gebaseerd op het woordbeeld-principe: "de" + "Bibliotheek" met vignet.
// LMC vervangt dit met het echte asset van landelijkehuisstijl.nl.
const BibLogo = ({ subnaam, height = 34 }) => {
  const w = subnaam ? 148 : 134;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, fontFamily: BIB.kop }}>
      <svg width={w} height={height} viewBox={`0 0 ${w} 34`} style={{ display: 'block' }}>
        {/* Woordbeeld — placeholder typografie */}
        <text x="0" y="25" fontFamily="Georgia, serif" fontSize="22" fontWeight="400" fill={BIB.antraciet} letterSpacing="-0.3">
          <tspan fontStyle="italic" fontWeight="500">de</tspan> <tspan fontWeight="600">Bibliotheek</tspan>
        </text>
        {/* Vignet (plectrum-vorm simplificatie) — oranje */}
        <g transform={`translate(${w - 22}, 4)`}>
          <path d="M0 18 Q 0 0, 18 0 Q 18 10, 18 18 Q 9 18, 0 18 Z" fill={BIB.oranje}/>
          <path d="M3 4 Q 3 3, 4 3 L 14 3 Q 15 3, 15 4 L 15 6 Q 15 7, 14 7 L 4 7 Q 3 7, 3 6 Z"
            fill={BIB.oranje} opacity="0.4"/>
        </g>
      </svg>
      {subnaam && (
        <span style={{
          fontFamily: BIB.kop, fontSize: Math.round(height * 0.42),
          color: BIB.antraciet, fontWeight: 600, lineHeight: 1, paddingBottom: 2,
          letterSpacing: 0.2,
        }}>{subnaam}</span>
      )}
    </div>
  );
};

// Pijler-rij: 5 pijlers als pills, actieve pijler = wit op antraciet
const PijlerRij = ({ actief = ACTIEVE_PIJLER, klein = false }) => (
  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
    {PIJLERS.map(p => {
      const isActief = p === actief;
      return (
        <div key={p} style={{
          padding: klein ? '4px 11px' : '6px 14px',
          borderRadius: 99,
          background: isActief ? BIB.wit : 'transparent',
          color: BIB.antraciet,
          fontFamily: BIB.kop,
          fontSize: klein ? 11 : 12.5,
          fontWeight: isActief ? 600 : 400,
          letterSpacing: 0.1,
          border: isActief ? 'none' : `1px solid transparent`,
          opacity: isActief ? 1 : 0.65,
        }}>{p}</div>
      );
    })}
  </div>
);

// Handgetekende onderstreping voor merknaam
const KrullUnder = ({ width = 120, color = BIB.antraciet }) => (
  <svg width={width} height="8" viewBox={`0 0 ${width} 8`} style={{ display: 'block', marginTop: 2 }}>
    <path d={`M 2 4 Q ${width*0.2} 7, ${width*0.4} 3 T ${width*0.75} 4 T ${width - 3} 4`}
      stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
  </svg>
);

// Simpel icon set — zelfde glyphs, maar antraciet als default
const BibIcon = ({ name, size = 20, color = BIB.antraciet, stroke = 1.7 }) => {
  const paths = {
    send:    <path d="M4 12l16-8-6 16-2-7-8-1z" />,
    book:    <path d="M4 5a2 2 0 012-2h14v16H6a2 2 0 00-2 2V5zM20 3v16" />,
    check:   <path d="M5 12l4 4 10-10" />,
    plus:    <path d="M12 5v14M5 12h14" />,
    arrow:   <path d="M5 12h14m-6-6l6 6-6 6" />,
    chat:    <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4V6z" />,
    paper:   <path d="M6 3h9l4 4v14H6V3zm9 0v4h4" />,
    user:    <g><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5"/></g>,
    close:   <path d="M6 6l12 12M18 6l-12 12" />,
    key:     <g><circle cx="8" cy="14" r="4"/><path d="M11 12l9-9m-4 0l4 0 0 4M15 7l3 3"/></g>,
    mail:    <g><rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M3 8l9 6 9-6"/></g>,
    person:  <g><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></g>,
    pin:     <g><path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7z"/><circle cx="12" cy="9" r="2.5"/></g>,
    target:  <g><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill={color} stroke="none"/></g>,
    bolt:    <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
    path:    <path d="M5 19l4-8 5 4 5-10" />,
    tag:     <g><path d="M3 11V3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1.2" fill={color} stroke="none"/></g>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

// Bouwsteen-iconen gekoppeld
const BOUWSTEEN_ICON = { 1: 'person', 2: 'pin', 3: 'target', 4: 'bolt', 5: 'path', 6: 'tag' };

Object.assign(window, {
  BIB, BIB_STAPPEN, PIJLERS, ACTIEVE_PIJLER,
  BibLogo, PijlerRij, KrullUnder, BibIcon, BOUWSTEEN_ICON,
});
