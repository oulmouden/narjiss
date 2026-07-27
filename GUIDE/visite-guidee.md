# Visite guidée en direct

Permet à un conseiller de **guider des visiteurs sur tout le site Narjiss** en
temps réel : quand le conseiller change de page ou fait défiler l'écran, la page
des visiteurs **suit automatiquement**. Sens unique — les visiteurs regardent.
La voix passe par un **appel WhatsApp en parallèle** (rien à installer côté voix).

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

---

## 2. Utilisation

### Conseiller (hôte)
1. Ouvrir n'importe quelle page du site en ajoutant `?lghost=1` à l'URL,
   par exemple : `https://…/index.html?lghost=1`
2. Une **barre verte** apparaît en bas → cliquer **« Copier le lien visiteur »**.
3. Envoyer ce lien au client (WhatsApp, SMS, mail).
4. **Voix intégrée (option)** : cliquer **« 🎙️ Activer le micro »** (le navigateur
   demande l'autorisation micro). Ta voix est alors diffusée aux visiteurs.
   Sinon, tu peux garder un **appel WhatsApp** en parallèle.
5. Naviguer normalement : chaque page / défilement est répercuté chez le visiteur.
   La barre indique le **nombre de spectateurs connectés**.
6. Cliquer **« Terminer »** pour clore la session.

### Visiteur
1. Cliquer sur le lien reçu (`…/index.html?lg=XXXX`).
2. Une bannière « Visite guidée en cours » s'affiche : sa page **suit le conseiller**.
3. Si la voix est active, un bouton **« 🔊 Activer le son »** peut apparaître
   (les navigateurs bloquent le son automatique) → un clic et il entend le conseiller.
4. Bouton **« Quitter »** pour reprendre une navigation libre.

> **Voix — prérequis** : le site doit être en **HTTPS** (le micro est bloqué en
> HTTP sauf sur `localhost`). En cross-réseau, ~20-30% des cas nécessitent un
> serveur **TURN** (voir `shared/liveguide-config.js`, champ `turn`). STUN public
> suffit dans la majorité des cas.

---

## 3. Limites de cette v1
- **Sens unique** : le visiteur suit, il ne pilote pas (choix voulu). La voix
  aussi est à sens unique (hôte → visiteurs).
- **Tours 360° 3DVista** : le visiteur arrive bien sur la **même page** de tour,
  mais la rotation/déplacement *à l'intérieur* du tour n'est pas synchronisée
  (le conseiller commente à la voix). Synchronisable plus tard si besoin.
- **Voix cross-réseau** : STUN public suffit dans la majorité des cas ; prévoir
  un TURN pour les réseaux très restrictifs (voir champ `turn` de la config).

---

## 4. Détails techniques
- Transport : **Pusher Channels**, canal de présence `presence-lg-<session>`.
- L'hôte diffuse des événements `client-state` `{ url, scroll }` (scroll throttlé
  ~150 ms + battement toutes les 4 s pour resynchroniser les retardataires).
- Auth : `api/pusher-auth.php` signe l'abonnement en HMAC-SHA256 (secret côté serveur).
- Chargement : injecté par `shared/menu.js` sur toutes les pages ; le SDK Pusher
  n'est téléchargé **que** si une session est active → **zéro impact** sur les
  visiteurs normaux.
- Fichiers : `shared/liveguide.js`, `shared/liveguide.css`,
  `shared/liveguide-config.js`, `api/pusher-auth.php`, `api/liveguide-config.php`.
