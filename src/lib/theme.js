// Shared design tokens — direction artistique ØRE.
// Les valeurs vivent dans src/index.css sous forme de variables CSS, avec un
// jeu clair et un jeu sombre (le mode suit prefers-color-scheme). Ici on ne
// fait que pointer vers ces variables, donc tout composant qui lit `C.*`
// bascule automatiquement clair / sombre.
//
// Palettes exactes
//   LIGHT  bg #EFEFEC · surface #F7F7F4 · primary #292A29 · secondary #858681
//          tertiary #A9AAA5 · border #D5D5D0 · signal #7CCBC6
//   DARK   bg #414246 · surface #48494D · primary #F0EFEB · secondary #A6A6A2
//          tertiary #85868A · border #595A5E · signal #7CCBC6
// Typo : Space Grotesk (titres / UI) · Space Mono (données / chiffres)
export const C = {
  bg: "var(--c-bg)",
  surface: "var(--c-surface)",
  surfaceRaised: "var(--c-surface-raised)",
  line: "var(--c-line)", // Border
  text: "var(--c-text)", // Primary
  textDim: "var(--c-text-dim)", // Secondary
  textFaint: "var(--c-text-faint)", // Tertiary
  amber: "var(--c-signal)", // Signal — action principale & accent
  signalInk: "var(--c-signal-ink)", // encre foncée posée SUR le signal
  steel: "var(--c-steel)", // neutre secondaire
  rust: "var(--c-rust)", // rouge sobre — destructif / records
  moss: "var(--c-signal)", // Signal — succès / série validée
  water: "var(--c-water)", // neutre — objectif hydratation
};
