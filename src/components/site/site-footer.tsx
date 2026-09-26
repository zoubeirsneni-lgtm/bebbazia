import Image from "next/image";
import { Leaf, MapPin, Phone, Mail, Clock } from "lucide-react";

export function SiteFooter() {
  return (
    <footer id="contact" className="mt-auto border-t border-border/60 bg-card" aria-labelledby="footer-title">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Image src="/logo.svg" alt="Logo BEBBA Healthy Food" width={40} height={40} />
              <span className="flex flex-col leading-none">
                <span className="text-lg font-extrabold tracking-tight text-primary">BEBBA</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Healthy Food
                </span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              <span id="footer-title" className="font-semibold text-foreground">
                « Vos Plats santé en un clic »
              </span>
              <br />
              Des repas équilibrés préparés après commande et livrés chez vous, dans le
              respect de la fraîcheur et de la transparence nutritionnelle.
            </p>
          </div>

          <nav aria-label="Liens du site">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Navigation</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a className="text-muted-foreground transition-colors hover:text-primary" href="#menu">Menu</a></li>
              <li><a className="text-muted-foreground transition-colors hover:text-primary" href="#categories">Catégories</a></li>
              <li><a className="text-muted-foreground transition-colors hover:text-primary" href="#concept">Le concept</a></li>
            </ul>
          </nav>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>Adresse du restaurant — à confirmer</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <a href="tel:+216000000" className="transition-colors hover:text-primary">+216 00 000 000</a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <a href="mailto:contact@bebba.tn" className="transition-colors hover:text-primary">contact@bebba.tn</a>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>Lundi – Dimanche · 11h00 – 22h30</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p className="flex items-center gap-1.5">
            <Leaf className="h-3.5 w-3.5 text-primary" aria-hidden />
            © {new Date().getFullYear()} BEBBA Healthy Food — Tous droits réservés
          </p>
          <p>Paiement à la livraison (COD) · Suivi de commande en temps réel</p>
        </div>
      </div>
    </footer>
  );
}
