// Shared design tokens — direction artistique ØRE.
// Les valeurs vivent dans src/index.css sous forme de variables CSS, avec un
// jeu clair et un jeu sombre (le mode suit prefers-color-scheme). Ici on ne
// fait que pointer vers ces variables, donc tout composant qui lit `C.*`
// bascule automatiquement clair / sombre.
//
// Mineral surfaces retain the brand palette. Secondary text and control
// outlines use stronger contrast in both system color schemes.
// Typography: Space Grotesk (UI), Space Mono (measurements).
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
