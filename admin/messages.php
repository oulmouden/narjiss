<?php
/**
 * admin/messages.php — vue d'ensemble des messages laissés aux bureaux de vente.
 *
 * Les commerciaux traitent les messages de leur bureau depuis espace-agent.html ;
 * cet écran donne la vue globale, tous bureaux confondus : qui a laissé un
 * message, qui s'en occupe, ce qui a déjà été tenté, et la suppression.
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/../api/messages-lib.php';
require_once __DIR__ . '/../api/data.php';

admin_require_login();

$projets = nj_projects();
$statuts = nj_msg_statuts();

// ── Actions ────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int)($_POST['id'] ?? 0);
    $action = (string)($_POST['action'] ?? '');
    $m = $id ? nj_msg_get($id) : null;

    if (!$m) {
        set_flash('Message introuvable.');
    } elseif ($action === 'supprimer') {
        nj_msg_supprimer($id);
        set_flash('Message supprimé, enregistrement compris.');
    } elseif ($action === 'statut' && isset($statuts[$_POST['valeur'] ?? ''])) {
        $v = (string)$_POST['valeur'];
        nj_msg_db()->prepare('UPDATE messages SET statut = ? WHERE id = ?')->execute([$v, $id]);
        nj_msg_journal($id, 'statut', null, $statuts[$v] . ' (admin)');
        set_flash('Message classé : ' . $statuts[$v]);
    }
    header('Location: messages.php?' . http_build_query([
        'projet' => $_POST['projet_filtre'] ?? '', 'statut' => $_POST['statut_filtre'] ?? '',
    ]));
    exit;
}

$fProjet = preg_replace('/[^a-z0-9_]/', '', strtolower($_GET['projet'] ?? ''));
$fStatut = (string)($_GET['statut'] ?? '');
if ($fStatut !== '' && $fStatut !== 'actifs' && !isset($statuts[$fStatut])) $fStatut = '';

$messages = nj_msg_list($fProjet, $fStatut === '' ? '' : $fStatut, 300);
$nouveaux = nj_msg_nb_nouveaux();

admin_header('Messages');
?>
<style>
  .msg-filtres { display: flex; flex-wrap: wrap; gap: .6rem; align-items: flex-end; }
  .msg-filtres label { display: block; font-size: .8rem; color: #54627a; margin-bottom: .2rem; }
  .msg-corps { white-space: pre-wrap; max-width: 46ch; }
  .msg-corps .etiq { display: block; font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: #8a95a6; }
  .msg-auto { color: #54627a; font-style: italic; }
  .msg-tag { font-size: .78rem; font-weight: 700; padding: .1rem .5rem; border-radius: 999px; white-space: nowrap; }
  .msg-tag.nouveau { background: #dbeaff; color: #0b3f8f; }
  .msg-tag.ecoute  { background: #fff2d6; color: #7a5900; }
  .msg-tag.traite  { background: #d9f5e4; color: #10633a; }
  .msg-tag.archive { background: #eceff3; color: #54627a; }
  td.msg-actions form { display: inline; }
  audio { max-width: 230px; }
</style>

<div class="panel">
  <h1>Messages des bureaux de vente
    <?php if ($nouveaux): ?><span class="msg-tag nouveau"><?= $nouveaux ?> non ouvert<?= $nouveaux > 1 ? 's' : '' ?></span><?php endif; ?>
  </h1>
  <p>Déposés par les visiteurs quand aucun commercial n'est joignable. Le rappel se fait
     depuis <a href="../espace-agent.html" target="_blank" rel="noopener">l'espace commercial</a> ;
     cet écran sert au suivi et au ménage.</p>
</div>

<form method="get" class="panel msg-filtres">
  <div>
    <label for="f-projet">Bureau</label>
    <select name="projet" id="f-projet">
      <option value="">Tous les bureaux</option>
      <option value="<?= NJ_MSG_PROJET_GENERAL ?>"<?= $fProjet === NJ_MSG_PROJET_GENERAL ? ' selected' : '' ?>>Renseignement général (formulaire de contact)</option>
      <?php foreach ($projets as $key => $p): ?>
        <option value="<?= htmlspecialchars($key) ?>"<?= $key === $fProjet ? ' selected' : '' ?>>
          <?= htmlspecialchars(nj_msg_projet_nom($key)) ?>
        </option>
      <?php endforeach; ?>
    </select>
  </div>
  <div>
    <label for="f-statut">Statut</label>
    <select name="statut" id="f-statut">
      <option value="">Tous</option>
      <option value="actifs"<?= $fStatut === 'actifs' ? ' selected' : '' ?>>À traiter</option>
      <?php foreach ($statuts as $k => $lbl): ?>
        <option value="<?= $k ?>"<?= $k === $fStatut ? ' selected' : '' ?>><?= htmlspecialchars($lbl) ?></option>
      <?php endforeach; ?>
    </select>
  </div>
  <button type="submit">Filtrer</button>
</form>

<div class="panel">
  <?php if (!$messages): ?>
    <p>Aucun message dans cette vue.</p>
  <?php else: ?>
    <table>
      <thead>
        <tr><th>Reçu</th><th>Bureau</th><th>Visiteur</th><th>Message</th><th>Écoute</th><th>Suivi</th><th></th></tr>
      </thead>
      <tbody>
      <?php foreach ($messages as $m):
        $actions = nj_msg_actions((int)$m['id']);
      ?>
        <tr>
          <td><?= htmlspecialchars(date('d/m/Y H:i', strtotime($m['created_at']))) ?></td>
          <td><?= htmlspecialchars(nj_msg_projet_nom($m['projet'])) ?></td>
          <td>
            <b><?= htmlspecialchars($m['visiteur_nom'] !== '' ? $m['visiteur_nom'] : 'Anonyme') ?></b><br>
            <?php if ($m['telephone'] !== ''): ?>
              <a href="<?= htmlspecialchars(nj_msg_lien_whatsapp($m['telephone'])) ?>" target="_blank" rel="noopener">
                <?= htmlspecialchars(nj_msg_tel_affiche($m['telephone'])) ?></a><br>
            <?php endif; ?>
            <?php if ($m['email'] !== ''): ?><small><?= htmlspecialchars($m['email']) ?></small><?php endif; ?>
            <?php if ($m['canal'] === 'hotesse'): ?><br><small>pris par l'hôtesse IA</small><?php endif; ?>
          </td>
          <td class="msg-corps">
            <?php if (!empty($m['message_texte'])): ?>
              <span class="etiq">Écrit</span><?= htmlspecialchars($m['message_texte']) ?>
            <?php endif; ?>
            <?php if (!empty($m['transcription'])): ?>
              <span class="etiq">Transcription — à vérifier</span>
              <span class="msg-auto"><?= htmlspecialchars($m['transcription']) ?></span>
            <?php endif; ?>
          </td>
          <td>
            <?php if ($m['audio_fichier'] !== ''): ?>
              <audio controls preload="none" src="../api/message-audio.php?msg=<?= (int)$m['id'] ?>"></audio>
              <br><small><?= (int)floor((int)$m['duree_s'] / 60) ?>:<?= str_pad((string)((int)$m['duree_s'] % 60), 2, '0', STR_PAD_LEFT) ?></small>
            <?php else: ?>
              <small>—</small>
            <?php endif; ?>
          </td>
          <td>
            <span class="msg-tag <?= htmlspecialchars($m['statut']) ?>"><?= htmlspecialchars($statuts[$m['statut']]) ?></span>
            <?php if ($m['pris_nom'] !== ''): ?><br><small>🙋 <?= htmlspecialchars($m['pris_nom']) ?></small><?php endif; ?>
            <?php if ($actions): ?>
              <br><small><?= count($actions) ?> suite<?= count($actions) > 1 ? 's' : '' ?> donnée<?= count($actions) > 1 ? 's' : '' ?> —
              <?= htmlspecialchars(implode(', ', array_slice(array_unique(array_column($actions, 'type')), 0, 4))) ?></small>
            <?php endif; ?>
          </td>
          <td class="msg-actions">
            <form method="post">
              <input type="hidden" name="id" value="<?= (int)$m['id'] ?>">
              <input type="hidden" name="projet_filtre" value="<?= htmlspecialchars($fProjet) ?>">
              <input type="hidden" name="statut_filtre" value="<?= htmlspecialchars($fStatut) ?>">
              <input type="hidden" name="action" value="statut">
              <input type="hidden" name="valeur" value="<?= $m['statut'] === 'archive' ? 'nouveau' : 'archive' ?>">
              <button type="submit"><?= $m['statut'] === 'archive' ? 'Désarchiver' : 'Archiver' ?></button>
            </form>
            <form method="post" onsubmit="return confirm('Supprimer ce message et son enregistrement ?');">
              <input type="hidden" name="id" value="<?= (int)$m['id'] ?>">
              <input type="hidden" name="projet_filtre" value="<?= htmlspecialchars($fProjet) ?>">
              <input type="hidden" name="statut_filtre" value="<?= htmlspecialchars($fStatut) ?>">
              <input type="hidden" name="action" value="supprimer">
              <button type="submit" class="danger">Supprimer</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  <?php endif; ?>
</div>
<?php admin_footer(); ?>
