<?php

declare(strict_types=1);

/**
 * admin/agents.php — validation des comptes agents commerciaux et gestionnaires.
 *
 * L'inscription (espace-agent.html) crée des comptes « en attente ». Cette page
 * permet à l'administrateur de les activer, suspendre ou réactiver. Les
 * gestionnaires peuvent aussi valider les commerciaux de leur bureau depuis
 * leur propre espace, mais l'admin reste l'autorité pour les gestionnaires.
 */

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/../api/agents-lib.php';
require_once __DIR__ . '/../api/data.php';

admin_require_login();

/**
 * Création d'un compte par l'administrateur.
 *
 * Contrairement à l'auto-inscription depuis espace-agent.html, qui dépose un
 * compte « en attente », l'admin est déjà l'autorité de validation : le compte
 * est donc activé dans la foulée. C'est aussi le seul chemin pour créer
 * directement un superviseur, rôle non proposé à l'auto-inscription.
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['do'] ?? '') === 'create') {
    $name   = trim($_POST['name'] ?? '');
    $email  = trim($_POST['email'] ?? '');
    $pass   = (string)($_POST['password'] ?? '');
    $role   = in_array(($_POST['role'] ?? ''), ['commercial', 'gestionnaire', 'superviseur'], true)
        ? $_POST['role'] : 'commercial';
    // Périmètre : « tous les bureaux » (valeur vide en base, cas historique du
    // superviseur) ou une sélection, stockée en liste séparée par des virgules.
    $tousBureaux = ($_POST['perimetre'] ?? 'selection') === 'tous';
    $projet = $tousBureaux ? '' : nj_agent_projets_texte((array)($_POST['projets'] ?? []));
    $tel    = trim($_POST['telephone'] ?? '');
    $wa     = trim($_POST['whatsapp'] ?? '');

    // Un superviseur couvre tous les bureaux : il n'est rattaché à aucun.
    if ($role === 'superviseur') $projet = '';

    if ($name === '' || strpos($email, '@') === false || strlen($pass) < 6) {
        set_flash(t_brut('ag_err_champs'));
    } elseif ($role === 'commercial' && $projet === '' && !$tousBureaux) {
        set_flash(t_brut('ag_err_bureau'));
    } else {
        try {
            $newId = nj_agent_create($name, $email, $pass, $role, $projet, $tel, $wa);
            nj_agent_set_status($newId, 'active');
            set_flash(t_brut('ag_cree', ['nom' => $name]));
        } catch (RuntimeException $e) {
            set_flash($e->getMessage());
        }
    }
    header('Location: agents.php');
    exit;
}

// Traitement des actions (activer / suspendre).
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id     = (int)($_POST['agent_id'] ?? 0);
    $do     = $_POST['do'] ?? '';
    $target = $id ? nj_agent_by_id($id) : null;
    if ($target) {
        if ($do === 'activate') {
            nj_agent_set_status($id, 'active');
            set_flash(t_brut('ag_active', ['nom' => $target['name']]));
        } elseif ($do === 'suspend') {
            nj_agent_set_status($id, 'suspended');
            set_flash(t_brut('ag_suspendu', ['nom' => $target['name']]));
        } elseif ($do === 'setrole') {
            $role = $_POST['role'] ?? '';
            if (nj_agent_set_role($id, $role)) {
                set_flash(t_brut('ag_role_defini', ['nom' => $target['name'], 'role' => t_brut('ag_role_' . $role)]));
            }
        } elseif ($do === 'delete') {
            // Sans retour : on exige que le compte soit d'abord suspendu (ou
            // encore en attente). Supprimer un actif en un clic depuis une
            // liste de comptes qui se ressemblent finit toujours mal.
            if ($target['statut'] === 'active') {
                set_flash(t_brut('ag_suspendre_avant', ['nom' => $target['name']]));
            } elseif (nj_agent_delete($id)) {
                set_flash(t_brut('ag_supprime', ['nom' => $target['name']]));
            }
        }
    }
    header('Location: agents.php');
    exit;
}

$agents  = nj_agents_list();
$pending = array_filter($agents, fn($a) => $a['statut'] === 'pending');
$others  = array_filter($agents, fn($a) => $a['statut'] !== 'pending');

/** Rendu d'une ligne de tableau agent. */
function nj_agent_row(array $a): void
{
    // Les clés (commercial, pending…) sont celles de la base ; seuls les
    // libellés changent de langue.
    $roleLbl = t('ag_role_' . $a['role']);
    $pill    = t('ag_statut_' . $a['statut']);
    ?>
    <tr>
        <td><?= htmlspecialchars($a['name']) ?><br><small style="color:#7a879a"><?= htmlspecialchars($a['email']) ?></small></td>
        <td><?= $roleLbl ?></td>
        <td><?php
            $ids = nj_agent_projets($a['projet']);
            if (!$ids) {
                echo '<em>' . t('ag_tous_bureaux') . '</em>';
            } else {
                echo htmlspecialchars(implode(', ', array_map(
                    fn(string $pid): string => nj_project_name($pid, admin_lang()), $ids)));
            }
        ?></td>
        <td><span class="tag tag-<?= $a['statut'] ?>"><?= $pill ?></span></td>
        <td>
            <?php if ($a['statut'] !== 'active'): ?>
                <form method="post" style="display:inline">
                    <input type="hidden" name="agent_id" value="<?= (int)$a['id'] ?>">
                    <input type="hidden" name="do" value="activate">
                    <button class="button" type="submit"><?= t('ag_activer') ?></button>
                </form>
            <?php endif; ?>
            <?php if ($a['statut'] === 'active'): ?>
                <form method="post" style="display:inline" onsubmit="return confirm('<?= t('ag_confirm_suspend') ?>');">
                    <input type="hidden" name="agent_id" value="<?= (int)$a['id'] ?>">
                    <input type="hidden" name="do" value="suspend">
                    <button class="button secondary" type="submit"><?= t('ag_suspendre') ?></button>
                </form>
            <?php endif; ?>
            <form method="post" style="display:inline-flex;gap:.3rem;align-items:center;margin-left:.4rem">
                <input type="hidden" name="agent_id" value="<?= (int)$a['id'] ?>">
                <input type="hidden" name="do" value="setrole">
                <select name="role">
                    <?php foreach (['commercial', 'gestionnaire', 'superviseur'] as $rv): ?>
                        <option value="<?= $rv ?>"<?= $a['role'] === $rv ? ' selected' : '' ?>><?= t('ag_role_' . $rv) ?></option>
                    <?php endforeach; ?>
                </select>
                <button class="button secondary" type="submit" title="<?= t('ag_changer_role_aide') ?>"><?= t('ag_changer_role') ?></button>
            </form>
            <?php if ($a['statut'] !== 'active'): ?>
                <form method="post" style="display:inline"
                      onsubmit="return confirm('<?= t('ag_confirm_suppr', ['nom' => addslashes($a['name'])]) ?>');">
                    <input type="hidden" name="agent_id" value="<?= (int)$a['id'] ?>">
                    <input type="hidden" name="do" value="delete">
                    <button class="button secondary" type="submit" style="color:#b42318"><?= t('bt_supprimer') ?></button>
                </form>
            <?php endif; ?>
        </td>
    </tr>
    <?php
}

admin_header(t_brut('nav_agents'));
$flash = flash_message();
?>
<section class="panel">
    <h1><?= t('ag_titre') ?></h1>
    <?php if ($flash): ?><p class="flash"><?= htmlspecialchars($flash) ?></p><?php endif; ?>

    <style>
        table.agents { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        table.agents th, table.agents td { text-align: left; padding: .6rem .5rem; border-bottom: 1px solid #e6ebf1; vertical-align: top; }
        table.agents th { font-size: .78rem; text-transform: uppercase; letter-spacing: .05em; color: #8592a3; }
        .tag { font-size: .78rem; font-weight: 700; padding: .12rem .55rem; border-radius: 999px; }
        .tag-pending { background: #fff2d6; color: #7a5900; }
        .tag-active { background: #d9f5e4; color: #10633a; }
        .tag-suspended { background: #f6dede; color: #7a1f1f; }
    </style>

    <h2><?= t('ag_ajouter') ?></h2>
    <p style="color:#7a879a;font-size:.88rem;margin:.2rem 0 1rem">
        <?= t_brut('ag_ajouter_aide') ?>
    </p>
    <form method="post" class="grid">
        <input type="hidden" name="do" value="create">
        <label><?= t('ag_nom') ?>
            <input type="text" name="name" maxlength="120" required>
        </label>
        <label><?= t('ag_email') ?>
            <input type="email" name="email" required>
        </label>
        <label><?= t('ag_mdp_provisoire') ?>
            <input type="text" name="password" minlength="6" required>
        </label>
        <label><?= t('ag_role') ?>
            <select name="role" id="njNewRole">
                <option value="commercial"><?= t('ag_role_commercial') ?></option>
                <option value="gestionnaire"><?= t('ag_role_gestionnaire') ?></option>
                <option value="superviseur"><?= t('ag_role_superviseur') ?></option>
            </select>
        </label>
        <label><?= t('ag_bureaux') ?>
            <select name="perimetre" id="njNewPerimetre">
                <option value="selection"><?= t('ag_bureaux_selection') ?></option>
                <option value="tous"><?= t('ag_bureaux_tous') ?></option>
            </select>
            <small style="color:#64748b"><?= t('ag_bureaux_aide') ?></small>
        </label>
        <div class="full" id="njNewProjets">
            <b style="font-size:.85rem"><?= t('ag_cocher_bureaux') ?></b>
            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:.3rem .9rem; margin-top:.4rem">
                <?php foreach (nj_projects() as $pid => $p): ?>
                    <label style="display:flex; align-items:center; gap:.4rem; font-weight:400">
                        <input type="checkbox" name="projets[]" value="<?= htmlspecialchars($pid) ?>">
                        <?= htmlspecialchars($p['name'][admin_lang()] ?? $p['name']['fr'] ?? $pid) ?>
                    </label>
                <?php endforeach; ?>
            </div>
        </div>
        <label><?= t('ag_telephone') ?>
            <input type="text" name="telephone" maxlength="40">
        </label>
        <label><?= t('ag_whatsapp') ?>
            <input type="text" name="whatsapp" maxlength="40">
        </label>
        <div class="full">
            <button class="button" type="submit"><?= t('ag_creer') ?></button>
        </div>
    </form>
    <script>
    // Un superviseur couvre tous les bureaux : le champ n'a pas de sens pour lui.
    // Un commercial, lui, doit obligatoirement en choisir un.
    (function () {
        var role = document.getElementById('njNewRole');
        var perimetre = document.getElementById('njNewPerimetre');
        var bloc = document.getElementById('njNewProjets');
        function sync() {
            // Superviseur : le périmètre est imposé (tous), le choix disparaît.
            var impose = role.value === 'superviseur';
            perimetre.disabled = impose;
            if (impose) perimetre.value = 'tous';
            bloc.hidden = impose || perimetre.value === 'tous';
        }
        role.addEventListener('change', sync);
        perimetre.addEventListener('change', sync);
        sync();
    })();
    </script>

    <h2 style="margin-top:2rem"><?= t('ag_en_attente', ['n' => count($pending)]) ?></h2>
    <?php if (!$pending): ?>
        <p><?= t('ag_aucun_attente') ?></p>
    <?php else: ?>
        <table class="agents">
            <thead><tr><th><?= t('ag_nom') ?></th><th><?= t('ag_role') ?></th><th><?= t('msg_bureau') ?></th><th><?= t('th_statut') ?></th><th></th></tr></thead>
            <tbody><?php foreach ($pending as $a) nj_agent_row($a); ?></tbody>
        </table>
    <?php endif; ?>

    <h2 style="margin-top:2rem"><?= t('ag_existants', ['n' => count($others)]) ?></h2>
    <?php if (!$others): ?>
        <p><?= t('ag_aucun_actif') ?></p>
    <?php else: ?>
        <table class="agents">
            <thead><tr><th><?= t('ag_nom') ?></th><th><?= t('ag_role') ?></th><th><?= t('msg_bureau') ?></th><th><?= t('th_statut') ?></th><th></th></tr></thead>
            <tbody><?php foreach ($others as $a) nj_agent_row($a); ?></tbody>
        </table>
    <?php endif; ?>
</section>
<?php admin_footer(); ?>
