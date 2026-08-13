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
        set_flash('Nom, e-mail valide et mot de passe (6 caractères minimum) requis.');
    } elseif ($role === 'commercial' && $projet === '' && !$tousBureaux) {
        set_flash('Choisissez au moins un bureau de vente, ou « Tous les bureaux ».');
    } else {
        try {
            $newId = nj_agent_create($name, $email, $pass, $role, $projet, $tel, $wa);
            nj_agent_set_status($newId, 'active');
            set_flash('Compte de ' . $name . ' créé et activé.');
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
            set_flash('Compte de ' . $target['name'] . ' activé.');
        } elseif ($do === 'suspend') {
            nj_agent_set_status($id, 'suspended');
            set_flash('Compte de ' . $target['name'] . ' suspendu.');
        } elseif ($do === 'setrole') {
            $role = $_POST['role'] ?? '';
            if (nj_agent_set_role($id, $role)) {
                set_flash('Rôle de ' . $target['name'] . ' défini sur ' . $role . '.');
            }
        } elseif ($do === 'delete') {
            // Sans retour : on exige que le compte soit d'abord suspendu (ou
            // encore en attente). Supprimer un actif en un clic depuis une
            // liste de comptes qui se ressemblent finit toujours mal.
            if ($target['statut'] === 'active') {
                set_flash('Suspendez d\'abord le compte de ' . $target['name'] . ' avant de le supprimer.');
            } elseif (nj_agent_delete($id)) {
                set_flash('Compte de ' . $target['name'] . ' supprimé définitivement.');
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
    $roleLbl = ['commercial' => 'Commercial', 'gestionnaire' => 'Gestionnaire', 'superviseur' => 'Superviseur'][$a['role']] ?? $a['role'];
    $pill = ['pending' => 'En attente', 'active' => 'Actif', 'suspended' => 'Suspendu'][$a['statut']] ?? $a['statut'];
    ?>
    <tr>
        <td><?= htmlspecialchars($a['name']) ?><br><small style="color:#7a879a"><?= htmlspecialchars($a['email']) ?></small></td>
        <td><?= $roleLbl ?></td>
        <td><?php
            $ids = nj_agent_projets($a['projet']);
            if (!$ids) {
                echo '<em>Tous les bureaux</em>';
            } else {
                echo htmlspecialchars(implode(', ', array_map('nj_project_name', $ids)));
            }
        ?></td>
        <td><span class="tag tag-<?= $a['statut'] ?>"><?= $pill ?></span></td>
        <td>
            <?php if ($a['statut'] !== 'active'): ?>
                <form method="post" style="display:inline">
                    <input type="hidden" name="agent_id" value="<?= (int)$a['id'] ?>">
                    <input type="hidden" name="do" value="activate">
                    <button class="button" type="submit">Activer</button>
                </form>
            <?php endif; ?>
            <?php if ($a['statut'] === 'active'): ?>
                <form method="post" style="display:inline" onsubmit="return confirm('Suspendre ce compte ?');">
                    <input type="hidden" name="agent_id" value="<?= (int)$a['id'] ?>">
                    <input type="hidden" name="do" value="suspend">
                    <button class="button secondary" type="submit">Suspendre</button>
                </form>
            <?php endif; ?>
            <form method="post" style="display:inline-flex;gap:.3rem;align-items:center;margin-left:.4rem">
                <input type="hidden" name="agent_id" value="<?= (int)$a['id'] ?>">
                <input type="hidden" name="do" value="setrole">
                <select name="role">
                    <?php foreach (['commercial' => 'Commercial', 'gestionnaire' => 'Gestionnaire', 'superviseur' => 'Superviseur'] as $rv => $rl): ?>
                        <option value="<?= $rv ?>"<?= $a['role'] === $rv ? ' selected' : '' ?>><?= $rl ?></option>
                    <?php endforeach; ?>
                </select>
                <button class="button secondary" type="submit" title="Appliquer le rôle choisi">Changer le rôle</button>
            </form>
            <?php if ($a['statut'] !== 'active'): ?>
                <form method="post" style="display:inline"
                      onsubmit="return confirm('Supprimer définitivement le compte de <?= htmlspecialchars(addslashes($a['name'])) ?> ?\n\nCette action est sans retour. L\'historique des messages est conservé.');">
                    <input type="hidden" name="agent_id" value="<?= (int)$a['id'] ?>">
                    <input type="hidden" name="do" value="delete">
                    <button class="button secondary" type="submit" style="color:#b42318">Supprimer</button>
                </form>
            <?php endif; ?>
        </td>
    </tr>
    <?php
}

admin_header('Agents');
$flash = flash_message();
?>
<section class="panel">
    <h1>Agents commerciaux</h1>
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

    <h2>Ajouter un agent</h2>
    <p style="color:#7a879a;font-size:.88rem;margin:.2rem 0 1rem">
        Le compte est actif immédiatement. Communiquez le mot de passe provisoire à l'agent :
        il se connecte ensuite sur <code>espace-agent.html</code>.
    </p>
    <form method="post" class="grid">
        <input type="hidden" name="do" value="create">
        <label>Nom
            <input type="text" name="name" maxlength="120" required>
        </label>
        <label>E-mail
            <input type="email" name="email" required>
        </label>
        <label>Mot de passe provisoire
            <input type="text" name="password" minlength="6" required>
        </label>
        <label>Rôle
            <select name="role" id="njNewRole">
                <option value="commercial">Commercial</option>
                <option value="gestionnaire">Gestionnaire</option>
                <option value="superviseur">Superviseur</option>
            </select>
        </label>
        <label>Bureaux de vente
            <select name="perimetre" id="njNewPerimetre">
                <option value="selection">Bureaux sélectionnés</option>
                <option value="tous">Tous les bureaux de vente</option>
            </select>
            <small style="color:#64748b">« Tous » couvre aussi les bureaux ajoutés plus tard.</small>
        </label>
        <div class="full" id="njNewProjets">
            <b style="font-size:.85rem">Cocher les bureaux couverts</b>
            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:.3rem .9rem; margin-top:.4rem">
                <?php foreach (nj_projects() as $pid => $p): ?>
                    <label style="display:flex; align-items:center; gap:.4rem; font-weight:400">
                        <input type="checkbox" name="projets[]" value="<?= htmlspecialchars($pid) ?>">
                        <?= htmlspecialchars($p['name']['fr'] ?? $pid) ?>
                    </label>
                <?php endforeach; ?>
            </div>
        </div>
        <label>Téléphone
            <input type="text" name="telephone" maxlength="40">
        </label>
        <label>WhatsApp
            <input type="text" name="whatsapp" maxlength="40">
        </label>
        <div class="full">
            <button class="button" type="submit">Créer le compte</button>
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

    <h2 style="margin-top:2rem">En attente de validation (<?= count($pending) ?>)</h2>
    <?php if (!$pending): ?>
        <p>Aucun compte en attente.</p>
    <?php else: ?>
        <table class="agents">
            <thead><tr><th>Nom</th><th>Rôle</th><th>Bureau</th><th>Statut</th><th></th></tr></thead>
            <tbody><?php foreach ($pending as $a) nj_agent_row($a); ?></tbody>
        </table>
    <?php endif; ?>

    <h2 style="margin-top:2rem">Comptes existants (<?= count($others) ?>)</h2>
    <?php if (!$others): ?>
        <p>Aucun compte actif pour le moment.</p>
    <?php else: ?>
        <table class="agents">
            <thead><tr><th>Nom</th><th>Rôle</th><th>Bureau</th><th>Statut</th><th></th></tr></thead>
            <tbody><?php foreach ($others as $a) nj_agent_row($a); ?></tbody>
        </table>
    <?php endif; ?>
</section>
<?php admin_footer(); ?>
