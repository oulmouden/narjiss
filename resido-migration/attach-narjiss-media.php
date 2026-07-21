<?php

use Botble\RealEstate\Models\Project;
use Illuminate\Contracts\Console\Kernel;

$residoRoot = 'C:/laragon/www/resido';

require $residoRoot . '/vendor/autoload.php';

$app = require $residoRoot . '/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$media = [
    'NARJISS-JAWHARA' => ['jawhara', 'concept-hero.png', 'floorplan.png'],
    'NARJISS-TAZROUTE' => ['tazroute', 'concept-triptych.png', 'floorplan.png'],
    'NARJISS-DAR-BEN-CHEIKH' => ['dar_ben_cheikh', 'concept-hero.png', 'floorplan.png'],
    'NARJISS-TAZROUTE-YASSAMINE' => ['tazroute_yassamine', 'concept-hero.png', 'floorplan.png'],
    'NARJISS-FARAH' => ['farah', 'concept-hero.png', 'floorplan.png'],
    'NARJISS-AMICAL-I' => ['amical', 'concept-hero.png', 'floorplan.png'],
    'NARJISS-AZROU' => ['azrou', 'concept-hero.png', 'floorplan.png'],
    'NARJISS-BAYT-AL-MAWADA' => ['bayt_mawada', 'concept-hero.png', 'floorplan.png'],
    'NARJISS-FOUNTY' => ['founty', 'concept-hero.png', 'floorplan.png'],
    'NARJISS-NAHDA-2' => ['nahda2', 'concept-hero.png', 'floorplan.png'],
    'NARJISS-ANDALUSIA' => ['andalusia', 'concept-hero.png', 'floorplan.png'],
    'NARJISS-KB' => ['kb', 'concept-hero.png', 'floorplan.png'],
];

$updated = 0;

foreach ($media as $uniqueId => [$folder, $hero, $floorplan]) {
    $project = Project::query()->where('unique_id', $uniqueId)->first();

    if (! $project) {
        continue;
    }

    $base = "projects/narjiss/{$folder}";
    $project->images = [
        "{$base}/{$hero}",
        "{$base}/{$floorplan}",
    ];

    $project->floor_plans = [
        [
            'name' => 'Plan de masse',
            'description' => '',
            'image' => "{$base}/{$floorplan}",
            'bedrooms' => '',
            'bathrooms' => '',
            'image_id' => null,
        ],
    ];

    $project->save();
    $updated++;
}

echo "Narjiss media attached. Updated: {$updated}." . PHP_EOL;
