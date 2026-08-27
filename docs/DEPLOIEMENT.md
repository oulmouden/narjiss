# Déploiement & exploitation — fonctionnalités bureau de vente

Récapitulatif des fonctionnalités ajoutées (bureaux de vente, hôtesse IA,
fiche client) et de tout ce qui vit **hors du dépôt git**. À lire avant un
déploiement sur une autre machine ou une mise en production.

---

## 1. Ce qui a été construit

| Fonctionnalité | Fichiers clés | Page(s) |
|---|---|---|
| Bureaux de vente (visite 360) | `bureaudevente.html/.js`, `jawhara/tour-bureau/` | `/bureaudevente.html` |
| Hôtesse d'accueil IA (vocale) | `api/agent.py`, `api/accueil-token.php`, `api/project-info.php`, `api/rendezvous.php` | panneau dans `/bureaudevente.html` |
| Fiche de renseignement client | `fiche.html/.js`, `api/fiche.php`, `api/fiche-config.php` | `/fiche.html?projet=<id>` |
| Auto-remplissage MRZ (CIN) | `assets/vendor/tesseract/`, `assets/vendor/mrz/mrz-td1.js` | dans `/fiche.html` |
| Notification e-mail | `api/mail.php`, `api/config.php` | déclenchée par `fiche.php` |
| QR codes bureau | `admin/fiche-qr.php`, `assets/vendor/qrcode/` | `/admin/fiche-qr.php` |
| Back-office fiches | `admin/fiches.php`, `admin/fiche-piece.php` | `/admin/fiches.php` |
| Purge à échéance | `api/purge-fiches.php` | CLI / tâche planifiée |

Documents : `docs/fiche-renseignement-client.docx` (fiche papier équivalente).

---

## 2. Éléments HORS dépôt git (à recréer / reporter manuellement)

Ces éléments ne sont **pas** versionnés (secrets ou données personnelles) et
doivent être mis en place sur chaque machine.

### a) `api/.env` — configuration et secrets
Copier `api/.env.example` en `api/.env` puis renseigner :

```
OPENAI_API_KEY=...            # hôtesse IA (STT + LLM + TTS)
APP_URL=http://localhost/narjiss

# Notification de nouvelle fiche (vide = désactivé)
FICHE_NOTIFY_TO=commercial@narjiss.company

# SMTP (vide en dev → les e-mails vont dans data/mail-outbox/)
MAIL_FROM=no-reply@narjiss.company
MAIL_FROM_NAME=Narjiss Immobilière
SMTP_HOST=
SMTP_PORT=465
SMTP_SECURE=ssl
SMTP_USER=
SMTP_PASS=

# Web Push - reveille le telephone des commerciaux (voir juste en dessous)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:contact@narjiss.company
```

**Les trois cles VAPID se generent une seule fois**, depuis votre poste
(`tools/` n'est pas deploye sur le VPS, et n'a pas besoin de l'etre) :

```
php tools/generer-cles-push.php
```

Sous Windows, `php` n'est pas dans le PATH : il faut le chemin complet du PHP
de XAMPP. Depuis n'importe quel dossier, en `cmd` :

```
C:\xampp\php\php.exe C:\xampp\htdocs\narjiss\tools\generer-cles-push.php
```

Le script affiche les trois lignes a coller dans le `api/.env` **du serveur**.
La cle privee ne passe donc que par votre session SSH : ni par git, ni par
`deploy.sh`, qui exclut `.env`. Chaque commercial
clique ensuite « Activer les alertes » dans son espace pour inscrire son
appareil — rien d'autre a faire.

⚠️ **Ne relancez pas ce script une fois en service.** De nouvelles cles
invalident TOUS les abonnements existants : les telephones deja inscrits
cesseraient d'etre reveilles, sans le moindre message d'erreur. Leurs
proprietaires croiraient simplement que plus personne ne les demande.

Tant que ces cles sont vides, le push est inerte et l'espace agent retombe sur
l'alerte sonore — qui suffit tant que le commercial a sa page ouverte.

### b) `C:\xampp\narjiss-prive\` — coffre des fiches clients
Créé automatiquement au premier envoi. Contient les fiches et **les copies de
CNIE**. Volontairement hors de `htdocs` : jamais servi par Apache.
**À inclure dans les sauvegardes** (il n'est pas dans git).

### c) Tâche planifiée de purge (Windows)
Rend effective la durée de conservation. À recréer :

```
schtasks /Create /TN "Narjiss - purge fiches clients" ^
  /TR "\"C:\xampp\php\php.exe\" \"C:\xampp\htdocs\narjiss\api\purge-fiches.php\" --appliquer" ^
  /SC DAILY /ST 03:00
```

Test manuel : `php api/purge-fiches.php` (simulation) puis `--appliquer`.

### d) Dépendances Python de l'hôtesse IA
```
pip install -r api/requirements.txt
```

---

## 3. Démarrer l'hôtesse IA

```
start-ia.bat
```
Lance (ou réutilise) le serveur LiveKit sur le port 7880 et l'agent Python.
Garder les deux fenêtres ouvertes. Rooms préfixées `bureau-` (cohabite avec
l'agent `accueil-` de domiciliation sur le même serveur LiveKit).

Le hotspot 3DVista qui ouvre l'hôtesse s'ajoute dans **3DVista Studio**
(projet `jawhara/tour-bureau/jawhara-bureau-tour.vtp`), action « Execute
JavaScript » :
```js
window.parent.postMessage({source:'narjiss-tour', action:'openAgent'}, window.location.origin);
```
`action:'enterReception'` sur l'action *Begin* du panorama = déclenchement
automatique à l'arrivée. Ré-exporter écrase `tour-bureau/` (ne jamais éditer
`index.htm`/`script.js` à la main).

---

## 4. Tester

| Quoi | Comment |
|---|---|
| Fiche | `http://localhost/narjiss/fiche.html?projet=jawhara` |
| Scan MRZ | Bouton « Scanner ou importer le dos de la CIN » + photo/fichier d'une CIN biométrique |
| E-mail (dev) | Envoyer une fiche → l'e-mail apparaît dans `data/mail-outbox/*.eml` |
| QR codes | `http://localhost/narjiss/admin/fiches.php` → « Affichettes QR » |
| Back-office | `http://localhost/narjiss/admin/fiches.php` (session admin requise) |
| Hôtesse IA | Console de `bureaudevente.html` : `postMessage({source:'narjiss-tour',action:'enterReception'}, location.origin)` |

---

## 5. À valider avant production

- [ ] **HTTPS obligatoire** : la fiche transmet n° de CIN et photos. En HTTP,
      tout circule en clair. Acceptable sur tablette en Wi-Fi local, pas au-delà.
- [ ] **Numéro de déclaration CNDP** à compléter dans `fiche.js` (variable
      `LEGAL`) et dans le `.docx`.
- [ ] **Durées de conservation** (3 ans prospect / 10 ans client, dans
      `api/fiche-config.php`) à faire valider par un conseil juridique.
- [ ] **Scan MRZ** à éprouver sur de vraies CIN biométriques (précision OCR).
- [ ] **SMTP** réel configuré et testé.
- [ ] Sauvegarde de `C:\xampp\narjiss-prive\` en place.

---

## 6. Cache HTTP

### Le problème

Les fichiers JS et CSS portent un `?v=` que l'on incrémente à chaque
modification : le navigateur les recharge donc tout seul. **Les fichiers
`.html` n'en portent pas** — ils sont le point d'entrée, ils ne peuvent pas se
versionner eux-mêmes.

Quand une page est servie en cache long, le navigateur exécute le **nouveau JS
sur l'ancien HTML**. Un élément ajouté au balisage reste alors invisible, sans
la moindre erreur en console, jusqu'à un `Ctrl+Shift+R` manuel. Intenable pour
des visiteurs qui ne sauront jamais qu'il faut recharger de force.

### En production : déjà réglé (vérifié le 9 août 2026)

Le vhost CloudPanel du site pose déjà la règle, sans intervention de notre
part :

```nginx
location ~* \.html$ {
    add_header Cache-Control "no-cache";
    try_files $uri =404;
}
```

`no-cache` n'interdit pas la mise en cache : il impose la **revalidation**. Le
navigateur redemande au serveur si la page a changé ; un `304` ne coûte quasiment
rien quand ce n'est pas le cas. C'est exactement le comportement recherché.

> ⚠️ **Ne pas ajouter un second bloc `location ~* \.html$`** : nginx refuse de
> démarrer sur une `duplicate location`. `nginx -t` l'attraperait, mais autant
> ne pas y toucher — il n'y a rien à corriger.

Vérification :

```bash
curl -sI https://www.narjiss.company/disponibilites.html | grep -i cache-control
```

Attendu : `Cache-Control: no-cache`.

### Reste éventuellement à faire : le cache long des ressources

À l'inverse des pages, les fichiers versionnés peuvent être gardés très
longtemps — changer le `?v=` change l'URL, donc l'entrée de cache. Si le vhost
ne contient aucun bloc pour ces extensions, l'ajouter apporte un gain de
performance (aucun effet sur la fraîcheur du contenu) :

```nginx
location ~* \.(js|css|jpg|jpeg|png|gif|webp|svg|woff2?|mp4)$ {
    add_header Cache-Control "public, max-age=31536000";
}
```

Puis :

```bash
nginx -t && systemctl reload nginx
```

`nginx -t` valide la syntaxe **avant** le rechargement : sans lui, une faute de
frappe coupe le site entier.

### En local (XAMPP/Apache)

Aucune règle de ce type n'est posée : après modification d'un `.html`, prévoir
un `Ctrl+Shift+R`. C'est la cause la plus fréquente d'un « je ne vois pas le
changement » en développement.

---

## 7. Rappels de conception (le « pourquoi »)

- La **copie de CNIE ne circule jamais** : ni par e-mail (notification = texte
  + lien admin), ni par URL publique (stockage hors `htdocs`, servi seulement
  par `admin/fiche-piece.php` sous session, avec journalisation).
- L'**auto-remplissage MRZ** ne remplit un champ que si les chiffres de
  contrôle valident : jamais de donnée fausse injectée.
- L'**hôtesse IA** a interdiction de citer prix, surface, disponibilité ou
  délai : elle propose un rappel par un conseiller.
- **Deux consentements séparés** : traitement du dossier (obligatoire) et
  prospection commerciale (facultatif).

---

## 8. Déployer et vérifier (procédure courante)

### Avant

Régénérer ce qui se génère, puis poser les empreintes de cache :

```bash
python tools/generer-guides.py && python tools/generer-sitemap.py && python tools/versionner.py
```

Contrôler ce qui partira, **sans rien envoyer** :

```bash
bash deploy.sh code --dry-run
```

### Envoyer

```bash
bash deploy.sh code
```

Le mot de passe root du VPS est demandé une seule fois (un flux `tar | ssh`,
une seule connexion). L'extraction n'écrase que les fichiers présents dans
l'archive : les secrets et les données serveur restent intacts.

### Après — le contrôle qui manquait

```bash
python tools/verifier-deploiement.py
```

Test de recette joué **une fois**, depuis l'extérieur : les deux domaines
aboutissent, les pages attendues répondent, le `menu.js` en ligne connaît bien
les entrées récentes, `sitemap.xml` et `robots.txt` sont servis **et identiques
au local**, et les ressources `?v=` référencées existent réellement.

Pourquoi ce contrôle existe : `deploy.sh` ne se plaint **jamais** de ce qu'il
n'a pas ramassé. Trois fois, des fichiers sont restés sur le poste local sans
le moindre message — les CSV de points d'intérêt (Jawhara est resté des
semaines en ligne avec 18 POI au lieu de 77), les visites 3DVista republiées,
puis le dossier `guides/` entier. Seule une vérification depuis l'extérieur le
voit.

À ne pas confondre avec `tools/verifier-prod.js`, qui surveille en continu
l'**identité** du serveur (bonne IP, bon certificat, notre PHP tourne) et évite
délibérément de contrôler des versions.

### Les deux noms de domaine

Vérifié le 25/08/2026, rien à changer :

| Entrée | Aboutit sur |
|---|---|
| `http://narjiss.company/` | `https://www.narjiss.company/` (301) |
| `https://narjiss.company/` | `https://www.narjiss.company/` (301) |
| `http://www.narjiss.company/` | `https://www.narjiss.company/` (301) |
| `https://www.narjiss.company/` | 200 |

Le certificat couvre les deux noms (`narjiss.company` et `www.narjiss.company`).
La redirection conserve chemin **et** paramètres. La forme canonique est donc
**avec `www`** : c'est ce que déclare `data/site.json`, source unique des URL
absolues du site (voir `docs/REFERENCEMENT.md`).
