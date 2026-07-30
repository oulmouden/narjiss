#!/usr/bin/env bash
#
# maintenance.sh — bascule narjiss.company en maintenance (ON/OFF) en une commande.
#
# Fait tout depuis votre PC via SSH/SCP :
#   - détecte votre IP publique (pour continuer à voir le site pendant la maintenance)
#   - envoie maintenance.html sur le VPS
#   - insère/retire un bloc HTTP 503 dans le .htaccess (sans toucher au reste,
#     grâce aux balises #NARJISS_MAINT_BEGIN/END)
#   - vérifie le résultat (code HTTP)
#
# Usage :
#   bash maintenance.sh on          # active (autorise votre IP publique)
#   bash maintenance.sh on 41.1.2.3 # active en autorisant une IP précise
#   bash maintenance.sh on --all    # active en bloquant TOUT LE MONDE (vous aussi)
#   bash maintenance.sh off         # désactive (remet le site en ligne)
#   bash maintenance.sh status      # affiche l'état courant
#
# Prérequis VPS : Apache avec AllowOverride All + mod_rewrite/mod_headers.
# Aucun reload Apache nécessaire (le .htaccess est pris en compte immédiatement).
set -euo pipefail

# ============ CONFIG (à adapter une seule fois) ============================
VPS="${NARJISS_VPS:-root@narjiss.company}"       # accès SSH
WEBROOT="${NARJISS_WEBROOT:-/var/www/html}"       # racine web sur le VPS (là où vous faites scp)
URL="${NARJISS_URL:-https://www.narjiss.company}" # URL publique (pour la vérif)
# ===========================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAGE="$SCRIPT_DIR/maintenance.html"

die(){ echo "ERREUR: $*" >&2; exit 1; }

verify(){
  echo "--- Vérification ($URL) ---"
  curl -sI "$URL" | grep -iE "^HTTP|Retry-After" || echo "(pas de réponse HTTP)"
}

action="${1:-}"
case "$action" in
  on)
    [ -f "$PAGE" ] || die "maintenance.html introuvable à côté du script."
    # IP autorisée : argument, sinon IP publique locale ; --all = personne
    if [ "${2:-}" = "--all" ]; then
      ADMIN_IP=""
    else
      ADMIN_IP="${2:-$(curl -s https://ifconfig.me || true)}"
    fi
    echo "IP autorisée pendant la maintenance : ${ADMIN_IP:-AUCUNE (tout le monde bloqué)}"

    echo "> Envoi de maintenance.html ..."
    scp -q "$PAGE" "$VPS:$WEBROOT/maintenance.html"

    echo "> Activation du bloc maintenance dans .htaccess ..."
    ssh "$VPS" "WEBROOT='$WEBROOT' ADMIN_IP='$ADMIN_IP' bash -s" <<'REMOTE'
set -e
HT="$WEBROOT/.htaccess"
touch "$HT"
# retirer un éventuel bloc précédent (idempotent)
sed -i '/#NARJISS_MAINT_BEGIN/,/#NARJISS_MAINT_END/d' "$HT"
{
  echo "#NARJISS_MAINT_BEGIN"
  echo "<IfModule mod_rewrite.c>"
  echo "  RewriteEngine On"
  if [ -n "$ADMIN_IP" ]; then echo "  RewriteCond %{REMOTE_ADDR} !=$ADMIN_IP"; fi
  echo "  RewriteCond %{REQUEST_URI} !^/maintenance\\.html\$"
  echo "  RewriteRule ^ - [R=503,L]"
  echo "</IfModule>"
  echo "ErrorDocument 503 /maintenance.html"
  echo "<IfModule mod_headers.c>"
  echo '  Header always set Retry-After "3600"'
  echo '  Header always set Cache-Control "no-store, must-revalidate"'
  echo "</IfModule>"
  echo "#NARJISS_MAINT_END"
  cat "$HT"
} > "$HT.tmp" && mv "$HT.tmp" "$HT"
echo "  -> maintenance ACTIVÉE."
REMOTE
    verify
    ;;

  off)
    echo "> Retrait du bloc maintenance ..."
    ssh "$VPS" "WEBROOT='$WEBROOT' bash -s" <<'REMOTE'
set -e
HT="$WEBROOT/.htaccess"
if [ ! -f "$HT" ]; then echo "  (pas de .htaccess, rien à faire)"; exit 0; fi
sed -i '/#NARJISS_MAINT_BEGIN/,/#NARJISS_MAINT_END/d' "$HT"
# supprimer le fichier s'il ne reste plus rien d'utile
if ! grep -q '[^[:space:]]' "$HT"; then rm -f "$HT"; fi
echo "  -> maintenance DÉSACTIVÉE."
REMOTE
    verify
    ;;

  status)
    echo "> État du bloc maintenance sur le VPS :"
    ssh "$VPS" "grep -q '#NARJISS_MAINT_BEGIN' '$WEBROOT/.htaccess' 2>/dev/null && echo '  ACTIVÉE' || echo '  désactivée'"
    verify
    ;;

  *)
    echo "Usage: bash maintenance.sh {on|off|status} [ip|--all]"
    exit 1
    ;;
esac
