#!/usr/bin/env bash
#
# deploy.sh — synchronise le site Narjiss vers le VPS en UNE commande.
#
# Fini les comparaisons manuelles md5 local↔VPS : on empaquette le set voulu
# et on l'extrait sur le serveur via un flux « tar | ssh » (UNE seule connexion,
# donc UN seul mot de passe root demandé, aucun fichier temporaire laissé sur
# le VPS). L'extraction n'écrase QUE les fichiers présents dans l'archive :
# les secrets et données serveur (voir GARDE-FOU + listes) restent intacts.
#
# Cible : VPS nginx/CloudPanel, docroot /home/narjiss/htdocs/www.narjiss.company.
#
# Usage :
#   bash deploy.sh code            # (défaut) code léger : html/js/css/json, shared, api, admin, data-json, kb
#   bash deploy.sh images          # médias : images/ (sans les _orig-360 lourds)
#   bash deploy.sh videos          # films des projets : data/videos/ (+ posters)
#   bash deploy.sh all             # code + images + vidéos
#   bash deploy.sh path <p> [...]  # déploie des chemins précis (fichiers ou dossiers)
#   bash deploy.sh rm <remote> ... # supprime des fichiers SUR le VPS (chemins relatifs au docroot)
#   bash deploy.sh verify          # compare le md5 local vs VPS de fichiers-clés (diagnostic)
#
# Options :
#   --dry-run     liste ce qui serait envoyé/supprimé sans rien faire
#   --host X      surcharge le VPS (défaut : $NARJISS_VPS ou root@147.79.101.154)
#   --webroot X   surcharge le docroot distant
#
# Pré-requis : ssh + scp (OpenSSH, déjà présents dans Git Bash). Pas de rsync requis.
# Le mot de passe root est demandé de façon interactive (pas de clé) — je ne peux pas
# l'automatiser sans que tu déposes une clé SSH (voir la note en bas du fichier).
set -euo pipefail

# ============ CONFIG ========================================================
VPS="${NARJISS_VPS:-root@147.79.101.154}"
WEBROOT="${NARJISS_WEBROOT:-/home/narjiss/htdocs/www.narjiss.company}"
URL="${NARJISS_URL:-https://www.narjiss.company}"
OWNER="narjiss:narjiss"                 # propriétaire des fichiers déployés
# ===========================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DRY=0
c_red=$'\033[31m'; c_grn=$'\033[32m'; c_yel=$'\033[33m'; c_dim=$'\033[2m'; c_0=$'\033[0m'
info(){ printf '%s\n' "$*" >&2; }
die(){ printf '%s%s%s\n' "$c_red" "$*" "$c_0" >&2; exit 1; }

# --- garde-fou : rien de sensible ne doit JAMAIS partir vers le web ----------
# CIN réelles, secrets, données clients, sauvegardes, clés privées.
FORBIDDEN='CIN |cnie|/\.env$|liveguide-config\.php$|config\.local|narjiss-prive|rendezvous\.json|/backups/|/mail-outbox/|id_rsa|\.orig$|\.bak'

# On refuse d'être ailleurs que dans la racine du site (évite un tar du mauvais dossier).
[ -f index.html ] && [ -d api ] && [ -d shared ] || \
  die "deploy.sh doit être lancé depuis la racine du site (index.html/api/shared introuvables)."

# --- Listes déployables ------------------------------------------------------
# Bucket CODE : fichiers texte fréquemment modifiés. Construits par find pour
# rester justes même quand de nouveaux fichiers apparaissent, avec exclusions.
build_code_list(){
  # fichiers racine
  ls -1 *.html *.js *.css *.json 2>/dev/null || true
  # dossiers de code (exclusions ciblées)
  find shared -type f 2>/dev/null
  find api   -type f 2>/dev/null \
       ! -name '.env' ! -name 'liveguide-config.php' \
       ! -path 'api/__pycache__/*' ! -path 'api/.venv/*'
  find admin -type f 2>/dev/null \
       ! -path 'admin/includes/config.php'
  find kb    -type f 2>/dev/null
  # data : uniquement les JSON de contenu du site (jamais rendezvous/backups/outbox)
  for f in projects.json project-sliders.json home-slider-images.json contacts.json; do
    [ -f "data/$f" ] && echo "data/$f"
  done
}

# Bucket IMAGES : médias, sans les panoramas sources _orig-360 (52 Mo).
build_images_list(){
  find images -type f 2>/dev/null \
       ! -path '*/_orig-360/*'
}

# Bucket VIDEOS : films des projets + générique, posters compris. Séparé des
# images : plusieurs dizaines de Mo qu'on ne veut pas repousser à chaque
# déploiement de code. `mindepth 2` : seuls les fichiers rangés dans un
# sous-dossier de projet partent — ceux laissés en vrac à la racine de
# data/videos ne sont rattachés à aucun projet et n'ont rien à faire en ligne.
build_videos_list(){
  find data/videos -mindepth 2 -type f 2>/dev/null ! -name '.gitkeep' ! -name 'README.md'
}

# --- Envoi d'une liste de fichiers via flux tar|ssh --------------------------
send_list(){
  local label="$1"; shift
  local listfile; listfile="$(mktemp)"
  # normalise les chemins (retire ./, lignes vides)
  sed 's#^\./##' | sed '/^$/d' | sort -u > "$listfile"

  local n; n="$(wc -l < "$listfile" | tr -d ' ')"
  [ "$n" -gt 0 ] || { info "${c_yel}[$label] aucun fichier à envoyer.${c_0}"; rm -f "$listfile"; return 0; }

  # GARDE-FOU : abort si un chemin interdit apparaît dans la liste.
  local bad; bad="$(grep -iE "$FORBIDDEN" "$listfile" || true)"
  if [ -n "$bad" ]; then
    info "${c_red}⛔ GARDE-FOU : des chemins sensibles sont dans la liste — envoi ANNULÉ :${c_0}"
    printf '%s\n' "$bad" | sed 's/^/    /' >&2
    rm -f "$listfile"; exit 1
  fi

  local size; size="$(tr '\n' '\0' < "$listfile" | du -ch --files0-from=- 2>/dev/null | tail -1 | cut -f1)"
  info "${c_grn}[$label]${c_0} $n fichiers (${size:-?}) → $VPS:$WEBROOT"
  if [ "$DRY" = 1 ]; then
    info "${c_dim}--dry-run : liste des fichiers ↓${c_0}"
    sed 's/^/    /' "$listfile" >&2
    rm -f "$listfile"; return 0
  fi

  # tar depuis la liste → flux → extraction distante → chown. Une seule connexion SSH.
  tar czf - --no-recursion -T "$listfile" \
    | ssh "$VPS" "cd '$WEBROOT' && tar xzf - && chown -R $OWNER . 2>/dev/null; echo '   ✓ extrait sur le VPS'"
  rm -f "$listfile"
}

# --- Commandes ---------------------------------------------------------------
cmd_code(){   build_code_list   | send_list "code"; }
cmd_images(){ build_images_list | send_list "images"; }
cmd_videos(){ build_videos_list | send_list "videos"; }

cmd_path(){
  [ "$#" -gt 0 ] || die "usage : deploy.sh path <fichier|dossier> [...]"
  for p in "$@"; do
    [ -e "$p" ] || die "introuvable : $p"
    if [ -d "$p" ]; then find "$p" -type f; else echo "$p"; fi
  done | send_list "path"
}

cmd_rm(){
  [ "$#" -gt 0 ] || die "usage : deploy.sh rm <chemin-relatif-au-docroot> [...]"
  # garde-fou : jamais de rm à la racine, jamais de motif sensible/dangereux.
  for r in "$@"; do
    case "$r" in
      ""|/|.|..|*..*) die "chemin refusé : '$r'";;
    esac
    printf '%s\n' "$r" | grep -iqE "$FORBIDDEN" && die "chemin sensible refusé : '$r'"
  done
  info "${c_yel}Suppression sur le VPS :${c_0}"; printf '    %s\n' "$@" >&2
  if [ "$DRY" = 1 ]; then info "${c_dim}--dry-run : rien supprimé.${c_0}"; return 0; fi
  local args=""; for r in "$@"; do args="$args '$WEBROOT/$r'"; done
  ssh "$VPS" "rm -vf $args"
}

cmd_verify(){
  # compare le md5 local vs distant (curl) pour les fichiers-clés souvent désynchronisés.
  local keys=(index.html project.js project.html bureaudevente.html bureaudevente.js
              explorer.js shared/menu.js shared/menu.css shared/liveguide.js
              data/projects.json data/project-sliders.json espace-agent.js)
  info "Vérification md5 local ↔ ${URL} :"
  local ok=0 ko=0
  for f in "${keys[@]}"; do
    [ -f "$f" ] || { printf '  %s?%s %-34s (absent en local)\n' "$c_yel" "$c_0" "$f" >&2; continue; }
    local lm rm
    lm="$(md5sum "$f" | cut -d' ' -f1)"
    rm="$(curl -fsS "$URL/$f" 2>/dev/null | md5sum | cut -d' ' -f1 || true)"
    if [ "$lm" = "$rm" ]; then printf '  %s✓%s %s\n' "$c_grn" "$c_0" "$f" >&2; ok=$((ok+1))
    else printf '  %s✗%s %-34s local=%s vps=%s\n' "$c_red" "$c_0" "$f" "${lm:0:8}" "${rm:0:8}" >&2; ko=$((ko+1)); fi
  done
  info "→ $ok à jour, $ko désynchronisés."
}

# --- Parsing des options + dispatch -----------------------------------------
ARGS=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1;;
    --host)    VPS="$2"; shift;;
    --webroot) WEBROOT="$2"; shift;;
    -h|--help) sed -n '2,30p' "$0"; exit 0;;
    *) ARGS+=("$1");;
  esac
  shift
done
set -- "${ARGS[@]:-code}"

CMD="$1"; shift || true
case "$CMD" in
  code)    cmd_code;;
  images)  cmd_images;;
  videos)  cmd_videos;;
  all)     cmd_code; cmd_images; cmd_videos;;
  path)    cmd_path "$@";;
  rm)      cmd_rm "$@";;
  verify)  cmd_verify;;
  *) die "commande inconnue : '$CMD' (code|images|videos|all|path|rm|verify)";;
esac

info "${c_grn}Terminé.${c_0}"

# ─────────────────────────────────────────────────────────────────────────────
# NOTE — supprimer les mots de passe répétés : dépose une clé SSH sur le VPS
#   ssh-keygen -t ed25519 -f ~/.ssh/narjiss -N ""
#   ssh-copy-id -i ~/.ssh/narjiss.pub root@147.79.101.154   # (une fois, mot de passe)
# puis ajoute dans ~/.ssh/config :
#   Host narjiss-vps
#     HostName 147.79.101.154
#     User root
#     IdentityFile ~/.ssh/narjiss
# et lance : NARJISS_VPS=narjiss-vps bash deploy.sh code   (plus aucun mot de passe)
# ─────────────────────────────────────────────────────────────────────────────
