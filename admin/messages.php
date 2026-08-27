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

/** Nom d'un bureau dans la langue de l'admin, cas du renseignement général
    compris. nj_msg_projet_nom() ne prend pas de langue et sert l'API ; on la
    double ici plutôt que de la changer sous les pieds de l'espace commercial. */
function admin_msg_bureau(string $id): string
{
    return $id === NJ_MSG_PROJET_GENERAL ? t_brut('msg_general_court') : nj_project_name($id, admin_lang());
}

/* Libellé traduit d'un statut de message. nj_msg_statuts() (api/messages-lib.php)
   sert aussi l'API de l'espace commercial : on ne la traduit pas, on double sa
   table côté admin. Les clés, elles, restent celles de la base. */
function admin_msg_statut(string $cle): string
{
    return t_brut('msg_statut_' . $cle);
}

$projets = nj_projects();
$statuts = nj_msg_statuts();

// ── Actions ────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int)($_POST['id'] ?? 0);
    $action = (string)($_POST['action'] ?? '');
    $m = $id ? nj_msg_get($id) : null;

    if (!$m) {
        set_flash(t_brut('msg_introuvable'));
    } elseif ($action === 'supprimer') {
        nj_msg_supprimer($id);
        set_flash(t_brut('msg_supprime'));
    } elseif ($action === 'statut' && isset($statuts[$_POST['valeur'] ?? ''])) {
        $v = (string)$_POST['valeur'];
        nj_msg_db()->prepare('UPDATE messages SET statut = ? WHERE id = ?')->execute([$v, $id]);
        // Le journal garde le libellé FRANÇAIS : il est relu par tous, y
        // compris par un collègue qui travaille dans une autre langue.
        nj_msg_journal($id, 'statut', null, $statuts[$v] . ' (admin)');
        set_flash(t_brut('msg_classe', ['s' => admin_msg_statut($v)]));
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

admin_header(t_brut('nav_messages'));
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
  <h1><?= t('msg_titre') ?>
    <?php if ($nouveaux): ?><span class="msg-tag nouveau"><?= t('msg_non_ouverts', ['n' => $nouveaux]) ?></span><?php endif; ?>
  </h1>
  <?php /* t_brut : la phrase porte le lien vers l'espace commercial. */ ?>
  <p><?= t_brut('msg_intro', ['lien' => '<a href="../espace-agent.html" target="_blank" rel="noopener">' . t('nav_commercial') . '</a>']) ?></p>
</div>

<form method="get" class="panel msg-filtres">
  <div>
    <label for="f-projet"><?= t('msg_bureau') ?></label>
    <select name="projet" id="f-projet">
      <option value=""><?= t('msg_tous_bureaux') ?></option>
      <option value="<?= NJ_MSG_PROJET_GENERAL ?>"<?= $fProjet === NJ_MSG_PROJET_GENERAL ? ' selected' : '' ?>><?= t('msg_general') ?></option>
      <?php foreach ($projets as $key => $p): ?>
        <option value="<?= htmlspecialchars($key) ?>"<?= $key === $fProjet ? ' selected' : '' ?>>
          <?= htmlspecialchars(admin_msg_bureau((string)$key)) ?>
        </option>
      <?php endforeach; ?>
    </select>
  </div>
  <div>
    <label for="f-statut"><?= t('th_statut') ?></label>
    <select name="statut" id="f-statut">
      <option value=""><?= t('f_tous') ?></option>
      <option value="actifs"<?= $fStatut === 'actifs' ? ' selected' : '' ?>><?= t('msg_a_traiter') ?></option>
      <?php foreach ($statuts as $k => $lbl): ?>
        <option value="<?= $k ?>"<?= $k === $fStatut ? ' selected' : '' ?>><?= t('msg_statut_' . $k) ?></option>
      <?php endforeach; ?>
    </select>
  </div>
  <button type="submit"><?= t('bt_filtrer') ?></button>
</form>

<div class="panel">
  <?php if (!$messages): ?>
    <p><?= t('msg_aucun') ?></p>
  <?php else: ?>
    <table>
      <thead>
        <tr><th><?= t('msg_th_recu') ?></th><th><?= t('msg_bureau') ?></th><th><?= t('msg_th_visiteur') ?></th><th><?= t('nav_messages') ?></th><th><?= t('msg_th_ecoute') ?></th><th><?= t('msg_th_suivi') ?></th><th></th></tr>
      </thead>
      <tbody>
      <?php foreach ($messages as $m):
        $actions = nj_msg_actions((int)$m['id']);
      ?>
        <tr>
          <td><?= htmlspecialchars(date('d/m/Y H:i', strtotime($m['created_at']))) ?></td>
          <td><?= htmlspecialchars(admin_msg_bureau((string)$m['projet'])) ?></td>
          <td>
            <b><?= htmlspecialchars($m['visiteur_nom'] !== '' ? $m['visiteur_nom'] : t_brut('msg_anonyme')) ?></b><br>
            <?php if ($m['telephone'] !== ''): ?>
              <a href="<?= htmlspecialchars(nj_msg_lien_whatsapp($m['telephone'])) ?>" target="_blank" rel="noopener">
                <?= htmlspecialchars(nj_msg_tel_affiche($m['telephone'])) ?></a><br>
            <?php endif; ?>
            <?php if ($m['email'] !== ''): ?><small><?= htmlspecialchars($m['email']) ?></small><?php endif; ?>
            <?php if ($m['canal'] === 'hotesse'): ?><br><small><?= t('msg_par_hotesse') ?></small><?php endif; ?>
          </td>
          <td class="msg-corps">
            <?php if (!empty($m['message_texte'])): ?>
              <span class="etiq"><?= t('msg_ecrit') ?></span><?= htmlspecialchars($m['message_texte']) ?>
            <?php endif; ?>
            <?php if (!empty($m['transcription'])): ?>
              <span class="etiq"><?= t('msg_transcription') ?></span>
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
            <span class="msg-tag <?= htmlspecialchars($m['statut']) ?>"><?= t('msg_statut_' . $m['statut']) ?></span>
            <?php if ($m['pris_nom'] !== ''): ?><br><small>🙋 <?= htmlspecialchars($m['pris_nom']) ?></small><?php endif; ?>
            <?php if ($actions): ?>
              <br><small><?= t('msg_suites', ['n' => count($actions)]) ?> —
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
              <button type="submit"><?= t($m['statut'] === 'archive' ? 'msg_desarchiver' : 'msg_archiver') ?></button>
            </form>
            <form method="post" onsubmit="return confirm('<?= t('msg_confirm_suppr') ?>');">
              <input type="hidden" name="id" value="<?= (int)$m['id'] ?>">
              <input type="hidden" name="projet_filtre" value="<?= htmlspecialchars($fProjet) ?>">
              <input type="hidden" name="statut_filtre" value="<?= htmlspecialchars($fStatut) ?>">
              <input type="hidden" name="action" value="supprimer">
              <button type="submit" class="danger"><?= t('bt_supprimer') ?></button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  <?php endif; ?>
</div>
<?php admin_footer(); ?>
