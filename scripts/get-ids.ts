// Utilitaire temporaire de test Bloc 2 — récupère des IDs pour curl
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const bowl = await db.product.findUnique({ where: { slug: "bowl-quinoa-poulet" } });
const opt = await db.productOption.findFirst({ where: { productId: bowl!.id, name: { contains: "protéines" } } });
const zone = await db.deliveryZone.findFirst();
console.log(JSON.stringify({ bowl: bowl!.id, opt: opt!.id, zone: zone!.id }));
await db.$disconnect();
