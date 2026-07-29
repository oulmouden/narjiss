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

admin_require_login();

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
        <td><?= htmlspecialchars($a['projet'] ?: '—') ?></td>
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
                <button class="button secondary" type="submit">Rôle</button>
            </form>
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

    <h2>En attente de validation (<?= count($pending) ?>)</h2>
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
