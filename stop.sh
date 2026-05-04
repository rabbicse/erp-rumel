#!/usr/bin/env bash
echo "Stopping CaratFlow…"
docker compose down
echo "Done. Data is preserved in the postgres_data volume."
echo "To also delete all data: docker compose down -v"
