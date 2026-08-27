# Fonctionnalités manquantes — feuille de route

Audit du site au 25 août 2026, dans l'état de la branche principale. Le but :
lister ce qui sépare le site actuel d'une plateforme de vente immobilière
professionnelle complète, par ordre d'impact, avec pour chaque manque **le
constat**, **ce qu'il faut construire**, **où ça se branche** dans le code
existant et **l'effort**.

Rien ici n'est urgent au sens d'une panne : le site fonctionne et vend. Ce
document sert à choisir quoi construire ensuite, pas à corriger des bugs.

---

## 0. Ce qui existe déjà (pour ne pas le reconstruire)

| Domaine | État |
|---|---|
| Vitrine 4 langues (FR/EN/AR/ES) + RTL | ✅ `shared/menu.js`, i18n par page |
| Thème clair / nocturne, PWA installable | ✅ `shared/menu.css`, `manifest.json` |
| Carte interactive + POI par projet | ✅ `explorer.html`, `localisation.html`, `api/poi-lib.php` — `carte.html` conservée hors barre de navigation |
| Fiche projet détaillée + simulateur de mensualité | ✅ `project.html/.js` |
| Visites 360 (Pannellum + 3DVista) + éditeur commercial | ✅ `tour-360.html`, `visite-editeur.html`, `api/visites.php` |
| Sélecteur de lots, statuts, import XLSX | ✅ `disponibilites.html/.js`, `api/lots-lib.php`, table `lots` |
| Comparatif de 3 lots + parcours client 5 étapes | ✅ `ma-selection.html/.js`, `api/parcours.php` |
| Fiche de renseignement CNDP 09-08 + coffre privé + purge | ✅ `fiche.html`, `api/fiche.php`, `api/purge-fiches.php` |
| Espace commercial : présence, code d'accès, messagerie vocale, appel LiveKit | ✅ `espace-agent.html/.js`, `api/messages-lib.php`, `api/livekit.php` |
| Hôtesse d'accueil IA (bureau de vente) | ✅ `api/agent.py`, `bureaudevente.html` |
| Back-office : projets, lots, fiches, agents, messages, zones de plan, audit | ✅ `admin/` |
| Guides de l'achat (5 articles x 4 langues, statiques, SEO) | ⚠️ livrés en brouillon — `guides.html`, `tools/generer-guides.py`, `docs/GUIDES.md` |
| Plan de site + robots.txt + domaine canonique | ✅ `sitemap.xml`, `robots.txt`, `data/site.json`, `tools/generer-sitemap.py`, `docs/REFERENCEMENT.md` |

**Lecture d'ensemble** : l'outil de *bureau de vente* est mûr. Ce qui manque se
situe **avant** (faire venir et convertir le visiteur) et **après** (suivre le
lead, puis l'acquéreur).

---

## Tableau de priorisation

| # | Manque | Gain | Effort | Tier |
|---|---|---|---|---|
| 1 | SEO, partage social, données structurées | ⭐⭐⭐ | 1 j | 1 · **sitemap + robots livrés** |
| 2 | Mesure d'audience et entonnoir de conversion | ⭐⭐⭐ | 1 j | 1 |
| 3 | Suivi de lead (CRM) dans l'espace commercial | ⭐⭐⭐ | 2–3 j | 1 |
| 4 | Alertes disponibilité + relance automatique | ⭐⭐ | 2 j | 1 |
| 5 | Recherche transversale multi-projets | ⭐⭐ | 2 j | 2 |
| 6 | Favoris rattachés à une personne | ⭐⭐ | 1 j | 2 |
| 7 | Pré-réservation en ligne (option 48 h) | ⭐⭐ | 2 j | 2 |
| 8 | Prise de rendez-vous avec créneaux réels | ⭐⭐ | 2 j | 2 |
| 9 | Espace client / suivi de dossier VEFA | ⭐⭐⭐ | 5–8 j | 3 |
| 10 | Preuve sociale (avis, références, garanties) | ⭐⭐ | 1–2 j | 3 |
| 11 | Contenu éditorial + calculateur de frais d'acquisition | ⭐⭐ | 2–3 j | 3 · **partiellement livré** |
| 12 | Prix en devises étrangères | ⭐ | 0,5 j | 3 |
| 13 | Exploitation : sauvegarde, monitoring, 2FA, déploiement | ⭐⭐ | 2 j | 4 |
| 14 | Accessibilité WCAG AA vérifiée | ⭐ | 1 j | 4 |

Efforts en jours-homme, hypothèse : un développeur qui connaît déjà le code.

---

# Tier 1 — Indispensable pour être crédible

## 1. SEO, partage social et données structurées

**État au 25/08/2026 — partiellement livré.** `sitemap.xml` (37 URL) et
`robots.txt` sont générés par `tools/generer-sitemap.py` depuis les sources
réelles du site ; le domaine canonique est centralisé dans `data/site.json` ;
les pages privées portent un `noindex`. Détail et pièges évités :
`docs/REFERENCEMENT.md`.

**Restent à faire** : `meta description`, `og:`/`twitter:`, image de partage par
projet, `canonical` sur les pages fixes et les fiches projet, JSON-LD
`Organization` et `RealEstateListing`.

**Constat initial** — vérifié par recherche sur tout le dépôt : aucune `meta
description`, aucune balise `og:` ou `twitter:`, aucun `application/ld+json`,
pas de `sitemap.xml`, pas de `robots.txt`, pas de `hreflang` alors que le site
existe en quatre langues, pas de `canonical`.

Conséquences concrètes :

- un lien Narjiss collé dans WhatsApp ou sur Facebook s'affiche **en texte nu**,
  sans image ni titre — c'est le canal n° 1 au Maroc ;
- Google ne sait pas que les quatre langues sont le même site, et peut les
  traiter comme du contenu dupliqué ;
- aucune chance d'apparaître en résultat enrichi sur une recherche
  « appartement Agadir ».

**À construire**

- Un partiel `shared/seo.js` (ou une génération PHP) qui pose, par page :
  `description`, `og:title/description/image/url/locale`, `twitter:card`,
  `canonical`, et les `hreflang` des 4 langues + `x-default`.
- Une image de partage par projet (1200 × 630), dérivée du slider existant —
  l'outillage ffmpeg / Pillow déjà en place suffit.
- Du JSON-LD : `Organization` + `LocalBusiness` sur l'accueil,
  `Residence` / `RealEstateListing` sur `project.html`, `Offer` par lot sur
  `disponibilites.html` (prix, surface, disponibilité).
- `sitemap.xml` généré depuis `data/projects.json` et la table `lots`,
  régénéré à chaque publication ; `robots.txt` qui l'indique et qui exclut
  `/admin/`, `/api/`, `/visites/`.

**Où ça se branche** — `shared/menu.js` est déjà inclus partout et connaît la
langue courante : c'est le point d'accroche naturel. Attention : les robots
d'aperçu social **ne lisent pas le JavaScript**, les balises `og:` doivent être
dans le HTML servi. Pour les pages statiques, les écrire en dur ; pour
`project.html`, passer par une petite génération côté serveur ou pré-générer une
page par projet.

**Effort** — 1 jour. Meilleur rapport gain / coût de toute la liste.

---

## 2. Mesure d'audience et entonnoir de conversion

**Constat** — aucun outil de mesure, ni tiers ni maison. Impossible de répondre
à : combien de visiteurs par jour ? lesquels ouvrent une visite 360 ? combien
arrivent à l'étape 3 du parcours et abandonnent avant de laisser leurs
coordonnées ? quel projet convertit le mieux ?

**À construire** — un journal d'événements **maison**, first-party et anonyme,
plutôt qu'un traceur tiers : pas de bandeau cookies à ajouter, et les données
restent chez vous, ce qui est cohérent avec la posture CNDP déjà tenue sur les
fiches.

- `api/evenements.php` : `POST {type, projet, lot?, meta?}`, écrit dans une
  table `evenements` (horodatage, type, projet, session anonyme hachée, langue,
  type d'appareil). Aucune donnée personnelle, aucun cookie persistant.
- Types à couvrir : `vue_accueil`, `vue_projet`, `tour_360_lance`,
  `plan_ouvert`, `simulateur_utilise`, `lot_selectionne`, `comparatif_vu`,
  `lead_cree`, `contact_whatsapp`.
- Une page `admin/statistiques.php` : entonnoir par projet, courbe sur 30 jours,
  répartition par langue et par appareil, top des lots consultés.

**Bénéfice indirect** — le taux d'abandon entre l'étape 3 et l'étape 5 du
parcours est l'indicateur le plus utile du site : il dit exactement combien de
ventes potentielles se perdent, et sur quel projet.

**Effort** — 1 jour, collecte et tableau de bord simple compris.

---

## 3. Suivi de lead (CRM) dans l'espace commercial

**Constat** — `api/parcours.php` crée bien un prospect dans la table `fiches`,
et `admin/fiches.php` sait les lister, filtrer et exporter. Mais après la
création, plus rien : pas de statut d'avancement, pas d'historique d'échanges,
pas de relance planifiée, pas d'attribution à un commercial, **pas de
notification au commercial quand un lead tombe**. Un lead arrivé un vendredi
soir peut n'être vu que le lundi.

**À construire**

- Colonne `statut_commercial` sur `fiches` :
  `nouveau / contacte / visite_planifiee / offre / gagne / perdu`, plus
  `agent_id` (attribution) et `relance_le` (date de prochaine action).
- Table `suivi_lead` : une ligne par interaction (appel, WhatsApp, visite,
  note), avec auteur et horodatage. Reprendre les conventions des autres tables :
  InnoDB, utf8mb4, `created_at` renseigné par l'application.
- Dans `espace-agent.html`, un onglet **Mes leads** : liste triée par urgence
  (relances du jour en tête), fiche ouvrable, bouton d'appel / WhatsApp direct,
  saisie d'une note en deux clics. Le commercial y passe déjà pour la
  messagerie — c'est le bon endroit, pas une application de plus.
- Notification à la création : e-mail via `api/mail.php` (déjà en place) au
  commercial attribué, et signal dans l'espace agent.
- Attribution automatique : au commercial du projet concerné qui est
  `en_ligne` selon `agent_presence`, sinon au gestionnaire.

**Bénéfice** — c'est là que l'argent se perd aujourd'hui. Le reste du site
fabrique des leads que personne ne suit de façon fiable.

**Effort** — 2 à 3 jours.

---

## 4. Alertes disponibilité et relance automatique

**Constat** — un visiteur qui ne trouve pas son bien aujourd'hui repart sans
laisser de trace exploitable. Un visiteur qui compare trois lots puis ferme
l'onglet à l'étape 4 n'est jamais recontacté.

**À construire**

- **Alerte disponibilité** : « prévenez-moi quand un F3 sous 1,2 M DH se libère
  à Jawhara ». Table `alertes` (critères + e-mail + langue + consentement).
  Le déclencheur existe déjà : `lot_status_history` enregistre chaque
  changement de statut ; un script quotidien compare les nouveaux `disponible`
  aux critères enregistrés et envoie.
- **Relance de sélection abandonnée** : uniquement si le visiteur a laissé son
  e-mail, donc consenti. Un message à J+2 avec le récapitulatif de ses lots.
- Double opt-in et lien de désinscription dans chaque envoi — nécessaire au
  regard de la loi 09-08, et déjà dans l'esprit des mentions de
  `ma-selection.js`.
- Réutiliser le mécanisme de tâche planifiée déjà en place pour
  `api/purge-fiches.php`.

**Effort** — 2 jours.

---

# Tier 2 — Conversion

## 5. Recherche transversale multi-projets

**Constat** — `disponibilites.html` travaille projet par projet (aujourd'hui
Jawhara). Un visiteur qui arrive avec un budget et une typologie en tête, mais
sans projet précis, n'a aucune porte d'entrée.

**À construire** — une page de recherche globale : budget, typologie, surface,
ville / quartier, étage, parking, date de livraison, sur l'ensemble des projets.
Les index de la table `lots` (`idx_recherche`, `idx_surface`) sont déjà taillés
pour ça.

**Point clé : l'URL doit porter les filtres** (`?budget_max=1200000&type=f3`).
C'est ce qui permet à un commercial d'envoyer par WhatsApp un lien
pré-filtré — usage quotidien, très fort en conversion.

**Effort** — 2 jours.

## 6. Favoris rattachés à une personne

**Constat** — la sélection vit dans `localStorage` (`nj-selection-lots`). Le
client qui a comparé sur la borne tactile du bureau de vente ne retrouve rien le
soir chez lui, et inversement.

**À construire** — un lien magique : le visiteur donne son e-mail, reçoit un
lien signé qui rattache sa sélection à sa fiche et la lui réaffiche sur
n'importe quel appareil. Pas de compte, pas de mot de passe. Le récapitulatif
par jeton de `api/parcours.php` (`action=recap&token=…`), déjà utilisé pour le
QR code de borne, est exactement ce mécanisme : il suffit de l'étendre.

**Effort** — 1 jour.

## 7. Pré-réservation en ligne

**Constat** — le statut `optionne` et la colonne `date_fin_option` existent déjà
dans la table `lots`, mais seul un commercial peut les poser.

**À construire**

- Bouton « poser une option 48 h » côté client, avec compte à rebours visible
  et libération automatique à échéance (l'index `idx_option_expiree` est déjà
  prévu pour la tâche de libération).
- Étape suivante, si la direction le souhaite : acompte en ligne via CMI, puis
  signature électronique du contrat de réservation.

**Prudence** — cette fonctionnalité engage juridiquement. À cadrer avec le
promoteur **avant** développement : durée de l'option, conditions d'annulation,
mentions contractuelles.

**Effort** — 2 jours pour l'option seule ; le paiement et la signature sont un
chantier distinct.

## 8. Prise de rendez-vous avec créneaux réels

**Constat** — `data/rendezvous.json` enregistre une *demande* de rendez-vous.
Il n'y a ni agenda, ni disponibilités par commercial, ni confirmation, ni
rappel.

**À construire** — créneaux par commercial et par bureau, confirmation
immédiate, rappel la veille par WhatsApp ou e-mail, annulation / report en un
clic. Passer les rendez-vous en base plutôt qu'en JSON, comme cela a été fait
pour les fiches.

**Effort** — 2 jours.

---

# Tier 3 — Confiance et rétention

## 9. Espace client / suivi de dossier VEFA

**Constat** — aucune connexion client n'existe. Une fois la vente signée, le
site ne sert plus à rien, alors que c'est la période où l'acquéreur a le plus
besoin d'informations — et où il parle le plus de vous autour de lui.

**À construire** — un espace où l'acquéreur retrouve :

- son lot et ses caractéristiques ;
- l'échéancier de paiement et les appels de fonds, payés / à venir ;
- ses documents (réservation, contrat, attestations, plans) ;
- **l'avancement du chantier en photos datées** — le point le plus demandé, et
  celui qui réduit le plus les appels au commercial ;
- un fil de messages avec son conseiller (la messagerie de
  `api/messages-lib.php` est réutilisable telle quelle).

**Contraintes** — c'est le module qui manipule le plus de données sensibles :
appliquer la même règle cardinale que les fiches et les messages vocaux
(documents hors `htdocs`, servis par un script sous session, accès journalisé).

**Effort** — 5 à 8 jours. Le plus différenciant de la liste face à la
concurrence locale, mais aussi le plus lourd.

## 10. Preuve sociale

**Constat** — pas un témoignage, pas un avis, pas une référence de projet
livré, pas de mention des garanties ni de l'historique du promoteur. Pour un
achat à plusieurs centaines de milliers de dirhams, c'est le manque le plus
visible pour un visiteur qui découvre la marque.

**À construire** — témoignages d'acquéreurs (texte + photo, idéalement vidéo
courte : l'outillage vidéo existe déjà), page « projets livrés » avec dates et
photos, garanties et assurances, chiffres clés du promoteur, avis Google
intégrés si la fiche existe.

**Effort** — 1 à 2 jours de développement ; l'essentiel du travail est la
collecte du contenu côté métier.

## 11. Contenu éditorial et calculateur de frais

**État au 25/08/2026 — partiellement livré.** Le menu *Guides* existe, avec
cinq articles rédigés dans les quatre langues : coût réel d'un achat, achat sur
plan (VEFA), achat depuis l'étranger, crédit immobilier, choix du quartier à
Agadir. Ils sont en **brouillon** (`noindex` + bandeau visible) tant que les
chiffres marqués « À confirmer » n'ont pas été validés par le notaire, un
comptable et la direction commerciale. Circuit de publication : `docs/GUIDES.md`.

Restent à faire sur ce chantier : le **calculateur de frais d'acquisition**, les
actualités, et la validation puis la mise en ligne des cinq guides.

**Constat initial** — aucune page éditoriale. Or c'est à la fois le principal
levier SEO durable et un signal de sérieux.

**À construire**

- Guides : acheter au Maroc quand on est MRE, le prêt bancaire marocain,
  les frais de notaire et d'enregistrement, la VEFA et ce que garantit la loi,
  la fiscalité de la location. En 4 langues, au moins FR / AR pour commencer.
- **Calculateur de frais d'acquisition** — à placer à côté du simulateur de
  mensualité existant dans `project.js` : notaire, droits d'enregistrement,
  conservation foncière, avec un total « budget réel » à côté du prix affiché.
  C'est la question que tout acheteur pose au téléphone ; y répondre avant
  qu'elle soit posée crédibilise immédiatement.
- Actualités : lancements, avancements, événements.

**Effort** — 2 à 3 jours pour la mécanique ; la rédaction est un chantier
métier continu.

## 12. Prix en devises étrangères

**Constat** — la cible est explicitement internationale (quatre langues), mais
les prix sont en dirhams seulement.

**À construire** — affichage secondaire en EUR / USD, taux mis à jour
manuellement ou par appel quotidien, avec la mention « taux indicatif au
JJ/MM » et la devise de référence rappelée. Ne jamais laisser croire à un prix
ferme en devise.

**Effort** — 0,5 jour.

---

# Tier 4 — Exploitation et qualité

## 13. Exploitation

| Point | Constat | À faire |
|---|---|---|
| Sauvegarde de la base en prod | Documentée comme « recommandée » — donc manuelle | Tâche quotidienne `mysqldump` + chiffrement + rétention |
| Monitoring | Aucun | Sonde de disponibilité + alerte : le site est la vitrine commerciale |
| Accès admin | Mot de passe seul | 2FA au moins pour les comptes gestionnaire |
| Déploiement | Manuel, déjà identifié comme point ouvert | Automatiser la synchronisation vers le VPS |
| Limitation de débit | Présente sur le dépôt de messages | À généraliser aux endpoints publics (`fiche.php`, `parcours.php`) |

## 14. Accessibilité

`PRODUCT.md` vise WCAG AA et le support RTL complet. Le RTL est réel, mais la
conformité AA n'a jamais été **vérifiée** : contrastes en thème nocturne, focus
clavier, libellés de formulaires, textes alternatifs. Un audit outillé (axe /
Lighthouse) sur les six pages principales suffirait à savoir où on en est.

**Effort** — 1 jour d'audit ; correction variable selon les résultats.

---

# Séquencement conseillé

**Sprint 1 — voir et être vu (2 jours)**
SEO et partage social (1), puis entonnoir de mesure (2). Sans le premier
personne n'arrive ; sans le second on pilote à l'aveugle. Dans cet ordre, et
avant tout le reste : la mesure doit être en place *avant* les chantiers
suivants, sinon on ne saura pas s'ils ont servi.

**Sprint 2 — ne plus perdre de leads (4 jours)**
Suivi de lead (3), puis alertes et relances (4).

**Sprint 3 — convertir plus (5 jours)**
Recherche multi-projets (5), favoris par personne (6), rendez-vous (8).

**Sprint 4 — au choix de la direction**
Soit l'espace client VEFA (9) — le plus différenciant, le plus lourd —, soit le
bloc confiance (10 + 11), plus rapide et qui alimente aussi le SEO.

L'exploitation (13) se glisse en parallèle : la sauvegarde automatique de la
base devrait précéder tout le reste, c'est une demi-journée.

---

*Document de travail — à relire avant chaque sprint et à mettre à jour au fur
et à mesure que les lignes sont livrées.*
