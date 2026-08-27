<?php

declare(strict_types=1);

const NARJISS_ADMIN_USER = 'admin';
const NARJISS_ADMIN_PASSWORD_HASH = '$2y$10$.AEGfEs1dLl7Cy7iVaRYM.6EhycM/S3FvepmIa/ESJZRHa0GVdpsa';
const NARJISS_PROJECTS_FILE = __DIR__ . '/../../data/projects.json';
const NARJISS_PROJECT_SLIDERS_FILE = __DIR__ . '/../../data/project-sliders.json';
const NARJISS_BACKUP_DIR = __DIR__ . '/../../data/backups';

/* NARJISS_CONTACTS_FILE (data/contacts.json, écran « Coordonnées ») n'est
   volontairement PAS ici mais dans includes/storage.php : deploy.sh exclut ce
   fichier-ci du déploiement, si bien qu'une constante ajoutée ici n'atteindrait
   jamais le VPS. Même règle pour tout nouveau chemin à l'avenir. */
