"use client";

import Image from "next/image";
import { Clock, PersonStanding } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatTND } from "@/lib/format";
import type { ProductView } from "@/components/site/types";

interface ProductCardProps {
  product: ProductView;
  onOpen: (mode: "order" | "customize") => void;
}

export function ProductCard({ product, onOpen }: ProductCardProps) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-2xl border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={() => onOpen("order")}
        className="relative block aspect-[4/3] w-full overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`Voir le détail de ${product.name}`}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <PersonStanding className="h-10 w-10 text-primary/50" aria-hidden />
          </div>
        )}
        {!product.isAvailable && (
          <Badge className="absolute left-3 top-3 rounded-full bg-destructive text-white shadow">
            Indisponible
          </Badge>
        )}
        <Badge variant="secondary" className="absolute right-3 top-3 gap-1 rounded-full shadow-sm">
          <Clock className="h-3 w-3" aria-hidden />
          {product.prepMinutes} min
        </Badge>
      </button>

      <CardContent className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-base font-bold leading-snug text-foreground">{product.name}</h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {product.description}
        </p>
        <p className="mt-auto pt-1 text-lg font-extrabold text-primary">
          {formatTND(product.price)}
        </p>
      </CardContent>

      <CardFooter className="gap-2 border-t border-border/60 bg-card p-4">
        <Button
          className="h-10 flex-1 rounded-full text-sm font-semibold"
          disabled={!product.isAvailable}
          onClick={() => onOpen("order")}
        >
          Commander
        </Button>
        <Button
          variant="outline"
          className="h-10 flex-1 rounded-full text-sm font-semibold"
          disabled={!product.isAvailable}
          onClick={() => onOpen("customize")}
        >
          Personnaliser
        </Button>
      </CardFooter>
    </Card>
  );
}
