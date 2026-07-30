(function(){
let translateObjs = {};
const trans = (...a) => {
    return translateObjs[a[0x0]] = a, '';
};
function regTextVar(a, b) {
    var c = ![];
    return d(b);
    function d(k, l) {
        switch (k['toLowerCase']()) {
        case 'title':
        case 'subtitle':
        case 'photo.title':
        case 'photo.description':
            var m = (function () {
                switch (k['toLowerCase']()) {
                case 'title':
                case 'photo.title':
                    return 'media.label';
                case 'subtitle':
                    return 'media.data.subtitle';
                case 'photo.description':
                    return 'media.data.description';
                }
            }());
            if (m)
                return function () {
                    var r, s, t = (l && l['viewerName'] ? this['getComponentByName'](l['viewerName']) : undefined) || this['getMainViewer']();
                    if (k['toLowerCase']()['startsWith']('photo'))
                        r = this['getByClassName']('PhotoAlbumPlayListItem')['filter'](function (v) {
                            var w = v['get']('player');
                            return w && w['get']('viewerArea') == t;
                        })['map'](function (v) {
                            return v['get']('media')['get']('playList');
                        });
                    else
                        r = this['_getPlayListsWithViewer'](t), s = j['bind'](this, t);
                    if (!c) {
                        for (var u = 0x0; u < r['length']; ++u) {
                            r[u]['bind']('changing', f, this);
                        }
                        c = !![];
                    }
                    return i['call'](this, r, m, s);
                };
            break;
        case 'tour.name':
        case 'tour.description':
            return function () {
                return this['get']('data')['tour']['locManager']['trans'](k);
            };
        default:
            if (k['toLowerCase']()['startsWith']('viewer.')) {
                var n = k['split']('.'), o = n[0x1];
                if (o) {
                    var p = n['slice'](0x2)['join']('.');
                    return d(p, { 'viewerName': o });
                }
            } else {
                if (k['toLowerCase']()['startsWith']('quiz.') && 'Quiz' in TDV) {
                    var q = undefined, m = (function () {
                            switch (k['toLowerCase']()) {
                            case 'quiz.questions.answered':
                                return TDV['Quiz']['PROPERTY']['QUESTIONS_ANSWERED'];
                            case 'quiz.question.count':
                                return TDV['Quiz']['PROPERTY']['QUESTION_COUNT'];
                            case 'quiz.items.found':
                                return TDV['Quiz']['PROPERTY']['ITEMS_FOUND'];
                            case 'quiz.item.count':
                                return TDV['Quiz']['PROPERTY']['ITEM_COUNT'];
                            case 'quiz.score':
                                return TDV['Quiz']['PROPERTY']['SCORE'];
                            case 'quiz.score.total':
                                return TDV['Quiz']['PROPERTY']['TOTAL_SCORE'];
                            case 'quiz.time.remaining':
                                return TDV['Quiz']['PROPERTY']['REMAINING_TIME'];
                            case 'quiz.time.elapsed':
                                return TDV['Quiz']['PROPERTY']['ELAPSED_TIME'];
                            case 'quiz.time.limit':
                                return TDV['Quiz']['PROPERTY']['TIME_LIMIT'];
                            case 'quiz.media.items.found':
                                return TDV['Quiz']['PROPERTY']['PANORAMA_ITEMS_FOUND'];
                            case 'quiz.media.item.count':
                                return TDV['Quiz']['PROPERTY']['PANORAMA_ITEM_COUNT'];
                            case 'quiz.media.questions.answered':
                                return TDV['Quiz']['PROPERTY']['PANORAMA_QUESTIONS_ANSWERED'];
                            case 'quiz.media.question.count':
                                return TDV['Quiz']['PROPERTY']['PANORAMA_QUESTION_COUNT'];
                            case 'quiz.media.score':
                                return TDV['Quiz']['PROPERTY']['PANORAMA_SCORE'];
                            case 'quiz.media.score.total':
                                return TDV['Quiz']['PROPERTY']['PANORAMA_TOTAL_SCORE'];
                            case 'quiz.media.index':
                                return TDV['Quiz']['PROPERTY']['PANORAMA_INDEX'];
                            case 'quiz.media.count':
                                return TDV['Quiz']['PROPERTY']['PANORAMA_COUNT'];
                            case 'quiz.media.visited':
                                return TDV['Quiz']['PROPERTY']['PANORAMA_VISITED_COUNT'];
                            default:
                                var s = /quiz\.([\w_]+)\.(.+)/['exec'](k);
                                if (s) {
                                    q = s[0x1];
                                    switch ('quiz.' + s[0x2]) {
                                    case 'quiz.score':
                                        return TDV['Quiz']['OBJECTIVE_PROPERTY']['SCORE'];
                                    case 'quiz.score.total':
                                        return TDV['Quiz']['OBJECTIVE_PROPERTY']['TOTAL_SCORE'];
                                    case 'quiz.media.items.found':
                                        return TDV['Quiz']['OBJECTIVE_PROPERTY']['PANORAMA_ITEMS_FOUND'];
                                    case 'quiz.media.item.count':
                                        return TDV['Quiz']['OBJECTIVE_PROPERTY']['PANORAMA_ITEM_COUNT'];
                                    case 'quiz.media.questions.answered':
                                        return TDV['Quiz']['OBJECTIVE_PROPERTY']['PANORAMA_QUESTIONS_ANSWERED'];
                                    case 'quiz.media.question.count':
                                        return TDV['Quiz']['OBJECTIVE_PROPERTY']['PANORAMA_QUESTION_COUNT'];
                                    case 'quiz.questions.answered':
                                        return TDV['Quiz']['OBJECTIVE_PROPERTY']['QUESTIONS_ANSWERED'];
                                    case 'quiz.question.count':
                                        return TDV['Quiz']['OBJECTIVE_PROPERTY']['QUESTION_COUNT'];
                                    case 'quiz.items.found':
                                        return TDV['Quiz']['OBJECTIVE_PROPERTY']['ITEMS_FOUND'];
                                    case 'quiz.item.count':
                                        return TDV['Quiz']['OBJECTIVE_PROPERTY']['ITEM_COUNT'];
                                    case 'quiz.media.score':
                                        return TDV['Quiz']['OBJECTIVE_PROPERTY']['PANORAMA_SCORE'];
                                    case 'quiz.media.score.total':
                                        return TDV['Quiz']['OBJECTIVE_PROPERTY']['PANORAMA_TOTAL_SCORE'];
                                    }
                                }
                            }
                        }());
                    if (m)
                        return function () {
                            var r = this['get']('data')['quiz'];
                            if (r) {
                                if (!c) {
                                    if (q != undefined) {
                                        if (q == 'global') {
                                            var s = this['get']('data')['quizConfig'], t = s['objectives'];
                                            for (var u = 0x0, v = t['length']; u < v; ++u) {
                                                r['bind'](TDV['Quiz']['EVENT_OBJECTIVE_PROPERTIES_CHANGE'], h['call'](this, t[u]['id'], m), this);
                                            }
                                        } else
                                            r['bind'](TDV['Quiz']['EVENT_OBJECTIVE_PROPERTIES_CHANGE'], h['call'](this, q, m), this);
                                    } else
                                        r['bind'](TDV['Quiz']['EVENT_PROPERTIES_CHANGE'], g['call'](this, m), this);
                                    c = !![];
                                }
                                try {
                                    var w = 0x0;
                                    if (q != undefined) {
                                        if (q == 'global') {
                                            var s = this['get']('data')['quizConfig'], t = s['objectives'];
                                            for (var u = 0x0, v = t['length']; u < v; ++u) {
                                                w += r['getObjective'](t[u]['id'], m);
                                            }
                                        } else
                                            w = r['getObjective'](q, m);
                                    } else {
                                        w = r['get'](m);
                                        if (m == TDV['Quiz']['PROPERTY']['PANORAMA_INDEX'])
                                            w += 0x1;
                                    }
                                    return w;
                                } catch (x) {
                                    return undefined;
                                }
                            }
                        };
                }
            }
            break;
        }
        return function () {
            return '';
        };
    }
    function e() {
        var k = this['get']('data');
        k['updateText'](k['translateObjs'][a], a['split']('.')[0x0]);
        let l = a['split']('.'), m = l[0x0] + '_vr';
        m in this && k['updateText'](k['translateObjs'][a], m);
    }
    function f(k) {
        var l = k['data']['nextSelectedIndex'];
        if (l >= 0x0) {
            var m = k['source']['get']('items')[l], n = function () {
                    m['unbind']('begin', n, this, !![]), e['call'](this);
                };
            m['bind']('begin', n, this, !![]);
        }
    }
    function g(k) {
        return function (l) {
            k in l && e['call'](this);
        }['bind'](this);
    }
    function h(k, l) {
        return function (m, n) {
            k == m && l in n && e['call'](this);
        }['bind'](this);
    }
    function i(k, l, m) {
        for (var n = 0x0; n < k['length']; ++n) {
            var o = k[n], p = o['get']('selectedIndex');
            if (p >= 0x0) {
                var q = l['split']('.'), r = o['get']('items')[p];
                if (m !== undefined && !m['call'](this, r))
                    continue;
                for (var s = 0x0; s < q['length']; ++s) {
                    if (r == undefined)
                        return '';
                    r = 'get' in r ? r['get'](q[s]) : r[q[s]];
                }
                return r;
            }
        }
        return '';
    }
    function j(k, l) {
        var m = l['get']('player');
        return m !== undefined && m['get']('viewerArea') == k;
    }
}
var script = {"class":"Player","scripts":{"getCurrentPlayerWithMedia":TDV.Tour.Script.getCurrentPlayerWithMedia,"isComponentVisible":TDV.Tour.Script.isComponentVisible,"getAudioByTags":TDV.Tour.Script.getAudioByTags,"getCurrentPlayers":TDV.Tour.Script.getCurrentPlayers,"setLocale":TDV.Tour.Script.setLocale,"showPopupMedia":TDV.Tour.Script.showPopupMedia,"getGlobalAudio":TDV.Tour.Script.getGlobalAudio,"pauseGlobalAudios":TDV.Tour.Script.pauseGlobalAudios,"showPopupImage":TDV.Tour.Script.showPopupImage,"showPopupPanoramaVideoOverlay":TDV.Tour.Script.showPopupPanoramaVideoOverlay,"clone":TDV.Tour.Script.clone,"showPopupPanoramaOverlay":TDV.Tour.Script.showPopupPanoramaOverlay,"getMediaByName":TDV.Tour.Script.getMediaByName,"playGlobalAudioWhilePlayActiveMedia":TDV.Tour.Script.playGlobalAudioWhilePlayActiveMedia,"openLink":TDV.Tour.Script.openLink,"getMediaByTags":TDV.Tour.Script.getMediaByTags,"playGlobalAudioWhilePlay":TDV.Tour.Script.playGlobalAudioWhilePlay,"showWindow":TDV.Tour.Script.showWindow,"startModel3DWithCameraSpot":TDV.Tour.Script.startModel3DWithCameraSpot,"playGlobalAudio":TDV.Tour.Script.playGlobalAudio,"showWindowBase":TDV.Tour.Script.showWindowBase,"getComponentsByTags":TDV.Tour.Script.getComponentsByTags,"textToSpeech":TDV.Tour.Script.textToSpeech,"getMediaFromPlayer":TDV.Tour.Script.getMediaFromPlayer,"setValue":TDV.Tour.Script.setValue,"startPanoramaWithCamera":TDV.Tour.Script.startPanoramaWithCamera,"getMediaWidth":TDV.Tour.Script.getMediaWidth,"quizShowQuestion":TDV.Tour.Script.quizShowQuestion,"startPanoramaWithModel":TDV.Tour.Script.startPanoramaWithModel,"quizSetItemFound":TDV.Tour.Script.quizSetItemFound,"getMediaHeight":TDV.Tour.Script.getMediaHeight,"getPixels":TDV.Tour.Script.getPixels,"startMeasurement":TDV.Tour.Script.startMeasurement,"playAudioList":TDV.Tour.Script.playAudioList,"getModel3DInnerObject":TDV.Tour.Script.getModel3DInnerObject,"restartTourWithoutInteraction":TDV.Tour.Script.restartTourWithoutInteraction,"stopMeasurement":TDV.Tour.Script.stopMeasurement,"_getObjectsByTags":TDV.Tour.Script._getObjectsByTags,"toggleMeasurement":TDV.Tour.Script.toggleMeasurement,"getOverlays":TDV.Tour.Script.getOverlays,"quizPauseTimer":TDV.Tour.Script.quizPauseTimer,"takeScreenshot":TDV.Tour.Script.takeScreenshot,"getOverlaysByTags":TDV.Tour.Script.getOverlaysByTags,"quizResumeTimer":TDV.Tour.Script.quizResumeTimer,"cleanSelectedMeasurements":TDV.Tour.Script.cleanSelectedMeasurements,"getOverlaysByGroupname":TDV.Tour.Script.getOverlaysByGroupname,"getComponentByName":TDV.Tour.Script.getComponentByName,"cleanAllMeasurements":TDV.Tour.Script.cleanAllMeasurements,"setMeasurementsVisibility":TDV.Tour.Script.setMeasurementsVisibility,"getKey":TDV.Tour.Script.getKey,"getPanoramaOverlayByName":TDV.Tour.Script.getPanoramaOverlayByName,"resumePlayers":TDV.Tour.Script.resumePlayers,"toggleMeasurementsVisibility":TDV.Tour.Script.toggleMeasurementsVisibility,"getPanoramaOverlaysByTags":TDV.Tour.Script.getPanoramaOverlaysByTags,"resumeGlobalAudios":TDV.Tour.Script.resumeGlobalAudios,"setMeasurementUnits":TDV.Tour.Script.setMeasurementUnits,"syncPlaylists":TDV.Tour.Script.syncPlaylists,"stopGlobalAudios":TDV.Tour.Script.stopGlobalAudios,"stopAndGoCamera":TDV.Tour.Script.stopAndGoCamera,"setMapLocation":TDV.Tour.Script.setMapLocation,"init":TDV.Tour.Script.init,"_getPlayListsWithViewer":TDV.Tour.Script._getPlayListsWithViewer,"stopTextToSpeech":TDV.Tour.Script.stopTextToSpeech,"stopGlobalAudio":TDV.Tour.Script.stopGlobalAudio,"getPlayListWithItem":TDV.Tour.Script.getPlayListWithItem,"sendAnalyticsData":TDV.Tour.Script.sendAnalyticsData,"getFirstPlayListWithMedia":TDV.Tour.Script.getFirstPlayListWithMedia,"setCameraSameSpotAsMedia":TDV.Tour.Script.setCameraSameSpotAsMedia,"textToSpeechComponent":TDV.Tour.Script.textToSpeechComponent,"getPlayListItems":TDV.Tour.Script.getPlayListItems,"setComponentVisibility":TDV.Tour.Script.setComponentVisibility,"toggleTextToSpeechComponent":TDV.Tour.Script.toggleTextToSpeechComponent,"getPlayListItemByMedia":TDV.Tour.Script.getPlayListItemByMedia,"setComponentsVisibilityByTags":TDV.Tour.Script.setComponentsVisibilityByTags,"getPlayListItemIndexByMedia":TDV.Tour.Script.getPlayListItemIndexByMedia,"triggerOverlay":TDV.Tour.Script.triggerOverlay,"getQuizTotalObjectiveProperty":TDV.Tour.Script.getQuizTotalObjectiveProperty,"unloadViewer":TDV.Tour.Script.unloadViewer,"getRootOverlay":TDV.Tour.Script.getRootOverlay,"setEndToItemIndex":TDV.Tour.Script.setEndToItemIndex,"updateDeepLink":TDV.Tour.Script.updateDeepLink,"fixTogglePlayPauseButton":TDV.Tour.Script.fixTogglePlayPauseButton,"updateIndexGlobalZoomImage":TDV.Tour.Script.updateIndexGlobalZoomImage,"historyGoBack":TDV.Tour.Script.historyGoBack,"getMainViewer":TDV.Tour.Script.getMainViewer,"mixObject":TDV.Tour.Script.mixObject,"historyGoForward":TDV.Tour.Script.historyGoForward,"autotriggerAtStart":TDV.Tour.Script.autotriggerAtStart,"updateVideoCues":TDV.Tour.Script.updateVideoCues,"setMainMediaByIndex":TDV.Tour.Script.setMainMediaByIndex,"htmlToPlainText":TDV.Tour.Script.htmlToPlainText,"changeBackgroundWhilePlay":TDV.Tour.Script.changeBackgroundWhilePlay,"updateMediaLabelFromPlayList":TDV.Tour.Script.updateMediaLabelFromPlayList,"visibleComponentsIfPlayerFlagEnabled":TDV.Tour.Script.visibleComponentsIfPlayerFlagEnabled,"setMainMediaByName":TDV.Tour.Script.setMainMediaByName,"disableVR":TDV.Tour.Script.disableVR,"changeOpacityWhilePlay":TDV.Tour.Script.changeOpacityWhilePlay,"enableVR":TDV.Tour.Script.enableVR,"setMediaBehaviour":TDV.Tour.Script.setMediaBehaviour,"initAnalytics":TDV.Tour.Script.initAnalytics,"changePlayListWithSameSpot":TDV.Tour.Script.changePlayListWithSameSpot,"getStateTextToSpeech":TDV.Tour.Script.getStateTextToSpeech,"quizShowScore":TDV.Tour.Script.quizShowScore,"setModel3DCameraSpot":TDV.Tour.Script.setModel3DCameraSpot,"initOverlayGroupRotationOnClick":TDV.Tour.Script.initOverlayGroupRotationOnClick,"setModel3DCameraSequence":TDV.Tour.Script.setModel3DCameraSequence,"quizShowTimeout":TDV.Tour.Script.quizShowTimeout,"setModel3DCameraWithCurrentSpot":TDV.Tour.Script.setModel3DCameraWithCurrentSpot,"initQuiz":TDV.Tour.Script.initQuiz,"cloneBindings":TDV.Tour.Script.cloneBindings,"_initSplitViewer":TDV.Tour.Script._initSplitViewer,"clonePanoramaCamera":TDV.Tour.Script.clonePanoramaCamera,"toggleVR":TDV.Tour.Script.toggleVR,"registerKey":TDV.Tour.Script.registerKey,"setObjectsVisibility":TDV.Tour.Script.setObjectsVisibility,"_initTwinsViewer":TDV.Tour.Script._initTwinsViewer,"createTween":TDV.Tour.Script.createTween,"unregisterKey":TDV.Tour.Script.unregisterKey,"setObjectsVisibilityByID":TDV.Tour.Script.setObjectsVisibilityByID,"copyToClipboard":TDV.Tour.Script.copyToClipboard,"existsKey":TDV.Tour.Script.existsKey,"copyObjRecursively":TDV.Tour.Script.copyObjRecursively,"isCardboardViewMode":TDV.Tour.Script.isCardboardViewMode,"setOverlaysVisibility":TDV.Tour.Script.setOverlaysVisibility,"setOverlayBehaviour":TDV.Tour.Script.setOverlayBehaviour,"isPanorama":TDV.Tour.Script.isPanorama,"setOverlaysVisibilityByTags":TDV.Tour.Script.setOverlaysVisibilityByTags,"setObjectsVisibilityByTags":TDV.Tour.Script.setObjectsVisibilityByTags,"keepCompVisible":TDV.Tour.Script.keepCompVisible,"setPanoramaCameraWithCurrentSpot":TDV.Tour.Script.setPanoramaCameraWithCurrentSpot,"createTweenModel3D":TDV.Tour.Script.createTweenModel3D,"_initItemWithComps":TDV.Tour.Script._initItemWithComps,"setPanoramaCameraWithSpot":TDV.Tour.Script.setPanoramaCameraWithSpot,"downloadFile":TDV.Tour.Script.downloadFile,"setDirectionalPanoramaAudio":TDV.Tour.Script.setDirectionalPanoramaAudio,"setPlayListSelectedIndex":TDV.Tour.Script.setPlayListSelectedIndex,"getPlayListsWithMedia":TDV.Tour.Script.getPlayListsWithMedia,"loadFromCurrentMediaPlayList":TDV.Tour.Script.loadFromCurrentMediaPlayList,"executeJS":TDV.Tour.Script.executeJS,"quizStart":TDV.Tour.Script.quizStart,"executeAudioActionByTags":TDV.Tour.Script.executeAudioActionByTags,"executeFunctionWhenChange":TDV.Tour.Script.executeFunctionWhenChange,"executeAudioAction":TDV.Tour.Script.executeAudioAction,"setSurfaceSelectionHotspotMode":TDV.Tour.Script.setSurfaceSelectionHotspotMode,"setStartTimeVideo":TDV.Tour.Script.setStartTimeVideo,"_initTTSTooltips":TDV.Tour.Script._initTTSTooltips,"translate":TDV.Tour.Script.translate,"openEmbeddedPDF":TDV.Tour.Script.openEmbeddedPDF,"getActiveMediaWithViewer":TDV.Tour.Script.getActiveMediaWithViewer,"pauseCurrentPlayers":TDV.Tour.Script.pauseCurrentPlayers,"getActivePlayerWithViewer":TDV.Tour.Script.getActivePlayerWithViewer,"quizFinish":TDV.Tour.Script.quizFinish,"assignObjRecursively":TDV.Tour.Script.assignObjRecursively,"pauseGlobalAudiosWhilePlayItem":TDV.Tour.Script.pauseGlobalAudiosWhilePlayItem,"shareSocial":TDV.Tour.Script.shareSocial,"skip3DTransitionOnce":TDV.Tour.Script.skip3DTransitionOnce,"pauseGlobalAudio":TDV.Tour.Script.pauseGlobalAudio,"showComponentsWhileMouseOver":TDV.Tour.Script.showComponentsWhileMouseOver,"setStartTimeVideoSync":TDV.Tour.Script.setStartTimeVideoSync,"getActivePlayersWithViewer":TDV.Tour.Script.getActivePlayersWithViewer},"start":"this.init(); this.syncPlaylists([this.mainPlayList,this.ThumbnailList_B8AD6920_B5B7_56C3_41BE_FD201093BD8D_playlist])","id":"rootPlayer","data":{"history":{},"name":"Player11751","textToSpeechConfig":{"pitch":1,"speechOnQuizQuestion":false,"volume":1,"speechOnInfoWindow":false,"stopBackgroundAudio":false,"rate":1,"speechOnTooltip":false},"displayTooltipInTouchScreens":true,"defaultLocale":"fr","locales":{"fr":"locale/fr.txt"}},"backgroundColor":["#FFFFFF"],"watermark":false,"backgroundColorRatios":[0],"hash": "c00df2a20c4a9d0821ee0e9fcfe8af9677643f557239bbff4905665073d1e967", "definitions": [{"enterPointingToHorizon":true,"class":"PanoramaCamera","id":"panorama_BA09B82D_B5BB_76DD_41E3_DBD39950358C_camera","initialPosition":{"pitch":-9.9,"class":"PanoramaCameraPosition","yaw":-37.72},"initialSequence":"this.sequence_BA09F29A_B5BB_5BC4_41AC_CB8C4025BB34"},{"id":"ThumbnailList_B8AD6920_B5B7_56C3_41BE_FD201093BD8D_playlist","items":[{"camera":"this.panorama_BA098F14_B5BB_4AC3_41DA_D7AEE23BB08A_camera","class":"PanoramaPlayListItem","media":"this.panorama_BA098F14_B5BB_4AC3_41DA_D7AEE23BB08A","player":"this.MainViewerPanoramaPlayer"},{"camera":"this.panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442_camera","class":"PanoramaPlayListItem","media":"this.panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442","player":"this.MainViewerPanoramaPlayer"},{"camera":"this.panorama_BA7E24BB_B5BB_7FC5_41D3_3A3350E7BB0D_camera","class":"PanoramaPlayListItem","media":"this.panorama_BA7E24BB_B5BB_7FC5_41D3_3A3350E7BB0D","player":"this.MainViewerPanoramaPlayer"},{"camera":"this.panorama_BA09B82D_B5BB_76DD_41E3_DBD39950358C_camera","class":"PanoramaPlayListItem","media":"this.panorama_BA09B82D_B5BB_76DD_41E3_DBD39950358C","player":"this.MainViewerPanoramaPlayer"}],"class":"PlayList"},{"class":"Panorama","adjacentPanoramas":[{"data":{"overlayID":"overlay_B6C96AA2_B5CF_4BC7_41B8_55C7B3BF11A5"},"distance":1.42,"class":"AdjacentPanorama","yaw":150.09,"select":"this.overlay_B6C96AA2_B5CF_4BC7_41B8_55C7B3BF11A5.get('areas').forEach(function(a){ a.trigger('click') })","backwardYaw":161.52,"panorama":"this.panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442"}],"label":trans('panorama_BA09B82D_B5BB_76DD_41E3_DBD39950358C.label'),"id":"panorama_BA09B82D_B5BB_76DD_41E3_DBD39950358C","hfovMax":130,"hfov":360,"vfov":180,"overlays":["this.overlay_B6C96AA2_B5CF_4BC7_41B8_55C7B3BF11A5"],"data":{"label":"narjiss-bureau-commercial-2"},"frames":[{"class":"CubicPanoramaFrame","cube":{"class":"ImageResource","levels":[{"height":1024,"url":"media/panorama_BA09B82D_B5BB_76DD_41E3_DBD39950358C_0/{face}/0/{row}_{column}.webp","class":"TiledImageResourceLevel","colCount":12,"rowCount":2,"tags":"ondemand","width":6144},{"height":512,"url":"media/panorama_BA09B82D_B5BB_76DD_41E3_DBD39950358C_0/{face}/1/{row}_{column}.webp","class":"TiledImageResourceLevel","colCount":6,"rowCount":1,"tags":["ondemand","preload"],"width":3072}]},"thumbnailUrl":"media/panorama_BA09B82D_B5BB_76DD_41E3_DBD39950358C_t.webp"}],"hfovMin":"150%","thumbnailUrl":"media/panorama_BA09B82D_B5BB_76DD_41E3_DBD39950358C_t.webp"},{"class":"Panorama","adjacentPanoramas":[{"data":{"overlayID":"overlay_BB09777F_B5CB_F93D_41E5_4778A565CB2E"},"distance":1.56,"class":"AdjacentPanorama","yaw":30.56,"select":"this.overlay_BB09777F_B5CB_F93D_41E5_4778A565CB2E.get('areas').forEach(function(a){ a.trigger('click') })","backwardYaw":-147.98,"panorama":"this.panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442"}],"label":trans('panorama_BA7E24BB_B5BB_7FC5_41D3_3A3350E7BB0D.label'),"id":"panorama_BA7E24BB_B5BB_7FC5_41D3_3A3350E7BB0D","hfovMax":130,"hfov":360,"vfov":180,"overlays":["this.overlay_BB09777F_B5CB_F93D_41E5_4778A565CB2E"],"data":{"label":"narjiss-bureau-commercial-1"},"frames":[{"class":"CubicPanoramaFrame","cube":{"class":"ImageResource","levels":[{"height":1024,"url":"media/panorama_BA7E24BB_B5BB_7FC5_41D3_3A3350E7BB0D_0/{face}/0/{row}_{column}.webp","class":"TiledImageResourceLevel","colCount":12,"rowCount":2,"tags":"ondemand","width":6144},{"height":512,"url":"media/panorama_BA7E24BB_B5BB_7FC5_41D3_3A3350E7BB0D_0/{face}/1/{row}_{column}.webp","class":"TiledImageResourceLevel","colCount":6,"rowCount":1,"tags":["ondemand","preload"],"width":3072}]},"thumbnailUrl":"media/panorama_BA7E24BB_B5BB_7FC5_41D3_3A3350E7BB0D_t.webp"}],"hfovMin":"150%","thumbnailUrl":"media/panorama_BA7E24BB_B5BB_7FC5_41D3_3A3350E7BB0D_t.webp"},{"class":"PanoramaCamera","idleSequence":"this.sequence_BA08329A_B5BB_5BC4_41D7_C925A493861A","enterPointingToHorizon":true,"initialPosition":{"pitch":-18.18,"class":"PanoramaCameraPosition","yaw":41.11},"initialSequence":"this.sequence_BA08329A_B5BB_5BC4_41D7_C925A493861A","id":"panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442_camera"},{"displayPlayOverlay":true,"class":"VideoPlayer","xrEnabled":true,"id":"MainViewerVideoPlayer","viewerArea":"this.MainViewer","displayPlaybackBar":true,"clickAction":"play_pause"},{"mouseControlMode":"drag_rotation","touchControlMode":"drag_rotation","class":"PanoramaPlayer","viewerArea":"this.MainViewer","displayPlaybackBar":true,"arrowKeysAction":"translate","aaEnabled":true,"id":"MainViewerPanoramaPlayer","keepModel3DLoadedWithoutLocation":true},{"toolTipBackgroundColor":"#F6F6F6","toolTipFontFamily":"Arial","playbackBarHeadShadowBlurRadius":3,"height":"100%","subtitlesBorderColor":"#FFFFFF","subtitlesTextShadowHorizontalLength":1,"progressBorderColor":"#000000","toolTipPaddingRight":6,"playbackBarLeft":0,"playbackBarHeadShadowColor":"#000000","progressBackgroundColor":["#000000"],"progressBarBackgroundColor":["#3399FF"],"playbackBarHeadBackgroundColorRatios":[0,1],"progressBottom":10,"playbackBarHeadBorderSize":0,"playbackBarHeadHeight":15,"playbackBarHeadShadow":true,"toolTipShadowColor":"#333138","vrThumbstickRotationStep":20,"toolTipBorderColor":"#767676","playbackBarHeadShadowHorizontalLength":0,"vrPointerColor":"#FFFFFF","progressBorderSize":0,"progressBarBorderRadius":2,"playbackBarHeadBackgroundColor":["#111111","#666666"],"progressBarBorderSize":0,"toolTipPaddingTop":4,"data":{"name":"Main Viewer"},"playbackBarBottom":5,"subtitlesFontFamily":"Arial","toolTipPaddingBottom":4,"toolTipFontSize":"1.11vmin","toolTipPaddingLeft":6,"vrPointerSelectionColor":"#FF6600","subtitlesBottom":50,"progressHeight":2,"progressBorderRadius":2,"playbackBarHeadShadowVerticalLength":0,"playbackBarHeight":10,"playbackBarHeadWidth":6,"playbackBarBackgroundColor":["#FFFFFF"],"progressLeft":"33%","vrPointerSelectionTime":2000,"surfaceReticleColor":"#FFFFFF","playbackBarBackgroundColorDirection":"vertical","playbackBarProgressBorderSize":0,"playbackBarRight":0,"class":"ViewerArea","propagateClick":false,"playbackBarProgressBackgroundColor":["#3399FF"],"playbackBarProgressBorderRadius":0,"subtitlesGap":0,"id":"MainViewer","playbackBarHeadShadowOpacity":0.7,"subtitlesBackgroundColor":"#000000","subtitlesTextShadowVerticalLength":1,"playbackBarProgressBackgroundColorRatios":[0],"subtitlesTextShadowOpacity":1,"playbackBarBorderColor":"#FFFFFF","playbackBarBorderRadius":0,"playbackBarProgressBorderColor":"#000000","surfaceReticleSelectionColor":"#FFFFFF","progressBackgroundColorRatios":[0],"subtitlesFontColor":"#FFFFFF","minHeight":50,"playbackBarHeadBorderColor":"#000000","progressOpacity":0.7,"subtitlesTop":0,"progressRight":"33%","progressBarBackgroundColorDirection":"horizontal","playbackBarBorderSize":0,"minWidth":100,"progressBarBorderColor":"#000000","toolTipFontColor":"#606060","subtitlesTextShadowColor":"#000000","toolTipTextShadowColor":"#000000","width":"100%","progressBarBackgroundColorRatios":[0],"playbackBarHeadBorderRadius":0,"subtitlesFontSize":"3vmin","firstTransitionDuration":0,"subtitlesBackgroundOpacity":0.2,"playbackBarBackgroundOpacity":1},{"class":"Panorama","adjacentPanoramas":[{"data":{"overlayID":"overlay_BBD1D498_B5B6_DFC4_4171_5DDFD15E00EE"},"distance":4.32,"class":"AdjacentPanorama","yaw":-176.58,"select":"this.overlay_BBD1D498_B5B6_DFC4_4171_5DDFD15E00EE.get('areas').forEach(function(a){ a.trigger('click') })","backwardYaw":10.25,"panorama":"this.panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442"}],"label":trans('panorama_BA098F14_B5BB_4AC3_41DA_D7AEE23BB08A.label'),"id":"panorama_BA098F14_B5BB_4AC3_41DA_D7AEE23BB08A","hfovMax":130,"hfov":360,"vfov":180,"overlays":["this.overlay_BBD1D498_B5B6_DFC4_4171_5DDFD15E00EE"],"data":{"label":"narjiss-bureau-entree-avec-arbres"},"frames":[{"class":"CubicPanoramaFrame","cube":{"class":"ImageResource","levels":[{"height":1024,"url":"media/panorama_BA098F14_B5BB_4AC3_41DA_D7AEE23BB08A_0/{face}/0/{row}_{column}.webp","class":"TiledImageResourceLevel","colCount":12,"rowCount":2,"tags":"ondemand","width":6144},{"height":512,"url":"media/panorama_BA098F14_B5BB_4AC3_41DA_D7AEE23BB08A_0/{face}/1/{row}_{column}.webp","class":"TiledImageResourceLevel","colCount":6,"rowCount":1,"tags":["ondemand","preload"],"width":3072}]},"thumbnailUrl":"media/panorama_BA098F14_B5BB_4AC3_41DA_D7AEE23BB08A_t.webp"}],"hfovMin":"150%","thumbnailUrl":"media/panorama_BA098F14_B5BB_4AC3_41DA_D7AEE23BB08A_t.webp"},{"enterPointingToHorizon":true,"class":"PanoramaCamera","id":"panorama_BA7E24BB_B5BB_7FC5_41D3_3A3350E7BB0D_camera","initialPosition":{"pitch":-27.45,"class":"PanoramaCameraPosition","yaw":-168.95},"initialSequence":"this.sequence_BA08129A_B5BB_5BC4_41D3_853E4ADDD502"},{"enterPointingToHorizon":true,"class":"PanoramaCamera","id":"panorama_BA098F14_B5BB_4AC3_41DA_D7AEE23BB08A_camera","initialPosition":{"pitch":-2.3,"class":"PanoramaCameraPosition","yaw":-179.69},"initialSequence":"this.sequence_BA09B29A_B5BB_5BC4_41C0_29B3768E882F"},{"class":"Container","id":"Container_B8B1991F_B5B7_56FD_41DD_0BA9F603A266","horizontalAlign":"center","left":0,"data":{"name":"Container11753"},"right":0,"layout":"horizontal","scrollBarMargin":2,"minHeight":0,"minWidth":0,"bottom":0,"gap":10,"height":200,"backgroundOpacity":0,"scrollBarColor":"#000000","children":["this.ThumbnailList_B8AD6920_B5B7_56C3_41BE_FD201093BD8D"],"propagateClick":false,"verticalAlign":"bottom"},{"class":"Video","id":"video_B8118CDF_B5DD_CF7D_41DD_420EDF8F5FB2","width":1280,"video":"this.videores_BB30F7B1_B5D7_F9C5_41D7_8A3EC32D3467","data":{"label":"message-accueil-jawhara"},"height":720,"label":trans('video_B8118CDF_B5DD_CF7D_41DD_420EDF8F5FB2.label'),"thumbnailUrl":"media/video_B8118CDF_B5DD_CF7D_41DD_420EDF8F5FB2_t.webp"},{"id":"mainPlayList","items":[{"camera":"this.panorama_BA098F14_B5BB_4AC3_41DA_D7AEE23BB08A_camera","class":"PanoramaPlayListItem","player":"this.MainViewerPanoramaPlayer","media":"this.panorama_BA098F14_B5BB_4AC3_41DA_D7AEE23BB08A","begin":"this.setEndToItemIndex(this.mainPlayList, 0, 1)"},{"camera":"this.panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442_camera","class":"PanoramaPlayListItem","player":"this.MainViewerPanoramaPlayer","media":"this.panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442","begin":"this.setEndToItemIndex(this.mainPlayList, 1, 2)"},{"camera":"this.panorama_BA7E24BB_B5BB_7FC5_41D3_3A3350E7BB0D_camera","class":"PanoramaPlayListItem","player":"this.MainViewerPanoramaPlayer","media":"this.panorama_BA7E24BB_B5BB_7FC5_41D3_3A3350E7BB0D","begin":"this.setEndToItemIndex(this.mainPlayList, 2, 3)"},{"camera":"this.panorama_BA09B82D_B5BB_76DD_41E3_DBD39950358C_camera","class":"PanoramaPlayListItem","end":"this.trigger('tourEnded')","player":"this.MainViewerPanoramaPlayer","media":"this.panorama_BA09B82D_B5BB_76DD_41E3_DBD39950358C","begin":"this.setEndToItemIndex(this.mainPlayList, 3, 0)"}],"class":"PlayList"},{"id":"playList_B9F69AAF_B5CB_4BDD_41BD_92E957B9A3C0","items":[{"class":"VideoPlayListItem","player":"this.MainViewerVideoPlayer","media":"this.video_B8118CDF_B5DD_CF7D_41DD_420EDF8F5FB2","begin":"this.fixTogglePlayPauseButton(this.MainViewerVideoPlayer)","start":"this.MainViewerVideoPlayer.set('displayPlaybackBar', true); this.MainViewerVideoPlayer.set('displayPlayOverlay', true); this.MainViewerVideoPlayer.set('clickAction', 'play_pause'); this.changeBackgroundWhilePlay(this.playList_B9F69AAF_B5CB_4BDD_41BD_92E957B9A3C0, 0, '#000000'); this.pauseGlobalAudiosWhilePlayItem(this.playList_B9F69AAF_B5CB_4BDD_41BD_92E957B9A3C0, 0)"}],"class":"PlayList"},{"toolTipBackgroundColor":"#F6F6F6","toolTipFontFamily":"Arial","itemPaddingLeft":3,"toolTipPaddingRight":6,"itemLabelFontSize":14,"itemBackgroundColorRatios":[],"backgroundColorRatios":[0],"itemLabelFontWeight":"normal","data":{"name":"ThumbnailList11754"},"itemLabelFontColor":"#FFFFFF","itemThumbnailWidth":100,"toolTipShadowColor":"#333138","paddingTop":10,"toolTipBorderColor":"#767676","itemThumbnailShadowColor":"#000000","itemThumbnailShadowSpread":1,"itemThumbnailShadowOpacity":0.8,"toolTipPaddingTop":4,"itemLabelTextDecoration":"none","scrollBarMargin":2,"paddingBottom":10,"itemLabelFontFamily":"Arial","gap":10,"toolTipPaddingBottom":4,"playList":"this.ThumbnailList_B8AD6920_B5B7_56C3_41BE_FD201093BD8D_playlist","toolTipFontSize":"1.11vmin","toolTipPaddingLeft":6,"itemBackgroundColor":[],"scrollBarColor":"#FFFFFF","itemBackgroundColorDirection":"vertical","propagateClick":false,"itemThumbnailOpacity":1,"itemPaddingRight":3,"class":"ThumbnailList","itemLabelFontStyle":"normal","itemThumbnailShadowBlurRadius":4,"paddingLeft":20,"borderRadius":5,"itemBackgroundOpacity":0,"paddingRight":20,"id":"ThumbnailList_B8AD6920_B5B7_56C3_41BE_FD201093BD8D","backgroundColor":["#000000"],"tabIndex":0,"itemThumbnailShadow":true,"layout":"horizontal","itemPaddingTop":3,"itemBorderRadius":0,"itemThumbnailScaleMode":"fit_outside","itemThumbnailHeight":75,"itemThumbnailBorderRadius":5,"maxWidth":800,"maxHeight":600,"selectedItemLabelFontWeight":"bold","minHeight":0,"minWidth":0,"toolTipFontColor":"#606060","backgroundOpacity":0.2,"itemPaddingBottom":3,"toolTipTextShadowColor":"#000000","itemLabelGap":5},{"class":"Panorama","adjacentPanoramas":[{"data":{"overlayID":"overlay_B85C1F21_B5CE_CAC4_41E2_4EFABFD7728B"},"distance":2.86,"class":"AdjacentPanorama","yaw":-147.98,"select":"this.overlay_B85C1F21_B5CE_CAC4_41E2_4EFABFD7728B.get('areas').forEach(function(a){ a.trigger('click') })","backwardYaw":30.56,"panorama":"this.panorama_BA7E24BB_B5BB_7FC5_41D3_3A3350E7BB0D"},{"data":{"overlayID":"overlay_B8F73906_B5CA_D6CC_41CD_F4D9D414E5E7"},"distance":5.84,"class":"AdjacentPanorama","yaw":10.25,"select":"this.overlay_B8F73906_B5CA_D6CC_41CD_F4D9D414E5E7.get('areas').forEach(function(a){ a.trigger('click') })","backwardYaw":-176.58,"panorama":"this.panorama_BA098F14_B5BB_4AC3_41DA_D7AEE23BB08A"},{"data":{"overlayID":"overlay_B8F73906_B5CA_D6CC_41CD_F4D9D414E5E7"},"distance":5.84,"class":"AdjacentPanorama","yaw":10.25,"select":"this.overlay_B8F73906_B5CA_D6CC_41CD_F4D9D414E5E7.get('areas').forEach(function(a){ a.trigger('click') })","backwardYaw":-176.58,"panorama":"this.panorama_BA098F14_B5BB_4AC3_41DA_D7AEE23BB08A"},{"data":{"overlayID":"overlay_B9E9A570_B5CB_D943_4195_E59CE1207508"},"distance":4.77,"class":"AdjacentPanorama","yaw":161.52,"select":"this.overlay_B9E9A570_B5CB_D943_4195_E59CE1207508.get('areas').forEach(function(a){ a.trigger('click') })","backwardYaw":150.09,"panorama":"this.panorama_BA09B82D_B5BB_76DD_41E3_DBD39950358C"}],"label":trans('panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442.label'),"id":"panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442","hfovMax":130,"hfov":360,"vfov":180,"overlays":["this.overlay_BB633C09_B5DD_CEC5_41CE_33594F643F40","this.overlay_B8F73906_B5CA_D6CC_41CD_F4D9D414E5E7","this.overlay_B9E9A570_B5CB_D943_4195_E59CE1207508","this.overlay_B85C1F21_B5CE_CAC4_41E2_4EFABFD7728B"],"data":{"label":"narjiss-bureau-accueil-avec-hotesse"},"frames":[{"class":"CubicPanoramaFrame","cube":{"class":"ImageResource","levels":[{"height":1024,"url":"media/panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442_0/{face}/0/{row}_{column}.webp","class":"TiledImageResourceLevel","colCount":12,"rowCount":2,"tags":"ondemand","width":6144},{"height":512,"url":"media/panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442_0/{face}/1/{row}_{column}.webp","class":"TiledImageResourceLevel","colCount":6,"rowCount":1,"tags":["ondemand","preload"],"width":3072}]},"thumbnailUrl":"media/panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442_t.webp"}],"hfovMin":"150%","thumbnailUrl":"media/panorama_B8DC8F3C_B5BB_493C_41D7_876488BEB442_t.webp"},{"class":"PanoramaCameraSequence","id":"sequence_BA09F29A_B5BB_5BC4_41AC_CB8C4025BB34","movements":[{"easing":"cubic_in","class":"DistancePanoramaCameraMovement","yawDelta":18.5,"yawSpeed":7.96},{"class":"DistancePanoramaCameraMovement","yawDelta":323,"yawSpeed":7.96},{"easing":"cubic_out","class":"DistancePanoramaCameraMovement","yawDelta":18.5,"yawSpeed":7.96}]},{"data":{"hasPanoramaAction":true,"label":"Arrow 06a"},"class":"HotspotPanoramaOverlay","enabledInVR":true,"items":[{"pitch":-50.12,"distance":100,"class":"HotspotPanoramaOverlayImage","yaw":150.09,"data":{"label":"Arrow 06a"},"hfov":18.19,"vfov":15.5,"scaleMode":"fit_inside","image":"this.AnimatedImageResource_B9F51A1B_B5CB_4AC5_41B1_2C1DD6A2952F","roll":-28.7}],"maps":[],"useHandCursor":true,"id":"overlay_B6C96AA2_B5CF_4BC7_41B8_55C7B3BF11A5","areas":["this.HotspotPanoramaOverlayArea_B6CDEAB0_B5CF_4BC4_41D8_FF3465E46C76"]},{"data":{"hasPanoramaAction":true,"label":"Arrow 06a"},"class":"HotspotPanoramaOverlay","enabledInVR":true,"items":[{"pitch":-47.46,"distance":100,"class":"HotspotPanoramaOverlayImage","yaw":30.56,"data":{"label":"Arrow 06a"},"hfov":22.55,"vfov":16.41,"scaleMode":"fit_inside","image":"this.AnimatedImageResource_B9F54A1B_B5CB_4AC5_41D7_4F265915007E","roll":15.13}],"maps":[],"useHandCursor":true,"id":"overlay_BB09777F_B5CB_F93D_41E5_4778A565CB2E","areas":["this.HotspotPanoramaOverlayArea_BB22D78F_B5CB_F9DD_41C9_7EABA76FF9C3"]},{"class":"PanoramaCameraSequence","id":"sequence_BA08329A_B5BB_5BC4_41D7_C925A493861A","movements":[{"easing":"cubic_in","class":"DistancePanoramaCameraMovement","yawDelta":18.5,"yawSpeed":14.32},{"class":"DistancePanoramaCameraMovement","yawDelta":323,"yawSpeed":14.32},{"easing":"cubic_out","class":"DistancePanoramaCameraMovement","yawDelta":18.5,"yawSpeed":14.32}]},{"data":{"hasPanoramaAction":true,"label":"Arrow 06a"},"class":"HotspotPanoramaOverlay","enabledInVR":true,"items":[{"pitch":-21.49,"distance":100,"class":"HotspotPanoramaOverlayImage","yaw":-176.58,"data":{"label":"Arrow 06a"},"hfov":14.99,"vfov":9.01,"scaleMode":"fit_inside","image":"this.AnimatedImageResource_B9F44A1A_B5CB_4AC7_418D_CA505B72C6D8"}],"maps":[],"useHandCursor":true,"id":"overlay_BBD1D498_B5B6_DFC4_4171_5DDFD15E00EE","areas":["this.HotspotPanoramaOverlayArea_BB0D04C0_B5B6_DF43_419F_A833BAC6E294"]},{"class":"PanoramaCameraSequence","id":"sequence_BA08129A_B5BB_5BC4_41D3_853E4ADDD502","movements":[{"easing":"cubic_in","class":"DistancePanoramaCameraMovement","yawDelta":18.5,"yawSpeed":7.96},{"class":"DistancePanoramaCameraMovement","yawDelta":323,"yawSpeed":7.96},{"easing":"cubic_out","class":"DistancePanoramaCameraMovement","yawDelta":18.5,"yawSpeed":7.96}]},{"class":"PanoramaCameraSequence","id":"sequence_BA09B29A_B5BB_5BC4_41C0_29B3768E882F","movements":[{"easing":"cubic_in","class":"DistancePanoramaCameraMovement","yawDelta":18.5,"yawSpeed":7.96},{"class":"DistancePanoramaCameraMovement","yawDelta":323,"yawSpeed":7.96},{"easing":"cubic_out","class":"DistancePanoramaCameraMovement","yawDelta":18.5,"yawSpeed":7.96}]},{"id":"videores_BB30F7B1_B5D7_F9C5_41D7_8A3EC32D3467","levels":["this.videolevel_B8CED7C8_B5D7_F943_41D6_F57D299ED536"],"height":642,"class":"VideoResource","width":1140},{"distance":50,"class":"QuadVideoPanoramaOverlay","rollOver":"this.overlay_BB633C09_B5DD_CEC5_41CE_33594F643F40.play()","vertices":[{"pitch":11.48,"class":"PanoramaPoint","yaw":13.93},{"pitch":10.95,"class":"PanoramaPoint","yaw":45.06},{"pitch":-4.54,"class":"PanoramaPoint","yaw":44.54},{"pitch":-5.95,"class":"PanoramaPoint","yaw":13.91}],"useHandCursor":true,"id":"overlay_BB633C09_B5DD_CEC5_41CE_33594F643F40","image":"this.res_BB3D2530_B5D7_FEC3_41CA_9DF8AEDA0029","cues":[],"video":"this.videores_BB30F7B1_B5D7_F9C5_41D7_8A3EC32D3467","data":{"label":"Video"},"click":"this.overlay_BB633C09_B5DD_CEC5_41CE_33594F643F40.pause()","toolTip":trans('overlay_BB633C09_B5DD_CEC5_41CE_33594F643F40.toolTip')},{"data":{"hasPanoramaAction":true,"label":"Arrow 06a"},"class":"HotspotPanoramaOverlay","enabledInVR":true,"items":[{"pitch":-16.23,"distance":100,"class":"HotspotPanoramaOverlayImage","yaw":10.25,"data":{"label":"Arrow 06a"},"hfov":7.86,"vfov":7.97,"scaleMode":"fit_inside","image":"this.AnimatedImageResource_B9F59A1A_B5CB_4AC7_41DA_4FE91B89CE0C"}],"maps":[],"useHandCursor":true,"id":"overlay_B8F73906_B5CA_D6CC_41CD_F4D9D414E5E7","areas":["this.HotspotPanoramaOverlayArea_B8B6A929_B5CA_D6C7_41C7_A733BAFE1BE6"]},{"data":{"hasPanoramaAction":true,"label":"Arrow 06a"},"class":"HotspotPanoramaOverlay","enabledInVR":true,"items":[{"pitch":-19.59,"distance":100,"class":"HotspotPanoramaOverlayImage","yaw":161.52,"data":{"label":"Arrow 06a"},"hfov":14.96,"vfov":12.83,"scaleMode":"fit_inside","image":"this.AnimatedImageResource_B9F56A1A_B5CB_4AC7_41C9_A18D7182F005"}],"maps":[],"useHandCursor":true,"id":"overlay_B9E9A570_B5CB_D943_4195_E59CE1207508","areas":["this.HotspotPanoramaOverlayArea_B9EA0575_B5CB_D94D_41BF_3F852054F0FF"]},{"data":{"hasPanoramaAction":true,"label":"Arrow 06a"},"class":"HotspotPanoramaOverlay","enabledInVR":true,"items":[{"pitch":-30.69,"distance":100,"class":"HotspotPanoramaOverlayImage","yaw":-147.98,"data":{"label":"Arrow 06a"},"hfov":14.54,"vfov":9.8,"scaleMode":"fit_inside","image":"this.AnimatedImageResource_B9F54A1A_B5CB_4AC7_41CC_A1C04DEF3ED3","roll":3.45}],"maps":[],"useHandCursor":true,"id":"overlay_B85C1F21_B5CE_CAC4_41E2_4EFABFD7728B","areas":["this.HotspotPanoramaOverlayArea_B8494F26_B5CE_CACC_41BC_E89AFD44242A"]},{"class":"AnimatedImageResource","frameDuration":41,"colCount":4,"rowCount":6,"levels":[{"height":420,"url":"media/res_BB5C40F0_B5B7_F743_4190_249A5EA0A518_0.webp","class":"ImageResourceLevel","width":480}],"finalFrame":"first","frameCount":24,"id":"AnimatedImageResource_B9F51A1B_B5CB_4AC5_41B1_2C1DD6A2952F"},{"click":"this.setPlayListSelectedIndex(this.mainPlayList, 1)","mapColor":"any","class":"HotspotPanoramaOverlayArea","id":"HotspotPanoramaOverlayArea_B6CDEAB0_B5CF_4BC4_41D8_FF3465E46C76","displayTooltipInTouchScreens":true},{"class":"AnimatedImageResource","frameDuration":41,"colCount":4,"rowCount":6,"levels":[{"height":420,"url":"media/res_BB5C40F0_B5B7_F743_4190_249A5EA0A518_0.webp","class":"ImageResourceLevel","width":480}],"finalFrame":"first","frameCount":24,"id":"AnimatedImageResource_B9F54A1B_B5CB_4AC5_41D7_4F265915007E"},{"click":"this.setPlayListSelectedIndex(this.mainPlayList, 1)","mapColor":"any","class":"HotspotPanoramaOverlayArea","id":"HotspotPanoramaOverlayArea_BB22D78F_B5CB_F9DD_41C9_7EABA76FF9C3","displayTooltipInTouchScreens":true},{"class":"AnimatedImageResource","frameDuration":41,"colCount":4,"rowCount":6,"levels":[{"height":420,"url":"media/res_BB5C40F0_B5B7_F743_4190_249A5EA0A518_0.webp","class":"ImageResourceLevel","width":480}],"finalFrame":"first","frameCount":24,"id":"AnimatedImageResource_B9F44A1A_B5CB_4AC7_418D_CA505B72C6D8"},{"click":"this.setPlayListSelectedIndex(this.mainPlayList, 1)","mapColor":"any","class":"HotspotPanoramaOverlayArea","id":"HotspotPanoramaOverlayArea_BB0D04C0_B5B6_DF43_419F_A833BAC6E294","displayTooltipInTouchScreens":true},{"posterURL":trans('videolevel_B8CED7C8_B5D7_F943_41D6_F57D299ED536.posterURL'),"height":642,"class":"VideoResourceLevel","bitrate":398,"codec":"h264","type":"video/mp4","url":trans('videolevel_B8CED7C8_B5D7_F943_41D6_F57D299ED536.url'),"id":"videolevel_B8CED7C8_B5D7_F943_41D6_F57D299ED536","framerate":24,"width":1140},{"id":"res_BB3D2530_B5D7_FEC3_41CA_9DF8AEDA0029","levels":[{"height":720,"url":"media/res_BB3D2530_B5D7_FEC3_41CA_9DF8AEDA0029_0.webp","class":"ImageResourceLevel","width":1280}],"class":"ImageResource"},{"class":"AnimatedImageResource","frameDuration":41,"colCount":4,"rowCount":6,"levels":[{"height":420,"url":"media/res_BB5C40F0_B5B7_F743_4190_249A5EA0A518_0.webp","class":"ImageResourceLevel","width":480}],"finalFrame":"first","frameCount":24,"id":"AnimatedImageResource_B9F59A1A_B5CB_4AC7_41DA_4FE91B89CE0C"},{"click":"this.setPlayListSelectedIndex(this.mainPlayList, 0); this.setPlayListSelectedIndex(this.mainPlayList, 0)","mapColor":"any","class":"HotspotPanoramaOverlayArea","id":"HotspotPanoramaOverlayArea_B8B6A929_B5CA_D6C7_41C7_A733BAFE1BE6","displayTooltipInTouchScreens":true},{"class":"AnimatedImageResource","frameDuration":41,"colCount":4,"rowCount":6,"levels":[{"height":420,"url":"media/res_BB5C40F0_B5B7_F743_4190_249A5EA0A518_0.webp","class":"ImageResourceLevel","width":480}],"finalFrame":"first","frameCount":24,"id":"AnimatedImageResource_B9F56A1A_B5CB_4AC7_41C9_A18D7182F005"},{"click":"this.setPlayListSelectedIndex(this.mainPlayList, 3)","mapColor":"any","class":"HotspotPanoramaOverlayArea","id":"HotspotPanoramaOverlayArea_B9EA0575_B5CB_D94D_41BF_3F852054F0FF","displayTooltipInTouchScreens":true},{"class":"AnimatedImageResource","frameDuration":41,"colCount":4,"rowCount":6,"levels":[{"height":420,"url":"media/res_BB5C40F0_B5B7_F743_4190_249A5EA0A518_0.webp","class":"ImageResourceLevel","width":480}],"finalFrame":"first","frameCount":24,"id":"AnimatedImageResource_B9F54A1A_B5CB_4AC7_41CC_A1C04DEF3ED3"},{"click":"this.setPlayListSelectedIndex(this.mainPlayList, 2)","mapColor":"any","class":"HotspotPanoramaOverlayArea","id":"HotspotPanoramaOverlayArea_B8494F26_B5CE_CACC_41BC_E89AFD44242A","displayTooltipInTouchScreens":true}],"xrPanelsEnabled":true,"layout":"absolute","scrollBarMargin":2,"minHeight":0,"minWidth":0,"gap":10,"scrollBarColor":"#000000","width":"100%","propagateClick":false,"children":["this.MainViewer","this.Container_B8B1991F_B5B7_56FD_41DD_0BA9F603A266"],"defaultMenu":["fullscreen","mute","rotation"],"height":"100%"};
if (script['data'] == undefined)
    script['data'] = {};
script['data']['translateObjs'] = translateObjs, script['data']['createQuizConfig'] = function () {
    let a = {}, b = this['get']('data')['translateObjs'];
    for (const c in translateObjs) {
        if (!b['hasOwnProperty'](c))
            b[c] = translateObjs[c];
    }
    return a;
}, TDV['PlayerAPI']['defineScript'](script);
//# sourceMappingURL=script_device.js.map
})();
//Generated with v2026.1.0, Wed Jul 29 2026