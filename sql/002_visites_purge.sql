-- =====================================================================
--  Narjiss — la purge RGPD doit emporter les demandes de visite
--
--  Constat : `visites.fiche_reference` etait en ON DELETE SET NULL. Quand
--  api/purge-fiches.php supprimait une fiche arrivee au terme de sa duree de
--  conservation, la ligne de `visites` restait — avec sa date, son projet et
--  son conseiller. C'est une donnee personnelle qui survivait a la purge,
--  ce qui vide de sens la duree annoncee au client dans le formulaire.
--
--  On passe donc en CASCADE : effacer la personne efface son rendez-vous.
--
--  `parcours_sessions.fiche_reference` reste volontairement en SET NULL :
--  la session ne porte que le jeton, le canal et les criteres de recherche.
--  La detacher de la fiche l'anonymise, ce qui preserve les statistiques de
--  frequentation des bornes sans conserver d'identifiant personnel.
--
--  mysql --defaults-extra-file=C:/xampp/mysql/bin/narjiss.cnf narjiss \
--    < sql/002_visites_purge.sql
-- =====================================================================

SET NAMES utf8mb4;

-- Les visites deja orphelines (fiche supprimee avant ce correctif) n'ont plus
-- aucun interlocuteur : elles auraient du partir avec leur fiche.
DELETE FROM `visites` WHERE `fiche_reference` IS NULL AND `session_id` IS NULL;

ALTER TABLE `visites` DROP FOREIGN KEY `fk_visite_fiche`;
ALTER TABLE `visites`
  ADD CONSTRAINT `fk_visite_fiche` FOREIGN KEY (`fiche_reference`)
      REFERENCES `fiches` (`reference`) ON DELETE CASCADE ON UPDATE CASCADE;
