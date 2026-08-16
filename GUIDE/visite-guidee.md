# Visite guidée en direct

Permet à un conseiller de **guider des visiteurs sur tout le site Narjiss** en
temps réel : quand le conseiller change de page ou fait défiler l'écran, la page
des visiteurs **suit automatiquement**. Sens unique — les visiteurs regardent.
La **voix est bidirectionnelle** : le conseiller commente, et le visiteur peut
prendre la parole pour poser ses questions, sans appel téléphonique séparé.

L'accès est protégé par un **code à 6 chiffres** que le conseiller communique de
vive voix, à la manière du Live Tour de 3DVista (voir §4).

Ce n'est pas le « Live Tour » de 3DVista (limité au tour 360°) : ici c'est **tout
le site** qui est synchronisé (accueil, fiches projets, carte, galeries…).

---

## 1. Configuration (une seule fois)

### a) Créer une app Pusher (gratuit)

1. Créer un compte sur https://pusher.com → **Channels**.
2. Créer une app (choisir un **cluster** proche, ex. `eu`).
3. Onglet **App Keys** : noter `app_id`, `key`, `secret`, `cluster`.
4. Onglet **App Settings** : activer **« Enable client events »** ✅
   (indispensable — c'est ce qui autorise le navigateur de l'hôte à diffuser).

### b) Renseigner les clés

**Côté serveur (secret)** — copier le modèle puis remplir :

```bash
cp api/liveguide-config.example.php api/liveguide-config.php
```

Éditer `api/liveguide-config.php` avec `app_id`, `key`, `secret`, `cluster`.
Ce fichier est **ignoré par git** (le secret ne doit jamais être committé).

**Côté client (public)** — éditer `shared/liveguide-config.js` :

```js
window.LIVEGUIDE_CONFIG = {
  enabled: true,                 // ← passer à true une fois configuré
  pusherKey: 'votre_key',        // ← "key" (publique)
  pusherCluster: 'eu'            // ← même cluster
};
```

> `key` et `cluster` sont publics (sans danger dans le dépôt). Seul le `secret`
> reste côté serveur.

### c) MySQL

Rien à faire : les sessions vivent dans la table `liveguide_sessions`, **créée
automatiquement** au premier usage via `api/db.php` (mêmes identifiants que les
fiches, dans `api/.env`). Si la base est injoignable, la visite guidée refuse de
démarrer plutôt que de s'ouvrir sans contrôle.

---

## 2. Utilisation

### Conseiller (hôte)
1. Ouvrir n'importe quelle page du site en ajoutant `?lghost=1` à l'URL,
   par exemple : `https://…/index.html?lghost=1`
2. Une **barre verte** apparaît en bas. Elle affiche un **code à 6 chiffres** et
   un bouton **« Copier le lien visiteur »**.
3. Envoyer le lien au client (WhatsApp, SMS, mail) puis lui **dire le code de
   vive voix** (téléphone, WhatsApp, ou juste avant de raccrocher).

   > Le code n'est **pas** dans le lien, et c'est voulu : un lien qui le
   > contiendrait ne protégerait plus rien. Un lien transféré à un tiers ne lui
   > ouvre donc pas la visite.
4. **Voix (option)** : cliquer **« 🎙️ Activer le micro »** (le navigateur demande
   l'autorisation). Ta voix est alors diffusée aux visiteurs.
5. Naviguer normalement : chaque page / défilement est répercuté chez le visiteur.
   La barre indique le **nombre de spectateurs connectés**, et **« 🎤 n »** quand
   des visiteurs ont pris la parole — tu les entends sans rien faire de plus,
   même si ton propre micro est coupé.
6. Cliquer **« Terminer »** pour clore la session.

### Visiteur
1. Cliquer sur le lien reçu (`…/index.html?lg=XXXX`).
2. Un écran demande le **code à 6 chiffres** communiqué par le conseiller. Il
   n'est saisi **qu'une fois** : le visiteur peut ensuite être emmené de page en
   page sans le retaper. Le bouton « Visiter librement » permet de refuser la
   visite et de naviguer normalement.
3. Une bannière « Visite guidée en cours » s'affiche : sa page **suit le conseiller**.
4. Si la voix est active, un bouton **« 🔊 Activer le son »** peut apparaître
   (les navigateurs bloquent le son automatique) → un clic et il entend le conseiller.
5. **« 🎙️ Prendre la parole »** pour répondre : le navigateur demande
   l'autorisation micro, puis le bouton affiche « Vous parlez ». Un second clic
   rend la parole et **libère réellement le micro**.
6. Bouton **« Quitter »** pour reprendre une navigation libre.

> **Voix — prérequis** : le site doit être en **HTTPS** (le micro est bloqué en
> HTTP sauf sur `localhost`) — vrai pour le conseiller **comme pour le
> visiteur**. En test sur le réseau local en HTTP, le bouton affichera
> « Micro indisponible ». En cross-réseau, ~20-30% des cas nécessitent un
> serveur **TURN** (voir `shared/liveguide-config.js`, champ `turn`). STUN public
> suffit dans la majorité des cas.

> **Pourquoi c'est le conseiller qui relance la négociation** : quand un visiteur
> prend la parole, il ne fabrique pas l'offre WebRTC lui-même — il envoie une
> demande, et l'hôte réémet l'offre. Si les deux côtés pouvaient offrir en même
> temps, la négociation se bloquerait (« glare »). L'offre part donc toujours du
> même côté.

---

## 3. Limites de cette v1
- **Écran à sens unique** : le visiteur suit, il ne pilote pas (choix voulu).
  La **voix**, elle, va dans les deux sens depuis la v2.
- **Tours 360°** : deux cas, selon la visionneuse.
  - **`tour-360.html` (Pannellum, la nôtre)** : tout est synchronisé — angle,
    zoom **et changement de pièce**. Voir [tour-pannellum.md](tour-pannellum.md).
  - **Lecteur 3DVista (`<tour>/index.htm`)** : le visiteur arrive bien sur la
    même page, mais l'intérieur du tour reste hors de portée — c'est un lecteur
    tiers dans lequel nous n'avons pas la main. Le conseiller commente à la voix,
    ou bascule sur `tour-360.html`.
- **Voix cross-réseau** : STUN public suffit dans la majorité des cas ; prévoir
  un TURN pour les réseaux très restrictifs (voir champ `turn` de la config).

---

## 4. Contrôle d'accès

Une session est créée **par le serveur** et porte deux secrets distincts :

| Secret | Détenteur | Rôle |
|---|---|---|
| **Code à 6 chiffres** | le visiteur | autorise à *rejoindre* la visite |
| **Jeton hôte** (32 car.) | le conseiller seul | autorise à *piloter* la visite |

Ce que ça change concrètement :

- **Le lien seul ne suffit plus.** Transféré à un tiers, il ne donne rien.
- **Un visiteur ne peut pas prendre la main.** Sur un canal de présence, Pusher
  laisse *tout* membre émettre des « client events » : avant, un visiteur muni
  du lien pouvait diffuser à la place du conseiller et renvoyer tous les autres
  vers l'URL de son choix. Le rôle est maintenant inscrit dans `channel_data`,
  donc **signé par le serveur**, et le visiteur n'écoute que le membre de rôle
  `host`.
- **« Terminer » révoque vraiment.** La session passe à `ended` : ni le lien ni
  le code ne rouvrent le tour ensuite.
- **Expiration automatique** au bout de 8 h (`LG_SESSION_TTL_HOURS`).
- **Force brute plafonnée** : 20 codes faux et la saisie se ferme
  (`LG_MAX_CODE_ATTEMPTS`). Le conseiller n'est pas affecté — il garde la main
  sur sa session et peut en relancer une.

> Le plafond a une contrepartie assumée : quelqu'un qui détient le lien peut
> brûler les 20 essais et bloquer l'entrée des vrais visiteurs. Le conseiller
> relance alors une session — quelques secondes, contre un tour ouvert à tous.

---

## 5. Détails techniques
- Transport : **Pusher Channels**, canal de présence `presence-lg-<session>`.
- L'hôte diffuse des événements `client-state` `{ url, scroll }` (scroll throttlé
  ~150 ms + battement toutes les 4 s pour resynchroniser les retardataires).
- Auth : `api/pusher-auth.php` signe l'abonnement en HMAC-SHA256 (secret côté
  serveur). **C'est le seul vrai point de contrôle** : il refuse de signer sans
  le bon code (visiteur) ou le bon jeton (hôte). L'écran de saisie n'est qu'un
  confort d'usage — le contourner n'ouvre rien.
- Sessions : table `liveguide_sessions` en MySQL, **créée à la volée** au premier
  appel (comme `agents-lib.php`) — aucune étape SQL manuelle. Le jeton hôte n'y
  est stocké que sous forme de SHA-256.
- Chargement : injecté par `shared/menu.js` sur toutes les pages ; le SDK Pusher
  n'est téléchargé **que** si une session est active → **zéro impact** sur les
  visiteurs normaux.
- Cache : après toute modification de `liveguide.*`, bumper `LIVEGUIDE_VERSION`
  dans `shared/menu.js` **et** le `?v=` de `menu.js` dans les pages HTML
  (voir le commentaire en tête de ce bloc dans `menu.js`).
- Fichiers : `shared/liveguide.js`, `shared/liveguide.css`,
  `shared/liveguide-config.js`, `api/pusher-auth.php`, `api/liveguide-lib.php`,
  `api/liveguide-session.php`, `api/liveguide-config.php`.
