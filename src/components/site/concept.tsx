import { ChefHat, ShieldCheck, MapPin } from "lucide-react";

const STEPS = [
  {
    icon: ChefHat,
    step: "1",
    title: "Vous commandez",
    text: "Choisissez vos plats, personnalisez-les (supplément de protéines, légumes en plus…) et validez votre panier.",
  },
  {
    icon: ShieldCheck,
    step: "2",
    title: "Nous préparons",
    text: "Votre commande passe en cuisine dès validation. Rien n'est préparé à l'avance : tout est cuisiné pour vous, au moment de votre commande.",
  },
  {
    icon: MapPin,
    step: "3",
    title: "Vous suivez la livraison",
    text: "Un code de suivi vous est remis : observez la progression de votre commande, puis la position du livreur jusqu'à votre porte. Vous payez à la livraison.",
  },
];

export function Concept() {
  return (
    <section id="concept" className="scroll-mt-20 bg-secondary/50" aria-labelledby="concept-title">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Le concept</p>
          <h2 id="concept-title" className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Frais, équilibré, livré — en trois étapes
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-muted-foreground">
            Le principe BEBBA est simple : de vrais repas équilibrés, cuisinés uniquement
            après votre commande, et un paiement à la livraison en toute confiance.
          </p>
        </div>

        <ol className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, step, title, text }) => (
            <li
              key={step}
              className="relative rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
            >
              <span
                className="absolute -top-4 left-6 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground shadow"
                aria-hidden
              >
                {step}
              </span>
              <span className="mb-4 mt-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="text-base font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
