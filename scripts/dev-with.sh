#!/bin/bash
# BEBBA — lance le serveur dev s'il n'écoute pas, attend le port 3000, puis exécute les tests passés en argument
set -u
cd /home/z/my-project

port_ok() { curl -s -o /dev/null --max-time 2 http://localhost:3000/; }

if ! port_ok; then
  echo "── démarrage serveur dev ──"
  bun run dev > /tmp/bebba-dev.log 2>&1 &
  DEV_PID=$!
  # attend jusqu'à 60 s que le port réponde
  for i in $(seq 1 60); do
    if port_ok; then echo "serveur prêt (${i}s)"; break; fi
    sleep 1
  done
  if ! port_ok; then echo "ÉCHEC démarrage serveur"; tail -20 /tmp/bebba-dev.log; exit 1; fi
else
  echo "── serveur déjà en écoute ──"
fi

# exécute le script de test fourni
if [ -n "${1:-}" ]; then
  bash "$1"
fi
