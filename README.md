# BEBBA Healthy Food 🥗

Application web de restaurant en ligne — « Vos Plats santé en un clic ».

Commande en ligne (invité), personnalisation des plats, paiement **COD** (espèces à la livraison) et suivi de commande en temps réel via un code de suivi à 8 caractères.

## Stack (100 % gratuite)

| Composant | Choix |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui |
| Base de données | Prisma ORM (SQLite en dev → Postgres Supabase Free en prod) |
| Panier | Zustand (persistant, localStorage) |
| Cartographie (Bloc 3) | Leaflet + OpenStreetMap + Nominatim |
| Hébergement | Vercel Hobby |

## Démarrage local

```bash
# 1. Installer les dépendances
bun install        # ou npm install

# 2. Configurer la base de données
cp .env.example .env

# 3. Créer le schéma
bun run db:push

# 4. Peupler la base (catégories, produits, options, zones, réglages, commande démo)
bun scripts/seed.ts
bun scripts/seed-bloc2.ts

# 5. Lancer le serveur
bun run dev        # http://localhost:3000
```

> Commande de démonstration pour tester le suivi : numéro **BEB-1047**, code de suivi `tk_bebba_1047_demo` (statut « delivering » avec chronologie complète).

## Fonctionnalités livrées

### Bloc 1 — Fondations & vitrine
- Vitrine publique : hero, concept, menu par catégories (Healthy, Grillades, Enfants, Jus détox, Régime 30 jours)
- Fiche produit : composition, nutrition, allergènes, prix (TND, stockés en millimes)
- Visuels placeholders SVG élégants (remplaçables par de vraies photos)

### Bloc 2 — Panier, personnalisation, commande COD, suivi
- **Deux parcours unifiés** : bouton *Commander* (sélection rapide) et *Personnaliser* (configurateur complet) — même moteur interne
- **Configurateur** : options avec suppléments, limites de quantité par option, recalcul du prix en direct
- **Panier** : lignes distinguant chaque personnalisation, quantités, sous-total (persistant entre visites)
- **Checkout invité** : téléphone normalisé (+216), nom facultatif, adresse + instructions, zone de livraison
- **Commande COD** : aucun paiement en ligne, statut paiement `to_collect`
- **Sécurité serveur** : recalcul intégral des prix depuis la base (jamais confiance au client), validation zod, disponibilité produits/options vérifiée
- **Idempotence** : en-tête `Idempotency-Key` — un double-clic ne crée jamais deux commandes
- **Confirmation** : numéro officiel `BEB-XXXX` + code de suivi à 8 caractères (copiable, mémorisé localement)
- **Suivi public** : recherche par code, chronologie des statuts avec la casse exacte du cycle de vie (`received → preparing → ready → waiting_for_driver → delivering → delivered / cancelled`), rafraîchissement auto 15 s

## API

| Route | Méthode | Rôle |
|---|---|---|
| `/api/orders` | POST | Création de commande (validation, recalcul serveur, idempotence) |
| `/api/track` | GET | Suivi par code à 8 caractères (sans données personnelles) |

## Structure

```
prisma/schema.prisma        # Schéma DB documenté (CDC §197) : catalogue, options, commandes, événements
scripts/seed.ts             # Catégories + produits
scripts/seed-bloc2.ts       # Options, zone, réglages, commande démo
src/app/page.tsx            # Vitrine + orchestration des vues
src/app/api/                # Orders, track
src/components/site/        # UI : configurateur, panier, checkout, confirmation, suivi
src/lib/                    # Métier : machine d'état, panier, prix, téléphone, tokens
docs/cahier_des_charges.txt # Spécification complète de référence
```

## Conventions métier

- **Prix** : millimes entiers (ex. `16500` = 16,500 DT) — précision financière déterministe
- **Statuts commande** : casse exacte imposée, transitions contrôlées côté serveur
- **Langue** : français ; **devise** : TND
- **Traçabilité** : chaque commande conserve un journal d'événements horodaté

## Roadmap

- [x] Bloc 1 — Fondations, DB, design, vitrine
- [x] Bloc 2 — Panier, personnalisation, commande COD, suivi client
- [ ] Bloc 3 — KDS cuisine (machine d'état + stock idempotent), espace livreur GPS (10 s / historique 72 h), carte OpenStreetMap
- [ ] Bloc 4 — Admin, rôles & permissions, journal d'audit
- [ ] Bloc 5 — Réclamations + notifications in-app
- [ ] Blocs 6-7 — Stock complet
- [ ] Bloc 8 — Promotions cumulées
