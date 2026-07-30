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
```

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

## 6. Rappels de conception (le « pourquoi »)

- La **copie de CNIE ne circule jamais** : ni par e-mail (notification = texte
  + lien admin), ni par URL publique (stockage hors `htdocs`, servi seulement
  par `admin/fiche-piece.php` sous session, avec journalisation).
- L'**auto-remplissage MRZ** ne remplit un champ que si les chiffres de
  contrôle valident : jamais de donnée fausse injectée.
- L'**hôtesse IA** a interdiction de citer prix, surface, disponibilité ou
  délai : elle propose un rappel par un conseiller.
- **Deux consentements séparés** : traitement du dossier (obligatoire) et
  prospection commerciale (facultatif).
