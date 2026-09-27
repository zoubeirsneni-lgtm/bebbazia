#!/bin/bash
# BEBBA — Tests API Bloc 3 : cycle complet cuisine → livreur → suivi
set -u
BASE="http://localhost:3000"
KPIN="2468"
DPIN="1357"

echo "════ 1. Création commande de test ════"
bun -e "
const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient();
p.product.findMany({orderBy:{sortOrder:'asc'},take:2,select:{id:true,slug:true}}).then(async prods=>{
  const zone = await p.deliveryZone.findFirst();
  const res = await fetch('http://localhost:3000/api/orders',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':'b3-test-002'},body:JSON.stringify({items:[{productId:prods[0].id,quantity:2,options:[]},{productId:prods[1].id,quantity:1,options:[]}],phone:'+216981239999',name:'Test Bloc 3',address:'12 Rue de Marseille, Tunis',zoneId:zone.id})});
  const data=await res.json();
  console.log('HTTP',res.status,'|',data.order?.number||data.error,'| token:',data.order?.trackingToken||'-','| total:',data.order?.total);
}).finally(()=>p.\$disconnect())"

echo "════ 2. Stock AVANT consommation ════"
bun -e "
const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient();
p.ingredient.findMany({where:{name:{in:['Blanc de poulet','Quinoa']}},select:{name:true,stockQuantity:true}}).then(r=>console.log(JSON.stringify(r))).finally(()=>p.\$disconnect())"

ORDER_ID=$(bun -e "
const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient();
p.order.findFirst({where:{customerPhone:'00216981239999'},orderBy:{createdAt:'desc'},select:{id:true,number:true,status:true}}).then(o=>{console.log(o.id);}).finally(()=>p.\$disconnect())")
echo "→ commande: $ORDER_ID"

echo "════ 3. Transition received→preparing (consommation stock) ════"
curl -s -X POST "$BASE/api/staff/orders/$ORDER_ID/status" -H "Content-Type: application/json" -H "x-staff-pin: $KPIN" -d '{"to":"preparing"}' | head -c 600
echo

echo "════ 4. IDEMPOTENCE : répétition de la même transition ════"
curl -s -X POST "$BASE/api/staff/orders/$ORDER_ID/status" -H "Content-Type: application/json" -H "x-staff-pin: $KPIN" -d '{"to":"preparing"}' | head -c 300
echo

echo "════ 5. Stock APRÈS (doit être décrémenté UNE fois) ════"
bun -e "
const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient();
Promise.all([p.ingredient.findMany({where:{name:{in:['Blanc de poulet','Quinoa']}},select:{name:true,stockQuantity:true}}),p.stockMovement.findMany({where:{orderId:'$ORDER_ID'},select:{ingredientId:true,quantityMilliUnits:true,type:true}})]).then(([ing,mv])=>console.log('stock:',JSON.stringify(ing),'mouvements:',mv.length)).finally(()=>p.\$disconnect())"

echo "════ 6. Transition interdite : received→delivered (sur une autre commande ?) → on teste preparing→delivered ════"
curl -s -X POST "$BASE/api/staff/orders/$ORDER_ID/status" -H "Content-Type: application/json" -H "x-staff-pin: $KPIN" -d '{"to":"delivered"}' | head -c 250
echo

echo "════ 7. preparing→ready puis ready→waiting_for_driver ════"
curl -s -X POST "$BASE/api/staff/orders/$ORDER_ID/status" -H "Content-Type: application/json" -H "x-staff-pin: $KPIN" -d '{"to":"ready"}' | head -c 200; echo
curl -s -X POST "$BASE/api/staff/orders/$ORDER_ID/status" -H "Content-Type: application/json" -H "x-staff-pin: $KPIN" -d '{"to":"waiting_for_driver"}' | head -c 200
echo

echo "════ 8. PIN mauvais → 401 ════"
curl -s -o /dev/null -w "HTTP: %{http_code}\n" -X POST "$BASE/api/staff/orders/$ORDER_ID/status" -H "Content-Type: application/json" -H "x-staff-pin: 9999" -d '{"to":"preparing"}'

echo "════ 9. Livreur : file + acceptation ════"
DRIVER_ID=$(curl -s "$BASE/api/driver/drivers" | bun -e "const d=await new Response(Bun.stdin.stream()).text(); const j=JSON.parse(d); console.log(j.drivers[0].id)")
curl -s "$BASE/api/driver/orders" -H "x-staff-pin: $DPIN" -H "x-driver-id: $DRIVER_ID" | head -c 250; echo
curl -s -X POST "$BASE/api/driver/orders" -H "Content-Type: application/json" -H "x-staff-pin: $DPIN" -H "x-driver-id: $DRIVER_ID" -d "{\"orderId\":\"$ORDER_ID\",\"action\":\"accept\"}" | head -c 200
echo

echo "════ 10. GPS 10 s : 1re position OK, 2e immédiate → throttled ════"
curl -s -X POST "$BASE/api/driver/location" -H "Content-Type: application/json" -H "x-staff-pin: $DPIN" -H "x-driver-id: $DRIVER_ID" -d '{"lat":36.8012,"lng":10.1801,"accuracyM":12}' | head -c 300; echo
curl -s -w "\nHTTP: %{http_code}\n" -X POST "$BASE/api/driver/location" -H "Content-Type: application/json" -H "x-staff-pin: $DPIN" -H "x-driver-id: $DRIVER_ID" -d '{"lat":36.8015,"lng":10.1803}' | head -c 300

echo "════ 11. Suivi client : position livreur visible pendant delivering ════"
bun -e "
const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient();
p.order.findUnique({where:{id:'$ORDER_ID'},select:{trackingToken:true}}).then(async o=>{
  const res=await fetch('http://localhost:3000/api/track?token='+o.trackingToken);
  const d=await res.json();
  console.log('statut:',d.order.status,'| liveTracking:',JSON.stringify(d.order.liveTracking));
}).finally(()=>p.\$disconnect())"

echo "════ 12. Livré : delivering→delivered + COD reste to_collect ════"
curl -s -X POST "$BASE/api/driver/orders" -H "Content-Type: application/json" -H "x-staff-pin: $DPIN" -H "x-driver-id: $DRIVER_ID" -d "{\"orderId\":\"$ORDER_ID\",\"action\":\"delivered\"}" | head -c 300; echo
bun -e "
const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient();
p.order.findUnique({where:{id:'$ORDER_ID'},select:{status:true,paymentStatus:true,deliveryAttempts:true}}).then(o=>console.log('→',JSON.stringify(o))).finally(()=>p.\$disconnect())"

echo "════ 13. Suivi après delivered : liveTracking DOIT être null (fin GPS #133) ════"
bun -e "
const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient();
p.order.findUnique({where:{id:'$ORDER_ID'},select:{trackingToken:true}}).then(async o=>{
  const res=await fetch('http://localhost:3000/api/track?token='+o.trackingToken);
  const d=await res.json();
  console.log('liveTracking:',JSON.stringify(d.order.liveTracking));
}).finally(()=>p.\$disconnect())"

echo "════ 14. Événements de la chronologie (CDC #63) ════"
bun -e "
const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient();
p.orderEvent.findMany({where:{orderId:'$ORDER_ID'},orderBy:{createdAt:'asc'},select:{type:true,toStatus:true,note:true}}).then(ev=>ev.forEach(e=>console.log(' -',e.type,'|',e.toStatus||'','|',(e.note||'').substring(0,80)))).finally(()=>p.\$disconnect())"
