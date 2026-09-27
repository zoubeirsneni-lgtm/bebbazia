// Nettoyage des commandes de test Bloc 2 (enfants d'abord — contraintes FK)
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const targets = await db.order.findMany({ where: { number: { in: ["BEB-1048", "BEB-1049"] } }, select: { id: true } });
const ids = targets.map((o) => o.id);
const ev = await db.orderEvent.deleteMany({ where: { orderId: { in: ids } } });
const it = await db.orderItem.deleteMany({ where: { orderId: { in: ids } } });
const or = await db.order.deleteMany({ where: { id: { in: ids } } });
console.log(`Événements: ${ev.count}, lignes: ${it.count}, commandes: ${or.count}`);
await db.$disconnect();
