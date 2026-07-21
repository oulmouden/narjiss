@php
    Theme::asset()->usePath()->add('leaflet-css', 'plugins/leaflet.css');
    Theme::asset()->usePath()->add('narjiss-map-css', 'css/narjiss-map.css');
    Theme::asset()->container('footer')->usePath()->add('leaflet-js', 'plugins/leaflet.js');
    Theme::asset()->container('footer')->usePath()->add('narjiss-map-js', 'js/narjiss-map.js');

    $locale = substr(app()->getLocale(), 0, 2);
    $language = in_array($locale, ['fr', 'en', 'ar', 'es'], true) ? $locale : 'fr';
    $isRtl = $language === 'ar';

    $copy = [
        'fr' => [
            'eyebrow' => 'Narjiss immobilier',
            'title' => 'Carte globale de nos projets',
            'subtitle' => 'Explorez les programmes Narjiss au Maroc, du quartier au projet, avec une lecture claire des emplacements et des disponibilites.',
            'projects' => 'projets',
            'pois' => 'points utiles',
            'languages' => 'langues',
            'viewProject' => 'Voir les projets',
            'live' => 'Disponible',
            'soon' => 'Bientot',
            'mapLayers' => 'Fonds de carte',
        ],
        'en' => [
            'eyebrow' => 'Narjiss real estate',
            'title' => 'Global map of our projects',
            'subtitle' => 'Explore Narjiss developments in Morocco, from district to project, with clear location and availability context.',
            'projects' => 'projects',
            'pois' => 'useful points',
            'languages' => 'languages',
            'viewProject' => 'View projects',
            'live' => 'Available',
            'soon' => 'Coming soon',
            'mapLayers' => 'Map layers',
        ],
        'ar' => [
            'eyebrow' => 'نرجس للعقار',
            'title' => 'الخريطة الشاملة لمشاريعنا',
            'subtitle' => 'استكشف مشاريع نرجس العقارية بالمغرب، من الحي إلى المشروع، مع قراءة واضحة للموقع والتوفر.',
            'projects' => 'مشروعا',
            'pois' => 'نقطة مفيدة',
            'languages' => 'لغات',
            'viewProject' => 'عرض المشاريع',
            'live' => 'متاح',
            'soon' => 'قريبا',
            'mapLayers' => 'طبقات الخريطة',
        ],
        'es' => [
            'eyebrow' => 'Narjiss inmobiliaria',
            'title' => 'Mapa global de nuestros proyectos',
            'subtitle' => 'Explora los proyectos Narjiss en Marruecos, del barrio al proyecto, con una lectura clara de ubicacion y disponibilidad.',
            'projects' => 'proyectos',
            'pois' => 'puntos utiles',
            'languages' => 'idiomas',
            'viewProject' => 'Ver proyectos',
            'live' => 'Disponible',
            'soon' => 'Proximamente',
            'mapLayers' => 'Capas del mapa',
        ],
    ];

    $projects = [
        [
            'id' => 'jawhara',
            'name' => ['fr' => 'Residence Al Jawhara', 'en' => 'Al Jawhara Residence', 'ar' => 'إقامة الجوهرة', 'es' => 'Residencia Al Jawhara'],
            'location' => ['fr' => 'Dcheira El Jihadia, Agadir', 'en' => 'Dcheira El Jihadia, Agadir', 'ar' => 'الدشيرة الجهادية، أكادير', 'es' => 'Dcheira El Jihadia, Agadir'],
            'type' => ['fr' => 'Appartements', 'en' => 'Apartments', 'ar' => 'شقق', 'es' => 'Apartamentos'],
            'lat' => 30.3732,
            'lng' => -9.5372,
            'status' => 'live',
            'poi_count' => 41,
            'has_tour' => true,
        ],
        [
            'id' => 'tazroute',
            'name' => ['fr' => 'Tazroute', 'en' => 'Tazroute', 'ar' => 'تازروت', 'es' => 'Tazroute'],
            'location' => ['fr' => 'Agadir', 'en' => 'Agadir', 'ar' => 'أكادير', 'es' => 'Agadir'],
            'type' => ['fr' => 'Terrains', 'en' => 'Land plots', 'ar' => 'أراضي', 'es' => 'Terrenos'],
            'lat' => 30.358739340382268,
            'lng' => -9.460496051159458,
            'status' => 'live',
            'poi_count' => 27,
            'has_tour' => false,
        ],
        [
            'id' => 'dar_ben_cheikh',
            'name' => ['fr' => 'Dar Ben Cheikh', 'en' => 'Dar Ben Cheikh', 'ar' => 'دار بن الشيخ', 'es' => 'Dar Ben Cheikh'],
            'location' => ['fr' => 'Agadir', 'en' => 'Agadir', 'ar' => 'أكادير', 'es' => 'Agadir'],
            'type' => ['fr' => 'Terrains', 'en' => 'Land plots', 'ar' => 'أراضي', 'es' => 'Terrenos'],
            'lat' => 30.361823687819253,
            'lng' => -9.436652468018211,
            'status' => 'live',
            'poi_count' => 8,
            'has_tour' => false,
        ],
        [
            'id' => 'tazroute_yassamine',
            'name' => ['fr' => 'Tazroute Al Yassamine', 'en' => 'Tazroute Al Yassamine', 'ar' => 'تازروت الياسمين', 'es' => 'Tazroute Al Yassamine'],
            'location' => ['fr' => 'Agadir', 'en' => 'Agadir', 'ar' => 'أكادير', 'es' => 'Agadir'],
            'type' => ['fr' => 'Terrains', 'en' => 'Land plots', 'ar' => 'أراضي', 'es' => 'Terrenos'],
            'lat' => 30.3616466330063,
            'lng' => -9.455007371697246,
            'status' => 'live',
            'poi_count' => 21,
            'has_tour' => false,
        ],
        [
            'id' => 'farah',
            'name' => ['fr' => 'Farah', 'en' => 'Farah', 'ar' => 'فرح', 'es' => 'Farah'],
            'location' => ['fr' => 'Agadir', 'en' => 'Agadir', 'ar' => 'أكادير', 'es' => 'Agadir'],
            'type' => ['fr' => 'Terrains', 'en' => 'Land plots', 'ar' => 'أراضي', 'es' => 'Terrenos'],
            'lat' => 30.3993056,
            'lng' => -9.5658333,
            'status' => 'live',
            'poi_count' => 108,
            'has_tour' => false,
        ],
        [
            'id' => 'amical',
            'name' => ['fr' => 'Lot Amical I', 'en' => 'Lot Amical I', 'ar' => 'تجزئة أميكال', 'es' => 'Lot Amical I'],
            'location' => ['fr' => 'Agadir', 'en' => 'Agadir', 'ar' => 'أكادير', 'es' => 'Agadir'],
            'type' => ['fr' => 'Terrains', 'en' => 'Land plots', 'ar' => 'أراضي', 'es' => 'Terrenos'],
            'lat' => 30.33269020682961,
            'lng' => -9.511278096688889,
            'status' => 'live',
            'poi_count' => 74,
            'has_tour' => false,
        ],
        [
            'id' => 'azrou',
            'name' => ['fr' => 'Lot Azrou', 'en' => 'Lot Azrou', 'ar' => 'تجزئة أزرو', 'es' => 'Lot Azrou'],
            'location' => ['fr' => 'Agadir', 'en' => 'Agadir', 'ar' => 'أكادير', 'es' => 'Agadir'],
            'type' => ['fr' => 'Terrains', 'en' => 'Land plots', 'ar' => 'أراضي', 'es' => 'Terrenos'],
            'lat' => 30.358741122541407,
            'lng' => -9.460487731940148,
            'status' => 'live',
            'poi_count' => 27,
            'has_tour' => false,
        ],
        [
            'id' => 'bayt_mawada',
            'name' => ['fr' => 'Bayt Al Mawada', 'en' => 'Bayt Al Mawada', 'ar' => 'بيت المودة', 'es' => 'Bayt Al Mawada'],
            'location' => ['fr' => 'Agadir', 'en' => 'Agadir', 'ar' => 'أكادير', 'es' => 'Agadir'],
            'type' => ['fr' => 'Appartements', 'en' => 'Apartments', 'ar' => 'شقق', 'es' => 'Apartamentos'],
            'lat' => 30.381708282802176,
            'lng' => -9.468861100000003,
            'status' => 'live',
            'poi_count' => 24,
            'has_tour' => false,
        ],
        [
            'id' => 'founty',
            'name' => ['fr' => 'Lot Founty', 'en' => 'Lot Founty', 'ar' => 'تجزئة فونتي', 'es' => 'Lot Founty'],
            'location' => ['fr' => 'Agadir', 'en' => 'Agadir', 'ar' => 'أكادير', 'es' => 'Agadir'],
            'type' => ['fr' => 'Terrains', 'en' => 'Land plots', 'ar' => 'أراضي', 'es' => 'Terrenos'],
            'lat' => 30.400406468380485,
            'lng' => -9.573180104254527,
            'status' => 'live',
            'poi_count' => 122,
            'has_tour' => false,
        ],
        [
            'id' => 'nahda2',
            'name' => ['fr' => 'Lot Nahda 2', 'en' => 'Lot Nahda 2', 'ar' => 'تجزئة النهضة 2', 'es' => 'Lot Nahda 2'],
            'location' => ['fr' => 'Agadir', 'en' => 'Agadir', 'ar' => 'أكادير', 'es' => 'Agadir'],
            'type' => ['fr' => 'Terrains', 'en' => 'Land plots', 'ar' => 'أراضي', 'es' => 'Terrenos'],
            'lat' => 30.303208344750637,
            'lng' => -9.463554523291856,
            'status' => 'live',
            'poi_count' => 45,
            'has_tour' => false,
        ],
        [
            'id' => 'andalusia',
            'name' => ['fr' => 'R+3 Andalusia', 'en' => 'R+3 Andalusia', 'ar' => 'أندلسيا', 'es' => 'Andalusia'],
            'location' => ['fr' => 'Agadir', 'en' => 'Agadir', 'ar' => 'أكادير', 'es' => 'Agadir'],
            'type' => ['fr' => 'Appartements', 'en' => 'Apartments', 'ar' => 'شقق', 'es' => 'Apartamentos'],
            'lat' => 30.37161637201584,
            'lng' => -9.523500675483383,
            'status' => 'live',
            'poi_count' => 106,
            'has_tour' => true,
        ],
        [
            'id' => 'kb',
            'name' => ['fr' => 'R+4 K&B', 'en' => 'R+4 K&B', 'ar' => 'كي أند بي', 'es' => 'K&B'],
            'location' => ['fr' => 'Agadir', 'en' => 'Agadir', 'ar' => 'أكادير', 'es' => 'Agadir'],
            'type' => ['fr' => 'Appartements', 'en' => 'Apartments', 'ar' => 'شقق', 'es' => 'Apartamentos'],
            'lat' => 30.371826407823608,
            'lng' => -9.549940706126623,
            'status' => 'live',
            'poi_count' => 78,
            'has_tour' => false,
        ],
    ];

    $databaseProjects = \Botble\RealEstate\Models\Project::query()
        ->where('unique_id', 'like', 'NARJISS-%')
        ->with(['categories', 'customFields', 'features', 'slugable'])
        ->orderBy('name')
        ->get();

    if ($databaseProjects->isNotEmpty()) {
        $projects = $databaseProjects
            ->map(function ($project) {
                $customFields = $project->customFields->pluck('value', 'name');
                $poiCount = (int) ($customFields->get('POI') ?: 0);
                $type = $customFields->get('Type') ?: ($project->categories->first()?->name ?: 'Projet');

                return [
                    'id' => $project->unique_id ?: (string) $project->id,
                    'name' => [
                        'fr' => $project->name,
                        'en' => $project->name,
                        'ar' => $project->name,
                        'es' => $project->name,
                    ],
                    'location' => [
                        'fr' => $project->location ?: $project->city_name,
                        'en' => $project->location ?: $project->city_name,
                        'ar' => $project->location ?: $project->city_name,
                        'es' => $project->location ?: $project->city_name,
                    ],
                    'type' => [
                        'fr' => $type,
                        'en' => $type,
                        'ar' => $type,
                        'es' => $type,
                    ],
                    'lat' => (float) $project->latitude,
                    'lng' => (float) $project->longitude,
                    'status' => (string) $project->status === 'selling' ? 'live' : (string) $project->status,
                    'poi_count' => $poiCount,
                    'has_tour' => str_contains((string) $project->features->pluck('name')->implode(','), '360'),
                    'url' => $project->url,
                ];
            })
            ->filter(fn ($project) => $project['lat'] && $project['lng'])
            ->values()
            ->all();
    }

    $totalPois = array_sum(array_column($projects, 'poi_count'));
@endphp

<main class="narjiss-map-page" dir="{{ $isRtl ? 'rtl' : 'ltr' }}">
    <section class="narjiss-map-hero">
        <div class="narjiss-map-hero__content">
            <span class="narjiss-map-hero__eyebrow">{{ $copy[$language]['eyebrow'] }}</span>
            <h1>{{ $copy[$language]['title'] }}</h1>
            <p>{{ $copy[$language]['subtitle'] }}</p>
        </div>
        <dl class="narjiss-map-hero__stats">
            <div>
                <dt>{{ count($projects) }}</dt>
                <dd>{{ $copy[$language]['projects'] }}</dd>
            </div>
            <div>
                <dt>{{ $totalPois }}</dt>
                <dd>{{ $copy[$language]['pois'] }}</dd>
            </div>
            <div>
                <dt>4</dt>
                <dd>{{ $copy[$language]['languages'] }}</dd>
            </div>
        </dl>
    </section>

    <section class="narjiss-map-shell" aria-label="{{ $copy[$language]['title'] }}">
        <div
            id="narjissGlobalMap"
            class="narjiss-global-map"
            data-language="{{ $language }}"
            data-projects-url="{{ route('public.projects') ?? url('projects') }}"
        ></div>
    </section>
</main>

<script>
    window.NarjissMapProjects = @json($projects, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    window.NarjissMapCopy = @json($copy[$language], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
</script>
