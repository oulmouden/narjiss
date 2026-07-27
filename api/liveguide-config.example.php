<?php

declare(strict_types=1);

/*
 * VISITE GUIDÉE EN DIRECT — Configuration SECRÈTE (côté serveur)
 * -------------------------------------------------------------
 * 1. Copier ce fichier en "liveguide-config.php" (même dossier).
 * 2. Renseigner les 4 valeurs depuis le dashboard Pusher :
 *    ton app Channels → onglet "App Keys".
 * 3. liveguide-config.php est ignoré par git (voir .gitignore) :
 *    le SECRET ne doit jamais être committé.
 */

const LIVEGUIDE_PUSHER_APP_ID  = 'REMPLACER_APP_ID';
const LIVEGUIDE_PUSHER_KEY     = 'REMPLACER_KEY';
const LIVEGUIDE_PUSHER_SECRET  = 'REMPLACER_SECRET';
const LIVEGUIDE_PUSHER_CLUSTER = 'eu';
