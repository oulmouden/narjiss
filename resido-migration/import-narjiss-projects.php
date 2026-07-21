<?php

use Botble\ACL\Models\User;
use Botble\RealEstate\Models\Category;
use Botble\RealEstate\Models\Currency;
use Botble\RealEstate\Models\Feature;
use Botble\RealEstate\Models\Project;
use Botble\Slug\Facades\SlugHelper;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Str;

$residoRoot = 'C:/laragon/www/resido';
$csvPath = __DIR__ . '/narjiss-projects-import.csv';

require $residoRoot . '/vendor/autoload.php';

$app = require $residoRoot . '/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (! file_exists($csvPath)) {
    throw new RuntimeException("CSV file not found: {$csvPath}");
}

$handle = fopen($csvPath, 'rb');
$headers = fgetcsv($handle);
$created = 0;
$updated = 0;

$currencyId = Currency::query()->where('title', 'USD')->value('id');
$authorId = User::query()->value('id') ?: 1;

while (($row = fgetcsv($handle)) !== false) {
    $data = array_combine($headers, $row);
    $uniqueId = trim($data['Unique ID']);

    /** @var Project|null $project */
    $project = Project::query()->where('unique_id', $uniqueId)->first();
    $isNew = false;

    if (! $project) {
        $project = new Project();
        $isNew = true;
    }

    $project->forceFill([
        'unique_id' => $uniqueId,
        'name' => $data['Name'],
        'description' => $data['Description'],
        'content' => $data['Content'],
        'location' => $data['Location'],
        'images' => [],
        'status' => $data['Status'] ?: 'selling',
        'is_featured' => strtolower($data['Is Featured?']) === 'yes',
        'number_block' => (int) $data['Number Block'],
        'number_floor' => (int) $data['Number Floor'],
        'number_flat' => (int) $data['Number Flat'],
        'price_from' => $data['Price from'] !== '' ? (float) $data['Price from'] : null,
        'price_to' => $data['Price to'] !== '' ? (float) $data['Price to'] : null,
        'currency_id' => $currencyId,
        'longitude' => $data['Longitude'],
        'latitude' => $data['Latitude'],
        'author_id' => $authorId,
        'author_type' => User::class,
    ]);

    $project->save();

    if ($isNew || ! $project->slugable) {
        SlugHelper::createSlug($project, Str::slug($project->name));
    }

    $categoryIds = collect(explode(',', $data['Categories']))
        ->map(fn ($name) => trim($name))
        ->filter()
        ->map(function ($name) {
            $category = Category::query()->firstOrCreate(['name' => $name]);

            if ($category->wasRecentlyCreated && SlugHelper::isSupportedModel(Category::class)) {
                SlugHelper::createSlug($category, Str::slug($category->name));
            }

            return $category->getKey();
        })
        ->all();

    $project->categories()->sync($categoryIds);

    $featureIds = collect(explode(',', $data['Features']))
        ->map(fn ($name) => trim($name))
        ->filter()
        ->map(function ($name) {
            $feature = Feature::query()->firstOrCreate(['name' => $name]);

            if ($feature->wasRecentlyCreated && SlugHelper::isSupportedModel(Feature::class)) {
                SlugHelper::createSlug($feature, Str::slug($feature->name));
            }

            return $feature->getKey();
        })
        ->all();

    $project->features()->sync($featureIds);

    $project->customFields()->delete();

    collect(explode(',', $data['Custom Fields']))
        ->map(fn ($field) => trim($field))
        ->filter()
        ->each(function ($field) use ($project) {
            $parts = explode(':', $field, 2);

            if (count($parts) !== 2) {
                return;
            }

            $project->customFields()->create([
                'name' => trim($parts[0]),
                'value' => trim($parts[1]),
            ]);
        });

    $isNew ? $created++ : $updated++;
}

fclose($handle);

echo "Narjiss projects imported. Created: {$created}. Updated: {$updated}." . PHP_EOL;
