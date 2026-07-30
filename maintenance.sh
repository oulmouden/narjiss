#!/usr/bin/env bash
#
# maintenance.sh — bascule narjiss.company en maintenance (ON/OFF) en une commande.
#
# Cible : VPS nginx (CloudPanel). La maintenance repose sur un fichier drapeau
# « .maintenance » dans le docroot, testé par une règle nginx ajoutée UNE fois
# (voir maintenance.nginx.conf). Basculer = créer/supprimer ce fichier :
# AUCUN reload nginx, donc aucun risque de casser le site.
#
# Usage :
#   bash maintenance.sh on       # active la maintenance (HTTP 503 + maintenance.html)
#   bash maintenance.sh off      # remet le site en ligne
#   bash maintenance.sh status   # affiche l'état + le code HTTP
#
# Pré-requis (une seule fois) : coller le bloc de maintenance.nginx.conf dans le
# vhost nginx du site (idéalement via l'éditeur Vhost de CloudPanel).
set -euo pipefail

# ============ CONFIG ========================================================
VPS="${NARJISS_VPS:-root@narjiss.company}"
WEBROOT="${NARJISS_WEBROOT:-/home/narjiss/htdocs/www.narjiss.company}"
URL="${NARJISS_URL:-https://www.narjiss.company}"
# ===========================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAGE="$SCRIPT_DIR/maintenance.html"
FLAG="$WEBROOT/.maintenance"

die(){ echo "ERREUR: $*" >&2; exit 1; }

http_code(){ curl -s -o /dev/null -w "%{http_code}" "$URL"; }

case "${1:-}" in
  on)
    [ -f "$PAGE" ] || die "maintenance.html introuvable à côté du script."
    echo "> Envoi de maintenance.html ..."
    scp -q "$PAGE" "$VPS:$WEBROOT/maintenance.html"
    echo "> Création du drapeau .maintenance ..."
    ssh "$VPS" "touch '$FLAG'"
    code="$(http_code)"
    echo "Code HTTP : $code"
    if [ "$code" = "503" ]; then
      echo "  -> maintenance ACTIVÉE."
    else
      echo "  ⚠️ Attendu 503 mais obtenu $code. La règle nginx n'est probablement"
      echo "     pas encore installée dans le vhost — voir maintenance.nginx.conf."
    fi
    ;;

  off)
    echo "> Suppression du drapeau .maintenance ..."
    ssh "$VPS" "rm -f '$FLAG'"
    code="$(http_code)"
    echo "Code HTTP : $code"
    [ "$code" = "503" ] && echo "  ⚠️ Encore 503 — vérifiez le drapeau/cache." \
                        || echo "  -> site EN LIGNE (maintenance désactivée)."
    ;;

  status)
    echo "> État du drapeau sur le VPS :"
    ssh "$VPS" "test -f '$FLAG' && echo '  drapeau présent (maintenance ACTIVÉE)' || echo '  pas de drapeau (site en ligne)'"
    echo "Code HTTP : $(http_code)"
    ;;

  *)
    echo "Usage: bash maintenance.sh {on|off|status}"
    exit 1
    ;;
esac
