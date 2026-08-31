#!/usr/bin/env bash
#
# maintenance.sh — bascule narjiss.company en maintenance (ON/OFF) en une commande.
#
# Cible : VPS nginx (CloudPanel). La maintenance repose sur un fichier drapeau
# « .maintenance » dans le docroot, testé par une règle nginx ajoutée UNE fois
# (voir maintenance.nginx.conf). Basculer = créer/supprimer ce fichier :
# AUCUN reload nginx, donc aucun risque de casser le site.
#
# Usage (depuis Git Bash) :
#   bash maintenance.sh on       # active la maintenance (HTTP 503 + maintenance.html)
#   bash maintenance.sh off      # remet le site en ligne
#   bash maintenance.sh status   # affiche l'état + le code HTTP
#
# PAS BESOIN d'être dans le répertoire du dépôt : le script se replace tout seul
# dans son propre dossier (voir « cd "$SCRIPT_DIR" » plus bas). Depuis n'importe
# où, appelez-le par son chemin complet :
#   bash /c/xampp/htdocs/narjiss/maintenance.sh on
#
# Pré-requis (une seule fois) : coller le bloc de maintenance.nginx.conf dans le
# vhost nginx du site (idéalement via l'éditeur Vhost de CloudPanel).
set -euo pipefail

# ============ CONFIG ========================================================
VPS="${NARJISS_VPS:-root@narjiss.company}"
WEBROOT="${NARJISS_WEBROOT:-/home/narjiss/htdocs/www.narjiss.company}"
URL="${NARJISS_URL:-https://www.narjiss.company}"

# Deux URL sondées, et pas une seule : elles empruntent des blocs nginx
# DIFFÉRENTS. Une page HTML est servie directement par le proxy de tête (:443),
# un point d'entrée PHP part vers le backend (:8080). Le 31/08/2026, la règle de
# maintenance ne vivait que dans le bloc :8080 : les pages répondaient 200 et
# l'API 503, soit un site à moitié cassé — et le script, qui ne testait que
# l'accueil, annonçait « pas de règle nginx » au lieu de l'état réel.
PROBE_HTML="${NARJISS_PROBE_HTML:-/}"
PROBE_PHP="${NARJISS_PROBE_PHP:-/api/liveguide-session.php}"
# ===========================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Le script est indépendant du répertoire d'où on le lance : on se replace dans
# le dossier du dépôt pour que tous les chemins relatifs soient les bons.
cd "$SCRIPT_DIR"
PAGE="$SCRIPT_DIR/maintenance.html"
FLAG="$WEBROOT/.maintenance"

die(){ echo "ERREUR: $*" >&2; exit 1; }

http_code(){ curl -s -o /dev/null -w "%{http_code}" "$URL$1"; }

# Sonde les deux chemins et juge l'état RÉEL du site.
# $1 = état attendu : "on" (tout doit être en 503) ou "off" (rien ne doit l'être).
# Sort en 1 si le résultat ne correspond pas, pour qu'un appel scripté le voie.
verifier(){
  local attendu="$1" html php n503=0
  html="$(http_code "$PROBE_HTML")"
  php="$(http_code "$PROBE_PHP")"
  printf '  %-32s %s\n' "$PROBE_HTML" "$html"
  printf '  %-32s %s\n' "$PROBE_PHP" "$php"
  # En if/then et non en « [ … ] && … » : sous « set -e », un && dont le test
  # échoue ferait sortir le script au lieu de continuer.
  if [ "$html" = "503" ]; then n503=$((n503 + 1)); fi
  if [ "$php"  = "503" ]; then n503=$((n503 + 1)); fi

  if [ "$n503" = 1 ]; then
    echo "  ⛔ ÉTAT PARTIEL — le site est À MOITIÉ CASSÉ." >&2
    echo "     Un seul des deux chemins bascule : le visiteur voit des pages qui" >&2
    echo "     s'affichent mais dont l'API et les données échouent (ou l'inverse)." >&2
    echo "     Cause habituelle : la règle de maintenance ne figure que dans l'un" >&2
    echo "     des blocs server du vhost. Voir maintenance.nginx.conf." >&2
    echo "     À FAIRE MAINTENANT :  bash maintenance.sh off" >&2
    return 1
  fi

  if [ "$attendu" = "on" ]; then
    [ "$n503" = 2 ] && { echo "  -> maintenance ACTIVÉE (site entier)."; return 0; }
    echo "  ⚠️ Attendu 503 partout, obtenu 200 : la règle nginx n'est pas active" >&2
    echo "     dans le vhost. Le drapeau est posé mais inerte — voir" >&2
    echo "     maintenance.nginx.conf, puis relancez." >&2
    return 1
  else
    [ "$n503" = 0 ] && { echo "  -> site EN LIGNE (maintenance désactivée)."; return 0; }
    echo "  ⚠️ Encore 503 partout — vérifiez le drapeau et le cache." >&2
    return 1
  fi
}

case "${1:-}" in
  on)
    [ -f "$PAGE" ] || die "maintenance.html introuvable à côté du script."
    echo "> Envoi de maintenance.html ..."
    scp -q "$PAGE" "$VPS:$WEBROOT/maintenance.html"
    echo "> Création du drapeau .maintenance ..."
    ssh "$VPS" "touch '$FLAG'"
    echo "> Codes HTTP observés :"
    verifier on
    ;;

  off)
    echo "> Suppression du drapeau .maintenance ..."
    ssh "$VPS" "rm -f '$FLAG'"
    echo "> Codes HTTP observés :"
    verifier off
    ;;

  status)
    echo "> État du drapeau sur le VPS :"
    ssh "$VPS" "test -f '$FLAG' && echo '  drapeau présent (maintenance ACTIVÉE)' || echo '  pas de drapeau (site en ligne)'"
    echo "> Codes HTTP observés :"
    if ssh "$VPS" "test -f '$FLAG'"; then verifier on; else verifier off; fi
    ;;

  *)
    echo "Usage: bash maintenance.sh {on|off|status}"
    exit 1
    ;;
esac
