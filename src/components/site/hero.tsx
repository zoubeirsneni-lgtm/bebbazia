import { ArrowDown, Leaf, ChefHat, Bike, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      {/* Décor d'arrière-plan */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-secondary blur-3xl" />
        <div className="absolute -right-32 top-16 h-96 w-96 rounded-full bg-accent/60 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-secondary/70 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-5 max-w-full whitespace-normal rounded-full px-4 py-1.5 text-center text-xs font-semibold tracking-wide">
            <Leaf className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Préparé après votre commande — jamais à l&apos;avance
          </Badge>

          <h1 id="hero-title" className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Vos Plats santé{" "}
            <span className="text-primary">en un clic</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            BEBBA cuisine des repas équilibrés à base d&apos;ingrédients frais, puis les livre
            encore chauds à votre porte. Healthy, grillades, menus enfants, jus détox et
            programmes de 30 jours : mangez mieux sans lever le petit doigt.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-8 text-base font-semibold shadow-md">
              <a href="#menu">
                Découvrir le menu
                <ArrowDown className="ml-2 h-4 w-4" aria-hidden />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-8 text-base font-semibold">
              <a href="#concept">Le concept BEBBA</a>
            </Button>
          </div>
        </div>

        <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: ChefHat, dt: "Cuisine à la commande", dd: "Chaque plat est préparé uniquement après votre commande." },
            { icon: HeartPulse, dt: "Équilibré & transparent", dd: "Composition, allergènes et valeurs nutritionnelles affichés." },
            { icon: Bike, dt: "Livraison soignée", dd: "Suivi en temps réel du départ de la cuisine jusqu'à chez vous." },
          ].map(({ icon: Icon, dt, dd }) => (
            <div key={dt} className="rounded-2xl border border-border/70 bg-card/80 p-5 text-center shadow-sm backdrop-blur">
              <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <dt className="text-sm font-semibold text-foreground">{dt}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{dd}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
