#!/usr/bin/env bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════╗${RESET}"
echo -e "${BOLD}║       CaratFlow ERP · CRM        ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════╝${RESET}"
echo ""

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌  Docker is not running. Start it first:"
  echo "    sudo systemctl start docker"
  exit 1
fi

echo -e "${CYAN}▶  Building and starting all services…${RESET}"
echo -e "${YELLOW}   (first build takes 3-5 minutes, subsequent starts are instant)${RESET}"
echo ""

docker compose up --build -d

echo ""
echo -e "${CYAN}▶  Waiting for services to be healthy…${RESET}"

# Wait for backend
echo -n "   Backend  "
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/api/v1/health > /dev/null 2>&1; then
    echo -e " ${GREEN}✓${RESET}"
    break
  fi
  echo -n "."
  sleep 2
done

echo ""
echo -e "${GREEN}${BOLD}✅  CaratFlow is running!${RESET}"
echo ""
echo -e "   ${BOLD}Frontend:${RESET}   http://localhost:3000"
echo -e "   ${BOLD}Backend:${RESET}    http://localhost:8080"
echo -e "   ${BOLD}Database:${RESET}   localhost:5432  (caratflow / caratflow_local)"
echo ""
echo -e "   ${BOLD}Login credentials:${RESET}"
echo -e "   Email:     ${CYAN}admin@caratflow.com${RESET}"
echo -e "   Password:  ${CYAN}admin123${RESET}"
echo ""
echo -e "   ${YELLOW}To stop:  docker compose down${RESET}"
echo -e "   ${YELLOW}To logs:  docker compose logs -f${RESET}"
echo ""
