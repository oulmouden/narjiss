<?php

declare(strict_types=1);

const NARJISS_ADMIN_USER = 'admin';
const NARJISS_ADMIN_PASSWORD_HASH = '$2y$10$.AEGfEs1dLl7Cy7iVaRYM.6EhycM/S3FvepmIa/ESJZRHa0GVdpsa';
const NARJISS_PROJECTS_FILE = __DIR__ . '/../../data/projects.json';
const NARJISS_PROJECT_SLIDERS_FILE = __DIR__ . '/../../data/project-sliders.json';
// Coordonnées publiques : téléphones, e-mail, adresse, réseaux sociaux.
// Lues par shared/menu.js pour le pied de page, la page contact et le lanceur
// « On en parle ? ». Éditées depuis admin/coordonnees.php.
const NARJISS_CONTACTS_FILE = __DIR__ . '/../../data/contacts.json';
const NARJISS_BACKUP_DIR = __DIR__ . '/../../data/backups';
