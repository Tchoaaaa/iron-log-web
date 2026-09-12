export const MOTIVATIONAL_QUOTES = [
  "That girl s'entraîne même les jours sans motivation.",
  "Ton corps t'écoute. Parle-lui gentiment, mais sérieusement.",
  "Glow now, rest later.",
  "Une séance de plus, une meilleure version de plus.",
  "La discipline, c'est le nouveau soft girl era.",
  "Tu ne le regretteras jamais après. Jamais.",
  "Pilates princess, mais avec des abdos en béton.",
  "Sois cette fille qui n'annule jamais sa séance.",
  "Ta énergie du matin décide de ta journée.",
  "Petit progrès chaque jour = grande transformation.",
  "Strong is the new soft.",
  "Aujourd'hui, tu t'entraînes pour la toi de demain.",
  "Moins de excuses, plus de séries.",
  "Ton mat t'attend. Lui, il ne juge pas.",
  "Une fille qui s'entraîne est une fille qui s'aime.",
  "Consistency > perfection, toujours.",
  "Le confort ne construit rien. Bouge.",
  "Ce n'est pas une punition, c'est un rendez-vous avec toi-même.",
  "Chaque rep te rapproche de la meilleure toi.",
  "Ton futur toi te remercie déjà.",
  "Soft life, strong body.",
  "On n'a pas de mauvais jours, juste des séances plus courtes.",
  "La routine, c'est le nouveau glow up.",
  "Fais-le pour la fille dans le miroir de demain.",
  "Motivation is temporary, discipline is forever.",
  "Ton corps peut. C'est ton mental qu'il faut convaincre.",
  "Une bonne séance vaut mieux qu'un bon café (presque).",
  "Reste douce avec toi, mais ne saute pas ta séance.",
];

export function dailyQuote(now = new Date()) {
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}
