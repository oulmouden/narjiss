<?php
/**
 * Plugin Name: Narjiss Bridge
 * Description: Imports the static Narjiss demo projects into WordPress and exposes Elementor-friendly shortcodes.
 * Version: 0.1.0
 * Author: Narjiss
 * Text Domain: narjiss-bridge
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Narjiss_Bridge {
    const CPT = 'narjiss_project';
    const TAX_TYPE = 'project_type';
    const META_PREFIX = '_narjiss_';

    public static function init() {
        add_action('init', [__CLASS__, 'register_content']);
        add_action('admin_menu', [__CLASS__, 'register_admin_page']);
        add_action('admin_post_narjiss_bridge_import', [__CLASS__, 'handle_import']);
        add_action('admin_post_narjiss_bridge_import_media', [__CLASS__, 'handle_media_import']);
        add_action('wp_enqueue_scripts', [__CLASS__, 'register_assets']);
        add_filter('single_template', [__CLASS__, 'single_project_template']);
        add_filter('the_content', [__CLASS__, 'inject_project_detail_content']);
        add_filter('body_class', [__CLASS__, 'body_classes']);
        add_shortcode('narjiss_nav', [__CLASS__, 'nav_shortcode']);
        add_shortcode('narjiss_footer', [__CLASS__, 'footer_shortcode']);
        add_shortcode('narjiss_home', [__CLASS__, 'home_shortcode']);
        add_shortcode('narjiss_projects_page', [__CLASS__, 'projects_page_shortcode']);
        add_shortcode('narjiss_map_page', [__CLASS__, 'map_page_shortcode']);
        add_shortcode('narjiss_about', [__CLASS__, 'about_shortcode']);
        add_shortcode('narjiss_contact', [__CLASS__, 'contact_shortcode']);
        add_shortcode('narjiss_project_detail', [__CLASS__, 'project_detail_shortcode']);
        add_shortcode('narjiss_projects', [__CLASS__, 'projects_shortcode']);
        add_shortcode('narjiss_map', [__CLASS__, 'map_shortcode']);
    }

    public static function activate() {
        self::register_content();
        flush_rewrite_rules();
    }

    public static function deactivate() {
        flush_rewrite_rules();
    }

    public static function register_content() {
        register_post_type(self::CPT, [
            'labels' => [
                'name' => 'Projets Narjiss',
                'singular_name' => 'Projet Narjiss',
                'add_new_item' => 'Ajouter un projet',
                'edit_item' => 'Modifier le projet',
            ],
            'public' => true,
            'show_in_rest' => true,
            'menu_icon' => 'dashicons-building',
            'supports' => ['title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'],
            'has_archive' => true,
            'rewrite' => ['slug' => 'projets-narjiss'],
        ]);

        register_taxonomy(self::TAX_TYPE, self::CPT, [
            'labels' => [
                'name' => 'Types de projets',
                'singular_name' => 'Type de projet',
            ],
            'public' => true,
            'show_in_rest' => true,
            'hierarchical' => true,
            'rewrite' => ['slug' => 'type-projet'],
        ]);

        foreach (self::meta_schema() as $key => $args) {
            register_post_meta(self::CPT, self::META_PREFIX . $key, array_merge([
                'single' => true,
                'show_in_rest' => true,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
            ], $args));
        }
    }

    private static function meta_schema() {
        return [
            'source_id' => ['type' => 'string'],
            'folder' => ['type' => 'string'],
            'location_fr' => ['type' => 'string'],
            'location_en' => ['type' => 'string'],
            'location_ar' => ['type' => 'string'],
            'location_es' => ['type' => 'string'],
            'name_i18n' => ['type' => 'string'],
            'location_i18n' => ['type' => 'string'],
            'lat' => ['type' => 'number'],
            'lng' => ['type' => 'number'],
            'status' => ['type' => 'string'],
            'poi_count' => ['type' => 'integer'],
            'has_tour' => ['type' => 'boolean'],
            'logo_url' => ['type' => 'string'],
            'logo_id' => ['type' => 'integer'],
            'hero_url' => ['type' => 'string'],
            'hero_id' => ['type' => 'integer'],
            'floorplan_url' => ['type' => 'string'],
            'floorplan_id' => ['type' => 'integer'],
            'mass_plan_pdf_url' => ['type' => 'string'],
            'mass_plan_pdf_id' => ['type' => 'integer'],
            'tour360_url' => ['type' => 'string'],
            'static_detail_url' => ['type' => 'string'],
            'stats_json' => ['type' => 'string'],
        ];
    }

    public static function register_admin_page() {
        add_management_page(
            'Narjiss Bridge',
            'Narjiss Bridge',
            'manage_options',
            'narjiss-bridge',
            [__CLASS__, 'render_admin_page']
        );
    }

    public static function render_admin_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        $notice = isset($_GET['narjiss_imported']) ? absint($_GET['narjiss_imported']) : null;
        $media_notice = isset($_GET['narjiss_media_imported']) ? absint($_GET['narjiss_media_imported']) : null;
        $projects = self::read_projects();
        ?>
        <div class="wrap">
            <h1>Narjiss Bridge</h1>
            <?php if ($notice !== null) : ?>
                <div class="notice notice-success is-dismissible">
                    <p><?php echo esc_html($notice); ?> projets importés ou mis à jour.</p>
                </div>
            <?php endif; ?>
            <?php if ($media_notice !== null) : ?>
                <div class="notice notice-success is-dismissible">
                    <p><?php echo esc_html($media_notice); ?> médias importés ou réutilisés dans la médiathèque.</p>
                </div>
            <?php endif; ?>
            <p>Ce plugin sert de passerelle entre la démo statique Narjiss et WordPress / Elementor / JetEngine.</p>
            <p><strong>Données détectées :</strong> <?php echo esc_html(count($projects)); ?> projets dans <code>data/projects.json</code>.</p>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('narjiss_bridge_import'); ?>
                <input type="hidden" name="action" value="narjiss_bridge_import">
                <?php submit_button('Importer / mettre à jour les projets'); ?>
            </form>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('narjiss_bridge_import_media'); ?>
                <input type="hidden" name="action" value="narjiss_bridge_import_media">
                <?php submit_button('Importer les médias dans WordPress', 'secondary'); ?>
            </form>
            <h2>Shortcodes rapides</h2>
            <p><code>[narjiss_home]</code> : page d'accueil de démo avec slider, projets et arguments marketing.</p>
            <p><code>[narjiss_projects]</code> : grille de projets compatible Elementor.</p>
            <p><code>[narjiss_map]</code> : carte Leaflet des projets.</p>
            <p><code>[narjiss_project_detail]</code> : fiche projet dynamique, à utiliser dans un template Elementor si besoin.</p>
            <p><strong>Slider importé :</strong> les IDs des images sont stockés dans l'option <code>narjiss_home_slider_attachment_ids</code>.</p>
        </div>
        <?php
    }

    public static function handle_import() {
        if (!current_user_can('manage_options')) {
            wp_die('Permission refusée.');
        }
        check_admin_referer('narjiss_bridge_import');

        $count = self::import_projects();
        wp_safe_redirect(add_query_arg('narjiss_imported', $count, admin_url('tools.php?page=narjiss-bridge')));
        exit;
    }

    public static function handle_media_import() {
        if (!current_user_can('manage_options')) {
            wp_die('Permission refusée.');
        }
        check_admin_referer('narjiss_bridge_import_media');

        $result = self::import_media();
        wp_safe_redirect(add_query_arg('narjiss_media_imported', $result['count'], admin_url('tools.php?page=narjiss-bridge')));
        exit;
    }

    private static function read_projects() {
        $path = plugin_dir_path(__FILE__) . 'data/projects.json';
        if (!file_exists($path)) {
            return [];
        }

        $projects = json_decode(file_get_contents($path), true);
        return is_array($projects) ? $projects : [];
    }

    private static function read_home_slider_images() {
        $path = plugin_dir_path(__FILE__) . 'data/home-slider-images.json';
        if (!file_exists($path)) {
            return [];
        }

        $images = json_decode(file_get_contents($path), true);
        return is_array($images) ? $images : [];
    }

    private static function import_projects() {
        $projects = self::read_projects();
        $count = 0;

        foreach ($projects as $project) {
            $source_id = sanitize_key($project['id'] ?? '');
            if (!$source_id) {
                continue;
            }

            $existing = get_posts([
                'post_type' => self::CPT,
                'meta_key' => self::META_PREFIX . 'source_id',
                'meta_value' => $source_id,
                'fields' => 'ids',
                'posts_per_page' => 1,
            ]);

            $title = $project['name']['fr'] ?? $source_id;
            $location = $project['location']['fr'] ?? '';
            $postarr = [
                'post_type' => self::CPT,
                'post_status' => 'publish',
                'post_title' => wp_strip_all_tags($title),
                'post_excerpt' => wp_strip_all_tags($location),
                'post_content' => wp_kses_post($location),
            ];

            if ($existing) {
                $postarr['ID'] = (int) $existing[0];
                $post_id = wp_update_post($postarr, true);
            } else {
                $post_id = wp_insert_post($postarr, true);
            }

            if (is_wp_error($post_id)) {
                continue;
            }

            self::save_project_meta((int) $post_id, $project);
            self::assign_project_types((int) $post_id, $project);
            $count++;
        }

        return $count;
    }

    private static function save_project_meta($post_id, array $project) {
        $wp = $project['wp'] ?? [];
        $base_url = preg_replace('#/narjiss-wp/?$#', '/narjiss/', home_url('/'));

        $url = function ($path) use ($base_url) {
            $path = ltrim((string) $path, '/');
            if (preg_match('#^https?://#', $path)) {
                return $path;
            }
            return esc_url_raw($base_url . $path);
        };

        $meta = [
            'source_id' => $project['id'] ?? '',
            'folder' => $project['folder'] ?? '',
            'location_fr' => $project['location']['fr'] ?? '',
            'location_en' => $project['location']['en'] ?? '',
            'location_ar' => $project['location']['ar'] ?? '',
            'location_es' => $project['location']['es'] ?? '',
            'name_i18n' => wp_json_encode($project['name'] ?? [], JSON_UNESCAPED_UNICODE),
            'location_i18n' => wp_json_encode($project['location'] ?? [], JSON_UNESCAPED_UNICODE),
            'lat' => isset($project['lat']) ? (float) $project['lat'] : 0,
            'lng' => isset($project['lng']) ? (float) $project['lng'] : 0,
            'status' => $project['status'] ?? 'live',
            'poi_count' => isset($project['poi_count']) ? (int) $project['poi_count'] : 0,
            'has_tour' => !empty($project['has_tour']) ? 1 : 0,
            'logo_url' => $url($wp['logo'] ?? ''),
            'hero_url' => $url($wp['hero'] ?? ''),
            'floorplan_url' => $url($wp['floorplan'] ?? ''),
            'mass_plan_pdf_url' => $url($wp['mass_plan_pdf'] ?? ''),
            'tour360_url' => !empty($project['media']['tour360']) ? $url($project['media']['tour360']) : '',
            'static_detail_url' => $url($wp['static_detail_url'] ?? ''),
            'stats_json' => wp_json_encode($project['stats'] ?? [], JSON_UNESCAPED_UNICODE),
        ];

        foreach ($meta as $key => $value) {
            update_post_meta($post_id, self::META_PREFIX . $key, $value);
        }
    }

    private static function assign_project_types($post_id, array $project) {
        $types = $project['types']['fr'] ?? [];
        $term_ids = [];

        foreach ($types as $type) {
            $type = trim((string) $type);
            if (!$type) {
                continue;
            }

            $term = term_exists($type, self::TAX_TYPE);
            if (!$term) {
                $term = wp_insert_term($type, self::TAX_TYPE);
            }
            if (!is_wp_error($term)) {
                $term_ids[] = (int) $term['term_id'];
            }
        }

        wp_set_object_terms($post_id, $term_ids, self::TAX_TYPE);
    }

    private static function import_media() {
        $projects = self::read_projects();
        $count = 0;

        foreach ($projects as $project) {
            $post_id = self::find_project_post_id($project['id'] ?? '');
            if (!$post_id) {
                continue;
            }

            $wp = $project['wp'] ?? [];
            $media_fields = [
                'logo' => $wp['logo'] ?? '',
                'hero' => $wp['hero'] ?? '',
                'floorplan' => $wp['floorplan'] ?? '',
                'mass_plan_pdf' => $wp['mass_plan_pdf'] ?? '',
            ];

            foreach ($media_fields as $field => $relative_path) {
                $attachment_id = self::import_attachment_from_static_path($relative_path, $post_id);
                if (!$attachment_id) {
                    continue;
                }

                update_post_meta($post_id, self::META_PREFIX . $field . '_id', $attachment_id);
                update_post_meta($post_id, self::META_PREFIX . $field . '_url', wp_get_attachment_url($attachment_id));

                if ($field === 'hero') {
                    set_post_thumbnail($post_id, $attachment_id);
                }

                $count++;
            }
        }

        $slider_ids = [];
        foreach (self::read_home_slider_images() as $relative_path) {
            $attachment_id = self::import_attachment_from_static_path($relative_path, 0);
            if ($attachment_id) {
                $slider_ids[] = $attachment_id;
                $count++;
            }
        }
        update_option('narjiss_home_slider_attachment_ids', array_values(array_unique($slider_ids)));

        return ['count' => $count];
    }

    private static function find_project_post_id($source_id) {
        $source_id = sanitize_key($source_id);
        if (!$source_id) {
            return 0;
        }

        $existing = get_posts([
            'post_type' => self::CPT,
            'meta_key' => self::META_PREFIX . 'source_id',
            'meta_value' => $source_id,
            'fields' => 'ids',
            'posts_per_page' => 1,
        ]);

        return $existing ? (int) $existing[0] : 0;
    }

    private static function import_attachment_from_static_path($relative_path, $parent_post_id = 0) {
        $relative_path = ltrim((string) $relative_path, '/');
        if (!$relative_path || preg_match('#^https?://#', $relative_path)) {
            return 0;
        }

        $source_file = self::static_site_path($relative_path);
        if (!$source_file || !file_exists($source_file)) {
            return 0;
        }

        $existing = self::find_attachment_by_source($relative_path);
        if ($existing) {
            if ($parent_post_id && (int) get_post_field('post_parent', $existing) === 0) {
                wp_update_post(['ID' => $existing, 'post_parent' => $parent_post_id]);
            }
            return $existing;
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';

        $uploads = wp_upload_dir();
        if (!empty($uploads['error'])) {
            return 0;
        }

        $filename = wp_unique_filename($uploads['path'], basename($source_file));
        $destination = trailingslashit($uploads['path']) . $filename;

        if (!copy($source_file, $destination)) {
            return 0;
        }

        $filetype = wp_check_filetype($filename, null);
        $attachment_id = wp_insert_attachment([
            'guid' => trailingslashit($uploads['url']) . $filename,
            'post_mime_type' => $filetype['type'] ?: 'application/octet-stream',
            'post_title' => sanitize_text_field(pathinfo($filename, PATHINFO_FILENAME)),
            'post_content' => '',
            'post_status' => 'inherit',
        ], $destination, $parent_post_id);

        if (is_wp_error($attachment_id)) {
            return 0;
        }

        $metadata = wp_generate_attachment_metadata($attachment_id, $destination);
        if (!is_wp_error($metadata) && !empty($metadata)) {
            wp_update_attachment_metadata($attachment_id, $metadata);
        }

        update_post_meta($attachment_id, '_narjiss_source_path', $relative_path);

        return (int) $attachment_id;
    }

    private static function find_attachment_by_source($relative_path) {
        $attachments = get_posts([
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'meta_key' => '_narjiss_source_path',
            'meta_value' => $relative_path,
            'fields' => 'ids',
            'posts_per_page' => 1,
        ]);

        return $attachments ? (int) $attachments[0] : 0;
    }

    private static function static_site_path($relative_path) {
        $htdocs = dirname(untrailingslashit(ABSPATH));
        $candidate = wp_normalize_path($htdocs . '/narjiss/' . ltrim($relative_path, '/'));
        $root = wp_normalize_path($htdocs . '/narjiss/');

        if (strpos($candidate, $root) !== 0) {
            return '';
        }

        return $candidate;
    }

    public static function single_project_template($template) {
        if (is_singular(self::CPT)) {
            $plugin_template = plugin_dir_path(__FILE__) . 'templates/single-narjiss-project.php';
            if (file_exists($plugin_template)) {
                return $plugin_template;
            }
        }

        return $template;
    }

    public static function inject_project_detail_content($content) {
        if (!is_singular(self::CPT) || !in_the_loop() || !is_main_query()) {
            return $content;
        }

        return self::render_project_detail(get_the_ID());
    }

    public static function body_classes($classes) {
        if (is_singular(self::CPT)) {
            $classes[] = 'narjiss-project-single';
        }
        $classes[] = 'narjiss-lang-' . self::lang();
        return $classes;
    }

    private static function lang() {
        $lang = isset($_GET['lang']) ? sanitize_key($_GET['lang']) : '';
        return in_array($lang, ['fr', 'en', 'ar', 'es'], true) ? $lang : 'fr';
    }

    private static function dir() {
        return self::lang() === 'ar' ? 'rtl' : 'ltr';
    }

    private static function ui($key) {
        $lang = self::lang();
        $ui = self::ui_strings();
        return $ui[$lang][$key] ?? $ui['fr'][$key] ?? $key;
    }

    private static function ui_strings() {
        return [
            'fr' => [
                'home' => 'Accueil',
                'projects' => 'Projets',
                'map' => 'Carte',
                'about' => 'À propos',
                'contact' => 'Contact',
                'brand_tag' => 'Immobilier au Maroc',
                'hero_title' => 'Achetez mieux, investissez sereinement',
                'hero_text' => 'NARJISS rassemble les projets, cartes, plans et repères utiles pour décider avec confiance à Agadir.',
                'see_projects' => 'Voir les projets',
                'global_map' => 'Carte globale',
                'projects_kicker' => 'Nos projets',
                'projects_title' => 'Une sélection lisible, géolocalisée et prête à comparer.',
                'why' => 'Pourquoi choisir NARJISS ?',
                'why_title' => 'Une approche plus claire pour acheter ou investir au Maroc.',
                'map_title' => 'Tous les projets dans leur environnement réel.',
                'live' => 'En ligne',
                'poi' => 'POI',
                'interactive_map' => 'Carte interactive',
                'tour' => 'Visite 360°',
                'mass_plan' => 'Plan de masse',
                'vision' => 'Vision',
                'vision_title' => 'Signature immobilière à Agadir',
                'markers' => 'Repères',
                'markers_text' => 'Les principaux lieux autour du projet sont prêts à être organisés dans JetEngine.',
                'type' => 'Type',
                'project_type_fallback' => 'Projet immobilier',
                'floorplan' => 'Floorplan',
                'floorplan_title' => 'Plan responsive, document complet au clic.',
                'project_map_title' => 'Le projet dans son quartier.',
                'about_title' => 'À propos de NARJISS',
                'about_text' => 'NARJISS prépare une expérience immobilière premium pour présenter des projets au Maroc avec cartes interactives, plans, visites 360° et contenus multilingues.',
                'contact_title' => 'Contact NARJISS',
                'contact_text' => 'Une question sur un projet ? La plateforme peut connecter rapidement le visiteur à un conseiller.',
                'footer_text' => 'Plateforme de découverte immobilière au Maroc.',
            ],
            'en' => [
                'home' => 'Home',
                'projects' => 'Projects',
                'map' => 'Map',
                'about' => 'About',
                'contact' => 'Contact',
                'brand_tag' => 'Real estate in Morocco',
                'hero_title' => 'Buy smarter, invest with confidence',
                'hero_text' => 'NARJISS brings projects, maps, plans and local landmarks together so buyers can decide with clarity in Agadir.',
                'see_projects' => 'View projects',
                'global_map' => 'Global map',
                'projects_kicker' => 'Our projects',
                'projects_title' => 'A clear, geolocated selection ready to compare.',
                'why' => 'Why choose NARJISS?',
                'why_title' => 'A clearer way to buy or invest in Morocco.',
                'map_title' => 'All projects in their real environment.',
                'live' => 'Live',
                'poi' => 'POI',
                'interactive_map' => 'Interactive map',
                'tour' => '360° tour',
                'mass_plan' => 'Master plan',
                'vision' => 'Vision',
                'vision_title' => 'Real estate signature in Agadir',
                'markers' => 'Landmarks',
                'markers_text' => 'Key places around the project are ready to be structured in JetEngine.',
                'type' => 'Type',
                'project_type_fallback' => 'Real estate project',
                'floorplan' => 'Floorplan',
                'floorplan_title' => 'Responsive plan, full document on click.',
                'project_map_title' => 'The project in its neighborhood.',
                'about_title' => 'About NARJISS',
                'about_text' => 'NARJISS is shaping a premium real estate experience for Moroccan projects with interactive maps, plans, 360° tours and multilingual content.',
                'contact_title' => 'Contact NARJISS',
                'contact_text' => 'Questions about a project? The platform can quickly connect visitors with an advisor.',
                'footer_text' => 'Real estate discovery platform in Morocco.',
            ],
            'ar' => [
                'home' => 'الرئيسية',
                'projects' => 'المشاريع',
                'map' => 'الخريطة',
                'about' => 'من نحن',
                'contact' => 'اتصل بنا',
                'brand_tag' => 'العقارات بالمغرب',
                'hero_title' => 'امتلك بثقة أكبر، واستثمر باطمئنان',
                'hero_text' => 'تجمع نرجس المشاريع والخرائط والمخططات والمعالم القريبة لمساعدة الزائر على اتخاذ قرار أوضح في أكادير.',
                'see_projects' => 'عرض المشاريع',
                'global_map' => 'الخريطة العامة',
                'projects_kicker' => 'مشاريعنا',
                'projects_title' => 'اختيار واضح ومحدد على الخريطة وسهل المقارنة.',
                'why' => 'لماذا تختار نرجس؟',
                'why_title' => 'طريقة أوضح للشراء أو الاستثمار في المغرب.',
                'map_title' => 'كل المشاريع داخل محيطها الحقيقي.',
                'live' => 'متاح',
                'poi' => 'نقطة',
                'interactive_map' => 'خريطة تفاعلية',
                'tour' => 'جولة 360°',
                'mass_plan' => 'مخطط الكتلة',
                'vision' => 'الرؤية',
                'vision_title' => 'بصمة عقارية في أكادير',
                'markers' => 'المعالم',
                'markers_text' => 'الأماكن الرئيسية حول المشروع جاهزة للتنظيم داخل JetEngine.',
                'type' => 'النوع',
                'project_type_fallback' => 'مشروع عقاري',
                'floorplan' => 'المخطط',
                'floorplan_title' => 'مخطط متجاوب، والوثيقة الكاملة عند النقر.',
                'project_map_title' => 'المشروع داخل محيطه.',
                'about_title' => 'نبذة عن نرجس',
                'about_text' => 'تعمل نرجس على تجربة عقارية راقية لعرض المشاريع في المغرب عبر خرائط تفاعلية ومخططات وجولات 360° ومحتوى متعدد اللغات.',
                'contact_title' => 'اتصل بنرجس',
                'contact_text' => 'هل لديك سؤال حول مشروع؟ يمكن للمنصة ربط الزائر بسرعة بمستشار.',
                'footer_text' => 'منصة لاكتشاف المشاريع العقارية في المغرب.',
            ],
            'es' => [
                'home' => 'Inicio',
                'projects' => 'Proyectos',
                'map' => 'Mapa',
                'about' => 'Acerca de',
                'contact' => 'Contacto',
                'brand_tag' => 'Inmobiliaria en Marruecos',
                'hero_title' => 'Compra mejor, invierte con tranquilidad',
                'hero_text' => 'NARJISS reúne proyectos, mapas, planos y referencias cercanas para decidir con más confianza en Agadir.',
                'see_projects' => 'Ver proyectos',
                'global_map' => 'Mapa global',
                'projects_kicker' => 'Nuestros proyectos',
                'projects_title' => 'Una selección clara, geolocalizada y fácil de comparar.',
                'why' => '¿Por qué elegir NARJISS?',
                'why_title' => 'Una forma más clara de comprar o invertir en Marruecos.',
                'map_title' => 'Todos los proyectos en su entorno real.',
                'live' => 'En línea',
                'poi' => 'POI',
                'interactive_map' => 'Mapa interactivo',
                'tour' => 'Visita 360°',
                'mass_plan' => 'Plan maestro',
                'vision' => 'Visión',
                'vision_title' => 'Firma inmobiliaria en Agadir',
                'markers' => 'Referencias',
                'markers_text' => 'Los lugares clave alrededor del proyecto están listos para organizarse en JetEngine.',
                'type' => 'Tipo',
                'project_type_fallback' => 'Proyecto inmobiliario',
                'floorplan' => 'Floorplan',
                'floorplan_title' => 'Plano responsive, documento completo al clic.',
                'project_map_title' => 'El proyecto en su barrio.',
                'about_title' => 'Acerca de NARJISS',
                'about_text' => 'NARJISS prepara una experiencia inmobiliaria premium para presentar proyectos en Marruecos con mapas interactivos, planos, visitas 360° y contenido multilingüe.',
                'contact_title' => 'Contactar con NARJISS',
                'contact_text' => '¿Una pregunta sobre un proyecto? La plataforma puede conectar rápidamente al visitante con un asesor.',
                'footer_text' => 'Plataforma de descubrimiento inmobiliario en Marruecos.',
            ],
        ];
    }

    private static function page_url($slug) {
        $page = get_page_by_path($slug);
        $url = $page ? get_permalink($page) : home_url('/' . trim($slug, '/') . '/');
        return add_query_arg('lang', self::lang(), $url);
    }

    private static function switch_lang_url($lang) {
        return add_query_arg('lang', $lang);
    }

    private static function i18n_meta($post_id, $key) {
        $value = get_post_meta($post_id, self::META_PREFIX . $key, true);
        $decoded = json_decode((string) $value, true);
        if (is_array($decoded)) {
            return $decoded[self::lang()] ?? $decoded['fr'] ?? reset($decoded);
        }
        return $value;
    }

    private static function project_type_label($type) {
        $map = [
            'Appartements' => ['fr' => 'Appartements', 'en' => 'Apartments', 'ar' => 'شقق', 'es' => 'Apartamentos'],
            'Terrains' => ['fr' => 'Terrains', 'en' => 'Land plots', 'ar' => 'أراضي', 'es' => 'Terrenos'],
            'Maisons' => ['fr' => 'Maisons', 'en' => 'Houses', 'ar' => 'منازل', 'es' => 'Casas'],
            'Bureaux' => ['fr' => 'Bureaux', 'en' => 'Offices', 'ar' => 'مكاتب', 'es' => 'Oficinas'],
            'Commerces' => ['fr' => 'Commerces', 'en' => 'Retail', 'ar' => 'محلات تجارية', 'es' => 'Comercios'],
        ];

        return $map[$type][self::lang()] ?? $type;
    }

    public static function nav_shortcode() {
        wp_enqueue_style('narjiss-bridge');
        $links = [
            'narjiss-wp-demo' => self::ui('home'),
            'projets' => self::ui('projects'),
            'carte' => self::ui('map'),
            'a-propos' => self::ui('about'),
            'contact' => self::ui('contact'),
        ];

        ob_start();
        ?>
        <nav class="narjiss-site-nav" dir="<?php echo esc_attr(self::dir()); ?>">
            <a class="narjiss-nav-brand" href="<?php echo esc_url(self::page_url('narjiss-wp-demo')); ?>">
                <strong>NARJISS</strong>
                <span><?php echo esc_html(self::ui('brand_tag')); ?></span>
            </a>
            <div class="narjiss-nav-links">
                <?php foreach ($links as $slug => $label) : ?>
                    <a href="<?php echo esc_url(self::page_url($slug)); ?>"><?php echo esc_html($label); ?></a>
                <?php endforeach; ?>
            </div>
            <div class="narjiss-lang-switcher" aria-label="Languages">
                <?php foreach (['fr' => 'FR', 'en' => 'EN', 'ar' => 'AR', 'es' => 'ES'] as $code => $label) : ?>
                    <a class="<?php echo self::lang() === $code ? 'is-active' : ''; ?>" href="<?php echo esc_url(self::switch_lang_url($code)); ?>"><?php echo esc_html($label); ?></a>
                <?php endforeach; ?>
            </div>
        </nav>
        <?php
        return ob_get_clean();
    }

    public static function footer_shortcode() {
        wp_enqueue_style('narjiss-bridge');
        ob_start();
        ?>
        <footer class="narjiss-site-footer" dir="<?php echo esc_attr(self::dir()); ?>">
            <strong>NARJISS</strong>
            <span><?php echo esc_html(self::ui('footer_text')); ?></span>
        </footer>
        <?php
        return ob_get_clean();
    }

    public static function home_shortcode() {
        wp_enqueue_style('narjiss-bridge');
        wp_enqueue_script('narjiss-bridge-home');

        ob_start();
        ?>
        <div class="narjiss-site-shell" dir="<?php echo esc_attr(self::dir()); ?>">
        <?php echo self::nav_shortcode(); ?>
        <section class="narjiss-home-hero">
            <div class="narjiss-home-slider" data-narjiss-home-slider>
                <?php foreach (self::home_slider_urls() as $index => $url) : ?>
                    <img class="<?php echo $index === 0 ? 'is-active' : ''; ?>" src="<?php echo esc_url($url); ?>" alt="NARJISS <?php echo esc_attr(self::ui('brand_tag')); ?>">
                <?php endforeach; ?>
            </div>
            <div class="narjiss-home-hero-content">
                <p class="narjiss-home-eyebrow">NARJISS — <?php echo esc_html(self::ui('brand_tag')); ?></p>
                <h1><?php echo esc_html(self::ui('hero_title')); ?></h1>
                <p><?php echo esc_html(self::ui('hero_text')); ?></p>
                <div class="narjiss-home-actions">
                    <a class="narjiss-button narjiss-button-primary" href="<?php echo esc_url(self::page_url('projets')); ?>"><?php echo esc_html(self::ui('see_projects')); ?></a>
                    <a class="narjiss-button narjiss-button-ghost" href="#narjiss-demo-map"><?php echo esc_html(self::ui('global_map')); ?></a>
                </div>
            </div>
        </section>
        <section class="narjiss-section narjiss-section-projects">
            <div class="narjiss-section-head">
                <span><?php echo esc_html(self::ui('projects_kicker')); ?></span>
                <h2><?php echo esc_html(self::ui('projects_title')); ?></h2>
            </div>
            <?php echo self::projects_shortcode(['limit' => -1]); ?>
        </section>
        <section class="narjiss-section narjiss-choice">
            <div class="narjiss-section-head">
                <span><?php echo esc_html(self::ui('why')); ?></span>
                <h2><?php echo esc_html(self::ui('why_title')); ?></h2>
            </div>
            <div class="narjiss-choice-grid">
                <?php foreach (self::home_arguments() as $argument) : ?>
                    <article>
                        <strong><?php echo esc_html($argument[0]); ?></strong>
                        <p><?php echo esc_html($argument[1]); ?></p>
                    </article>
                <?php endforeach; ?>
            </div>
        </section>
        <section id="narjiss-demo-map" class="narjiss-section narjiss-section-map">
            <div class="narjiss-section-head">
                <span><?php echo esc_html(self::ui('global_map')); ?></span>
                <h2><?php echo esc_html(self::ui('map_title')); ?></h2>
            </div>
            <?php echo self::map_shortcode(); ?>
        </section>
        <?php echo self::footer_shortcode(); ?>
        </div>
        <?php
        return ob_get_clean();
    }

    private static function home_slider_urls() {
        $ids = get_option('narjiss_home_slider_attachment_ids', []);
        $urls = [];

        foreach ((array) $ids as $id) {
            $url = wp_get_attachment_url((int) $id);
            if ($url) {
                $urls[] = $url;
            }
        }

        return $urls;
    }

    private static function home_arguments() {
        $items = [
            'fr' => [
                ['Des projets immédiatement compréhensibles', 'Type de bien, statut, localisation, plans et repères sont regroupés dans une lecture simple.'],
                ['Une vision terrain avant la visite', 'La carte et les points d’intérêt aident à comprendre le quartier, pas seulement le bâtiment.'],
                ['Des supports prêts pour la décision', 'Plans, PDF, images et visites 360° structurent l’échange avec l’acheteur ou l’investisseur.'],
                ['Une présentation premium et multilingue', 'Le même projet peut être présenté à des clients francophones, arabophones et internationaux.'],
                ['Un gain de temps commercial', 'Les informations essentielles sont centralisées et réutilisables dans WordPress, Elementor et JetEngine.'],
                ['Une base évolutive', 'La démo devient progressivement une vraie plateforme administrable sans perdre le travail déjà fait.'],
            ],
            'en' => [
                ['Projects understood at a glance', 'Property type, status, location, plans and landmarks are grouped into a clear reading experience.'],
                ['A field view before the visit', 'The map and points of interest explain the neighborhood, not only the building.'],
                ['Decision-ready material', 'Plans, PDFs, images and 360° tours structure the conversation with buyers and investors.'],
                ['Premium multilingual presentation', 'The same project can serve French, Arabic and international audiences.'],
                ['Commercial time saved', 'Essential information is centralized and reusable in WordPress, Elementor and JetEngine.'],
                ['An evolutive foundation', 'The demo gradually becomes an editable platform without losing the work already done.'],
            ],
            'ar' => [
                ['مشاريع مفهومة من النظرة الأولى', 'نوع العقار والحالة والموقع والمخططات والمعالم تظهر في قراءة واضحة.'],
                ['رؤية ميدانية قبل الزيارة', 'الخريطة ونقاط الاهتمام تشرح الحي، وليس المبنى فقط.'],
                ['محتوى جاهز لاتخاذ القرار', 'المخططات وملفات PDF والصور والجولات 360° تنظم الحوار مع المشتري أو المستثمر.'],
                ['عرض راق متعدد اللغات', 'يمكن تقديم نفس المشروع للجمهور العربي والفرنسي والدولي.'],
                ['توفير وقت تجاري', 'المعلومات الأساسية مركزية وقابلة لإعادة الاستخدام في WordPress وElementor وJetEngine.'],
                ['قاعدة قابلة للتطور', 'تتحول الديمو تدريجياً إلى منصة قابلة للإدارة دون ضياع العمل المنجز.'],
            ],
            'es' => [
                ['Proyectos entendibles al instante', 'Tipo de inmueble, estado, ubicación, planos y referencias se agrupan en una lectura clara.'],
                ['Una visión del terreno antes de visitar', 'El mapa y los puntos de interés explican el barrio, no solo el edificio.'],
                ['Material listo para decidir', 'Planos, PDF, imágenes y visitas 360° estructuran la conversación con compradores e inversores.'],
                ['Presentación premium multilingüe', 'El mismo proyecto puede servir a públicos francófonos, arabófonos e internacionales.'],
                ['Ahorro de tiempo comercial', 'La información esencial queda centralizada y reutilizable en WordPress, Elementor y JetEngine.'],
                ['Una base evolutiva', 'La demo se convierte poco a poco en una plataforma editable sin perder el trabajo realizado.'],
            ],
        ];

        return $items[self::lang()] ?? $items['fr'];
    }

    public static function project_detail_shortcode($atts) {
        wp_enqueue_style('narjiss-bridge');
        $atts = shortcode_atts(['id' => 0], $atts, 'narjiss_project_detail');
        $post_id = (int) $atts['id'] ?: get_the_ID();
        return self::render_project_detail($post_id);
    }

    public static function projects_page_shortcode() {
        wp_enqueue_style('narjiss-bridge');
        ob_start();
        ?>
        <div class="narjiss-site-shell narjiss-inner-page" dir="<?php echo esc_attr(self::dir()); ?>">
            <?php echo self::nav_shortcode(); ?>
            <header class="narjiss-page-hero">
                <span><?php echo esc_html(self::ui('projects')); ?></span>
                <h1><?php echo esc_html(self::ui('projects_title')); ?></h1>
            </header>
            <section class="narjiss-section">
                <?php echo self::projects_shortcode(['limit' => -1]); ?>
            </section>
            <?php echo self::footer_shortcode(); ?>
        </div>
        <?php
        return ob_get_clean();
    }

    public static function map_page_shortcode() {
        wp_enqueue_style('narjiss-bridge');
        ob_start();
        ?>
        <div class="narjiss-site-shell narjiss-inner-page" dir="<?php echo esc_attr(self::dir()); ?>">
            <?php echo self::nav_shortcode(); ?>
            <header class="narjiss-page-hero narjiss-page-hero-compact">
                <span><?php echo esc_html(self::ui('global_map')); ?></span>
                <h1><?php echo esc_html(self::ui('map_title')); ?></h1>
            </header>
            <section class="narjiss-section narjiss-section-map">
                <?php echo self::map_shortcode(); ?>
            </section>
            <?php echo self::footer_shortcode(); ?>
        </div>
        <?php
        return ob_get_clean();
    }

    public static function about_shortcode() {
        wp_enqueue_style('narjiss-bridge');
        return self::simple_page(self::ui('about'), self::ui('about_title'), self::ui('about_text'));
    }

    public static function contact_shortcode() {
        wp_enqueue_style('narjiss-bridge');
        return self::simple_page(self::ui('contact'), self::ui('contact_title'), self::ui('contact_text'), true);
    }

    private static function simple_page($kicker, $title, $text, $contact = false) {
        ob_start();
        ?>
        <div class="narjiss-site-shell narjiss-inner-page" dir="<?php echo esc_attr(self::dir()); ?>">
            <?php echo self::nav_shortcode(); ?>
            <header class="narjiss-page-hero">
                <span><?php echo esc_html($kicker); ?></span>
                <h1><?php echo esc_html($title); ?></h1>
                <p><?php echo esc_html($text); ?></p>
                <?php if ($contact) : ?>
                    <div class="narjiss-home-actions">
                        <a class="narjiss-button narjiss-button-primary" href="tel:+212600000000">+212 6 00 00 00 00</a>
                        <a class="narjiss-button narjiss-button-ghost" href="mailto:contact@narjiss.company">contact@narjiss.company</a>
                    </div>
                <?php endif; ?>
            </header>
            <?php echo self::footer_shortcode(); ?>
        </div>
        <?php
        return ob_get_clean();
    }

    private static function render_project_detail($post_id) {
        if (!$post_id || get_post_type($post_id) !== self::CPT) {
            return '';
        }

        wp_enqueue_style('narjiss-bridge');
        wp_enqueue_style('leaflet');
        wp_enqueue_script('leaflet');
        wp_enqueue_script('narjiss-bridge-map');

        $hero = get_post_meta($post_id, self::META_PREFIX . 'hero_url', true);
        $logo = get_post_meta($post_id, self::META_PREFIX . 'logo_url', true);
        $floorplan = get_post_meta($post_id, self::META_PREFIX . 'floorplan_url', true);
        $pdf = get_post_meta($post_id, self::META_PREFIX . 'mass_plan_pdf_url', true);
        $tour = get_post_meta($post_id, self::META_PREFIX . 'tour360_url', true);
        $title = self::i18n_meta($post_id, 'name_i18n') ?: get_the_title($post_id);
        $location = self::i18n_meta($post_id, 'location_i18n') ?: get_post_meta($post_id, self::META_PREFIX . 'location_fr', true);
        $poi_count = (int) get_post_meta($post_id, self::META_PREFIX . 'poi_count', true);
        $lat = (float) get_post_meta($post_id, self::META_PREFIX . 'lat', true);
        $lng = (float) get_post_meta($post_id, self::META_PREFIX . 'lng', true);
        $terms = get_the_terms($post_id, self::TAX_TYPE);
        $type = (!is_wp_error($terms) && !empty($terms)) ? self::project_type_label($terms[0]->name) : '';
        $map_id = 'narjiss-project-map-' . $post_id;

        wp_add_inline_script(
            'narjiss-bridge-map',
            'window.NarjissBridgeMaps = window.NarjissBridgeMaps || {}; window.NarjissBridgeMaps["' . esc_js($map_id) . '"] = ' . wp_json_encode([[
                'title' => $title,
                'url' => add_query_arg('lang', self::lang(), get_permalink($post_id)),
                'lat' => $lat,
                'lng' => $lng,
                'location' => $location,
            ]]) . ';',
            'before'
        );

        ob_start();
        ?>
        <article class="narjiss-detail" dir="<?php echo esc_attr(self::dir()); ?>">
            <?php echo self::nav_shortcode(); ?>
            <section class="narjiss-detail-hero">
                <?php if ($hero) : ?>
                    <img src="<?php echo esc_url($hero); ?>" alt="<?php echo esc_attr($title); ?>">
                <?php endif; ?>
                <div class="narjiss-detail-hero-copy">
                    <div class="narjiss-detail-badges">
                        <?php if ($type) : ?><span class="narjiss-badge narjiss-badge-type"><?php echo esc_html($type); ?></span><?php endif; ?>
                        <span class="narjiss-badge narjiss-badge-live"><?php echo esc_html(self::ui('live')); ?></span>
                    </div>
                    <?php if ($logo) : ?><img class="narjiss-detail-logo" src="<?php echo esc_url($logo); ?>" alt="Logo <?php echo esc_attr($title); ?>"><?php endif; ?>
                    <h1><?php echo esc_html($title); ?></h1>
                    <p><?php echo esc_html($location); ?></p>
                    <div class="narjiss-detail-actions">
                        <?php if ($tour) : ?><a class="narjiss-button narjiss-button-primary" href="<?php echo esc_url($tour); ?>" target="_blank" rel="noopener"><?php echo esc_html(self::ui('tour')); ?></a><?php endif; ?>
                        <?php if ($pdf) : ?><a class="narjiss-button narjiss-button-ghost" href="<?php echo esc_url($pdf); ?>" target="_blank" rel="noopener"><?php echo esc_html(self::ui('mass_plan')); ?></a><?php endif; ?>
                    </div>
                </div>
            </section>
            <section class="narjiss-detail-grid">
                <div class="narjiss-detail-panel narjiss-detail-vision">
                    <span><?php echo esc_html(self::ui('vision')); ?></span>
                    <h2><?php echo esc_html(self::ui('vision_title')); ?></h2>
                    <p><?php echo esc_html($location); ?></p>
                </div>
                <div class="narjiss-detail-panel">
                    <span><?php echo esc_html(self::ui('markers')); ?></span>
                    <h2><?php echo esc_html($poi_count); ?> <?php echo esc_html(self::ui('poi')); ?></h2>
                    <p><?php echo esc_html(self::ui('markers_text')); ?></p>
                </div>
                <div class="narjiss-detail-panel">
                    <span><?php echo esc_html(self::ui('type')); ?></span>
                    <h2><?php echo esc_html($type ?: self::ui('project_type_fallback')); ?></h2>
                    <p><?php echo esc_html(self::ui('interactive_map')); ?></p>
                </div>
            </section>
            <section class="narjiss-detail-media">
                <div>
                    <span><?php echo esc_html(self::ui('floorplan')); ?></span>
                    <h2><?php echo esc_html(self::ui('floorplan_title')); ?></h2>
                </div>
                <?php if ($floorplan) : ?>
                    <a class="narjiss-floorplan" href="<?php echo esc_url($pdf ?: $floorplan); ?>" target="_blank" rel="noopener">
                        <img src="<?php echo esc_url($floorplan); ?>" alt="<?php echo esc_attr(self::ui('floorplan') . ' ' . $title); ?>">
                    </a>
                <?php endif; ?>
            </section>
            <section class="narjiss-detail-map">
                <div>
                    <span><?php echo esc_html(self::ui('map')); ?></span>
                    <h2><?php echo esc_html(self::ui('project_map_title')); ?></h2>
                </div>
                <div id="<?php echo esc_attr($map_id); ?>" class="narjiss-map narjiss-project-map" data-narjiss-map="<?php echo esc_attr($map_id); ?>"></div>
            </section>
            <?php echo self::footer_shortcode(); ?>
        </article>
        <?php
        return ob_get_clean();
    }

    public static function register_assets() {
        wp_register_style(
            'narjiss-bridge',
            plugin_dir_url(__FILE__) . 'assets/narjiss-bridge.css',
            [],
            '0.1.0'
        );

        wp_register_script(
            'leaflet',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
            [],
            '1.9.4',
            true
        );

        wp_register_style(
            'leaflet',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
            [],
            '1.9.4'
        );

        wp_register_script(
            'narjiss-bridge-map',
            plugin_dir_url(__FILE__) . 'assets/narjiss-bridge-map.js',
            ['leaflet'],
            '0.1.0',
            true
        );

        wp_register_script(
            'narjiss-bridge-home',
            plugin_dir_url(__FILE__) . 'assets/narjiss-bridge-home.js',
            [],
            '0.1.0',
            true
        );
    }

    public static function projects_shortcode($atts) {
        wp_enqueue_style('narjiss-bridge');

        $atts = shortcode_atts([
            'limit' => -1,
        ], $atts, 'narjiss_projects');

        $query = new WP_Query([
            'post_type' => self::CPT,
            'posts_per_page' => (int) $atts['limit'],
            'orderby' => 'menu_order title',
            'order' => 'ASC',
        ]);

        if (!$query->have_posts()) {
            return '<p>Aucun projet Narjiss importé.</p>';
        }

        ob_start();
        echo '<div class="narjiss-project-grid">';
        while ($query->have_posts()) {
            $query->the_post();
            $post_id = get_the_ID();
            $hero = get_post_meta($post_id, self::META_PREFIX . 'hero_url', true);
            $title = self::i18n_meta($post_id, 'name_i18n') ?: get_the_title($post_id);
            $location = self::i18n_meta($post_id, 'location_i18n') ?: get_post_meta($post_id, self::META_PREFIX . 'location_fr', true);
            $poi_count = (int) get_post_meta($post_id, self::META_PREFIX . 'poi_count', true);
            $terms = get_the_terms($post_id, self::TAX_TYPE);
            $type = (!is_wp_error($terms) && !empty($terms)) ? self::project_type_label($terms[0]->name) : '';
            ?>
            <article class="narjiss-project-card">
                <a class="narjiss-project-media" href="<?php echo esc_url(add_query_arg('lang', self::lang(), get_permalink())); ?>">
                    <?php if ($hero) : ?>
                        <img src="<?php echo esc_url($hero); ?>" alt="<?php echo esc_attr($title); ?>">
                    <?php endif; ?>
                    <span class="narjiss-badges">
                        <?php if ($type) : ?><span class="narjiss-badge narjiss-badge-type"><?php echo esc_html($type); ?></span><?php endif; ?>
                        <span class="narjiss-badge narjiss-badge-live"><?php echo esc_html(self::ui('live')); ?></span>
                    </span>
                </a>
                <div class="narjiss-project-body">
                    <h3><a href="<?php echo esc_url(add_query_arg('lang', self::lang(), get_permalink())); ?>"><?php echo esc_html($title); ?></a></h3>
                    <p><?php echo esc_html($location); ?></p>
                    <div class="narjiss-project-meta">
                        <span><?php echo esc_html($poi_count); ?> <?php echo esc_html(self::ui('poi')); ?></span>
                        <span><?php echo esc_html(self::ui('interactive_map')); ?></span>
                    </div>
                </div>
            </article>
            <?php
        }
        echo '</div>';
        wp_reset_postdata();

        return ob_get_clean();
    }

    public static function map_shortcode() {
        wp_enqueue_style('narjiss-bridge');
        wp_enqueue_style('leaflet');
        wp_enqueue_script('leaflet');
        wp_enqueue_script('narjiss-bridge-map');

        $query = new WP_Query([
            'post_type' => self::CPT,
            'posts_per_page' => -1,
        ]);

        $projects = [];
        while ($query->have_posts()) {
            $query->the_post();
            $post_id = get_the_ID();
            $projects[] = [
                'title' => self::i18n_meta($post_id, 'name_i18n') ?: get_the_title(),
                'url' => add_query_arg('lang', self::lang(), get_permalink()),
                'lat' => (float) get_post_meta($post_id, self::META_PREFIX . 'lat', true),
                'lng' => (float) get_post_meta($post_id, self::META_PREFIX . 'lng', true),
                'location' => self::i18n_meta($post_id, 'location_i18n') ?: get_post_meta($post_id, self::META_PREFIX . 'location_fr', true),
            ];
        }
        wp_reset_postdata();

        $id = 'narjiss-map-' . wp_generate_uuid4();
        wp_add_inline_script('narjiss-bridge-map', 'window.NarjissBridgeMaps = window.NarjissBridgeMaps || {}; window.NarjissBridgeMaps["' . esc_js($id) . '"] = ' . wp_json_encode($projects) . ';', 'before');

        return '<div id="' . esc_attr($id) . '" class="narjiss-map" data-narjiss-map="' . esc_attr($id) . '"></div>';
    }
}

Narjiss_Bridge::init();
register_activation_hook(__FILE__, ['Narjiss_Bridge', 'activate']);
register_deactivation_hook(__FILE__, ['Narjiss_Bridge', 'deactivate']);
