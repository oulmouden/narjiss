<?php

use Botble\RealEstate\Models\Project;
use Botble\SeoHelper\Facades\SeoHelper;
use Botble\Slug\Facades\SlugHelper;
use Botble\Theme\Facades\Theme;
use Illuminate\Support\Facades\Route;

Theme::registerRoutes(function (): void {
    Route::group(['namespace' => 'Theme\Resido\Http\Controllers'], function (): void {
        Route::get(
            SlugHelper::getPrefix(Project::class, 'projects') . '/city/{slug?}',
            'ResidoController@getProjectsByCity'
        )
            ->name('public.project-by-city');

        Route::get('agents', 'ResidoController@getAgents')->name('public.agents');
        Route::get('agents/{username}', 'ResidoController@getAgent')->name('public.agent');

        Route::get('wishlist', 'ResidoController@getWishlist')->name('public.wishlist');

        Route::get('ajax/cities', 'ResidoController@ajaxGetCities')->name('public.ajax.cities');

        Route::get('ajax/properties', 'ResidoController@ajaxGetProperties')->name('public.ajax.properties');
        Route::get('ajax/posts', 'ResidoController@ajaxGetPosts')->name('public.ajax.posts');
        Route::post('ajax/properties/map', 'ResidoController@ajaxGetPropertiesForMap')
            ->name('public.ajax.properties.map');

        Route::get('ajax/testimonials', 'ResidoController@ajaxGetTestimonials')
            ->name('public.ajax.testimonials');
        Route::get('ajax/real-estate-reviews/{id}', 'ResidoController@ajaxGetRealEstateReviews')
            ->name('public.ajax.real-estate-reviews');
        Route::get('ajax/real-estate-rating/{id}', 'ResidoController@ajaxGetRealEstateRating')
            ->name('public.ajax.real-estate-rating');

        Route::get('ajax/sub-categories', 'ResidoController@ajaxGetSubCategories')->name('public.ajax.sub-categories');

        Route::get('projects-filter', 'ResidoController@ajaxGetProjectsFilter')->name('public.ajax.projects-filter');
    });

    Route::get('narjiss/carte', function () {
        SeoHelper::setTitle('Carte des projets Narjiss');

        Theme::breadcrumb()
            ->add(__('Home'), route('public.index'))
            ->add('Carte Narjiss', route('public.narjiss.map'));

        return Theme::scope('narjiss.map')->render();
    })->name('public.narjiss.map');
});

Theme::routes();
