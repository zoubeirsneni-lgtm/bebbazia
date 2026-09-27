"use client";

import Image from "next/image";
import { Leaf, Clock, Phone, ShoppingBag, MapPinned, UserCog, ChefHat, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SiteHeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenTracking: () => void;
  onOpenKitchen: () => void;
  onOpenDriver: () => void;
  onGoHome: () => void;
}

export function SiteHeader({ cartCount, onOpenCart, onOpenTracking, onOpenKitchen, onOpenDriver, onGoHome }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <button type="button" onClick={onGoHome} className="flex shrink-0 items-center gap-2.5" aria-label="BEBBA Healthy Food — accueil">
          <Image src="/logo.svg" alt="Logo BEBBA Healthy Food" width={38} height={38} priority />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight text-primary">BEBBA</span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:block">
              Healthy Food
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
          <a href="#menu" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
            Menu
          </a>
          <a href="#categories" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
            Catégories
          </a>
          <a href="#concept" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
            Le concept
          </a>
          <button
            type="button"
            onClick={onOpenTracking}
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
          >
            Suivre ma commande
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus:outline-none"
              aria-label="Espace équipe"
            >
              <UserCog className="h-4 w-4" aria-hidden />
              Équipe
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Espace équipe</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenKitchen} className="gap-2">
                <ChefHat className="h-4 w-4 text-primary" aria-hidden />
                Cuisine (KDS)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenDriver} className="gap-2">
                <Bike className="h-4 w-4 text-primary" aria-hidden />
                Espace livreur
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground lg:flex">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Lun–Dim · 11h00 – 22h30
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:bg-secondary md:hidden"
              aria-label="Espace équipe"
            >
              <UserCog className="h-4 w-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Espace équipe</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenKitchen} className="gap-2">
                <ChefHat className="h-4 w-4 text-primary" aria-hidden />
                Cuisine (KDS)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenDriver} className="gap-2">
                <Bike className="h-4 w-4 text-primary" aria-hidden />
                Espace livreur
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={onOpenTracking}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:bg-secondary md:hidden"
            aria-label="Suivre ma commande"
          >
            <MapPinned className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onOpenCart}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:bg-secondary"
            aria-label={`Ouvrir le panier${cartCount > 0 ? ` (${cartCount} article${cartCount > 1 ? "s" : ""})` : ""}`}
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground shadow">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>
          <Button
            className="rounded-full font-semibold shadow-sm"
            onClick={onOpenCart}
            aria-label={`Commander${cartCount > 0 ? ` (${cartCount} articles au panier)` : ""}`}
          >
            <Leaf className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Commander</span>
          </Button>
          <a
            href="tel:+216000000"
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:bg-secondary sm:flex md:hidden"
            aria-label="Appeler BEBBA"
          >
            <Phone className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
    </header>
  );
}
