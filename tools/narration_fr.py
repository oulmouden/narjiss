# -*- coding: utf-8 -*-
"""Narration francaise, une entree par diapositive.

CE FICHIER EST LE SEUL A RETOUCHER POUR CHANGER LA VOIX OFF FRANCAISE.
Son pendant arabe est tools/narration_darija_ar.py.

Difference avec l'arabe : la version arabe AFFICHE du fusha et LIT de la darija,
parce que personne ne parle litteraire dans une reunion. En francais il n'y a pas
ce dedoublement — on ecrit et on parle la meme langue. Le texte ci-dessous reste
donc proche de celui du Word, simplement rendu a l'oral : phrases raccourcies,
enumerations annoncees, tournures ecrites defaites.

Regles suivies dans les textes ci-dessous :
 - « narjiss.company » s'ecrit **narjiss point company**, sinon la synthese
   epelle l'adresse ou marque un point de fin de phrase au milieu ;
 - de meme « narjissimmobiliere.com » -> « narjiss immobiliere point com » ;
 - 360 degres en toutes lettres, jamais le symbole.

L'ORDRE ET LE NOMBRE COMPTENT : une entree par diapositive, dans l'ordre du
document. Le script de publication verifie que le compte correspond au decoupage
du .docx et s'arrete net si le Word a bouge.
"""

NARRATION = [

    # 1 — couverture
    "narjiss point company : de la vitrine au véritable outil de vente. "
    "Dossier de présentation à la direction de Narjiss Immobilière, août 2026. "
    "Toutes les copies d'écran de ce document viennent du site en ligne, tel qu'il fonctionne "
    "aujourd'hui — rien n'est une maquette. "
    "Voilà ce que devient un bureau de vente Narjiss : le client et le conseiller regardent le "
    "même écran, ensemble.",

    # 2 — L'essentiel en une page
    "Commençons par l'essentiel. "
    "narjiss point company n'est pas un nouveau site vitrine. C'est l'outil avec lequel Narjiss "
    "vend. Le client y voit les logements réellement disponibles, il vérifie le quartier par "
    "lui-même, il visite en 360 degrés, il parle à un conseiller en direct. Et quand personne "
    "n'est disponible, une hôtesse virtuelle lui répond de vive voix, dans sa langue. "
    "Côté équipe, tout se met à jour depuis une administration, sans développeur, dans les "
    "quatre langues du site. "
    "Le site est en ligne et fonctionne aujourd'hui. Ce document explique ce qu'il change pour "
    "la vente, ce qu'il apporte au client, ce qu'il demande à l'entreprise, et pourquoi une "
    "borne tactile dans chaque agence en est le prolongement naturel.",

    # 3 — Six choses que le site actuel et Facebook ne peuvent pas faire
    "Il y a six choses que ni le site actuel ni les publications Facebook ne savent faire. "
    "Première : montrer, à la minute, quels logements sont disponibles, optionnés, réservés ou "
    "vendus — 454 logements sont aujourd'hui dans la grille. "
    "Deuxième : prouver ce qu'il y a autour du projet. Pour la Résidence Al Jawhara, "
    "77 commodités relevées une à une, dont 21 écoles et 15 pharmacies, avec leur distance. "
    "Troisième : faire visiter le projet, un appartement témoin et le bureau de vente en "
    "360 degrés, depuis un téléphone, à l'autre bout du monde. "
    "Quatrième : laisser une famille entière comparer et décider ensemble, chacun dans sa "
    "langue, sans se déplacer. "
    "Cinquième : accompagner un client à distance et en direct — le conseiller pilote l'écran "
    "du client et commente à la voix. "
    "Sixième : garder une trace exploitable de chaque contact — la fiche client, les logements "
    "retenus, les messages, et les suites données.",

    # 4 — Où en sommes-nous aujourd'hui  (intertitre)
    "Où en sommes-nous aujourd'hui ?",

    # 5 — Le site actuel
    "Le site actuel, narjiss immobiliere point com, est une vitrine soignée : il présente "
    "l'entreprise, ses valeurs et ses projets. Il fait bien ce pour quoi il a été conçu, et il "
    "garde son utilité pour l'image de marque. "
    "Mais il s'arrête là où commence la vente. Il ne dit pas ce qui reste disponible, il ne "
    "montre pas un logement précis, il ne prouve pas le quartier, il ne permet pas de visiter, "
    "et il ne garde aucune trace du visiteur. Et chaque mise à jour passe par un prestataire.",

    # 6 — Les publications Facebook
    "Les publications Facebook apportent de l'audience, et il faut les garder. "
    "Mais leurs limites sont connues de tous ceux qui vendent : une vidéo descend dans le fil "
    "et disparaît ; une affirmation comme « tout est à proximité » ne se vérifie pas ; un "
    "commentaire n'est pas un dossier client ; et un même message ne parle qu'à une langue à la "
    "fois. Surtout, un contenu Facebook ne peut pas dire à un client ce qui est encore "
    "disponible ce matin. "
    "Ce n'est pas un choix entre les deux : Facebook fait venir, narjiss point company "
    "transforme la visite en décision, et garde la trace.",

    # 7 — Ce que vit le client  (intertitre)
    "Voyons maintenant ce que vit le client, en cinq temps.",

    # 8 — 1. Il découvre
    "Premier temps : il découvre. "
    "Une page d'accueil, douze projets, une carte du Maroc. Le visiteur choisit sa langue en "
    "haut à droite — français, anglais, arabe, espagnol — et tout le site suit, y compris "
    "l'arabe écrit de droite à gauche.",

    # 9 — 2. Il vérifie le quartier
    "Deuxième temps : il vérifie le quartier. Et c'est le moment décisif. "
    "La première question d'un acheteur n'est pas le prix, c'est : qu'est-ce qu'il y a autour ? "
    "Une vidéo qui affirme que tout est à proximité vous demande de la confiance. Une carte qui "
    "nomme 21 écoles, 15 pharmacies, 7 lignes de transport et 7 mosquées, avec la distance de "
    "chacune depuis le projet, ne vous demande rien du tout. "
    "Le client filtre par catégorie, trie par distance, ouvre l'itinéraire, se l'envoie sur "
    "WhatsApp. Il n'a pas à nous croire : il vérifie.",

    # 10 — 3. Il visite
    "Troisième temps : il visite. "
    "Visite 360 degrés du projet, appartement témoin, plan d'architecte et plan commercial "
    "superposables, vidéos, album photo. Le client tourne la tête au doigt sur son téléphone, "
    "ou en grand sur la borne de l'agence.",

    # 11 — 4. Il choisit son logement
    "Quatrième temps : il choisit son logement. C'est le cœur de l'outil, et c'est ce qu'aucun "
    "site vitrine ne fait. "
    "La grille de commercialisation — celle qui vit aujourd'hui dans un fichier Excel — devient "
    "un plan que le client manipule lui-même : immeuble par immeuble, étage par étage, avec le "
    "statut de chaque logement, sa surface, son orientation et son prix. "
    "Il filtre selon ses critères, retient jusqu'à trois logements, les compare, puis envoie sa "
    "sélection. Et le conseiller le rappelle avec ces logements sous les yeux.",

    # 12 — 5. Il décide en famille
    "Cinquième temps : il décide en famille, même à distance. "
    "Un lien suffit à partager une sélection. Le fils à Casablanca, le père à Agadir et l'oncle "
    "à Bruxelles voient le même plan, la même visite, la même carte — chacun dans sa langue. "
    "C'est exactement la situation d'un Marocain résidant à l'étranger qui achète pour sa "
    "famille : jusqu'ici, il achetait sur parole et sur photos.",

    # 13 — L'humain d'abord  (intertitre)
    "L'humain d'abord, la machine en renfort.",

    # 14 — La visite guidée en direct
    "La visite guidée en direct. "
    "Le conseiller ouvre une visite, communique un code à six chiffres, et le client le saisit "
    "depuis chez lui. À partir de cet instant, l'écran du client suit celui du conseiller : "
    "changement de page, déplacement sur la carte, rotation dans une visite 360 degrés, tracé "
    "au doigt sur un plan. Et la voix passe dans le même canal. "
    "Concrètement : le conseiller entoure un lot sur la carte, mesure la distance jusqu'à "
    "l'école, et le client voit le trait se dessiner sur son propre écran, en direct.",

    # 15 — L'hôtesse virtuelle
    "L'hôtesse virtuelle, quand personne n'est là. "
    "Le soir, le week-end, ou quand un client appelle depuis Montréal à trois heures du matin, "
    "une hôtesse virtuelle prend le relais. Elle parle de vive voix — darija, arabe classique, "
    "français, anglais, espagnol — répond aux questions courantes, oriente vers le bon projet, "
    "prend le message et les coordonnées. "
    "Le lendemain matin, le commercial retrouve le message dans son espace, avec la "
    "transcription et le numéro : il rappelle en connaissant déjà la demande. "
    "Aucun appel ne tombe dans le vide.",

    # 16 — Ce qui change pour les équipes  (intertitre)
    "Voyons maintenant ce qui change pour les équipes.",

    # 17 — L'espace commercial
    "Chaque conseiller dispose de son espace. Il s'y déclare présent, il reçoit les demandes "
    "des visiteurs orientés par l'hôtesse, il y trouve les messages vocaux et écrits laissés en "
    "son absence, et il peut y monter lui-même une visite 360 degrés à partir de ses photos, "
    "sans aucun logiciel à installer.",

    # 18 — L'administration
    "L'administration. "
    "Tout ce que voit le client se pilote depuis une administration, sans toucher au code : "
    "les projets et leurs descriptions dans les quatre langues, les photos, les vidéos, les "
    "visites 360 degrés, les points d'intérêt, les zones cliquables des plans, les fiches "
    "clients et les comptes des conseillers. "
    "La grille des lots s'importe depuis le fichier Excel du promoteur ; un changement de "
    "statut se fait en un clic et se voit immédiatement sur le site. Mettre à jour une "
    "disponibilité prend quelques secondes, pas un appel à un prestataire.",

    # 19 — La fiche client
    "La fiche client. Le formulaire papier devient un écran. "
    "Le conseiller photographie le dos de la carte nationale, et le nom, le prénom, le numéro "
    "et la validité se remplissent seuls. La fiche arrive rattachée aux logements que le client "
    "avait retenus. Quant aux pièces d'identité, elles sont rangées hors du site, dans un "
    "coffre privé sur le serveur.",

    # 20 — Les bornes tactiles en agence
    "Les bornes tactiles en agence. "
    "Tout ce qui précède fonctionne déjà sur un téléphone et sur un ordinateur. La borne "
    "tactile ajoute ce qu'aucun écran personnel ne donne : deux personnes debout devant le même "
    "plan, à taille réelle, dans l'agence.",

    # 21 — Ce que la borne apporte
    "Ce que la borne apporte. "
    "Le client manipule le plan lui-même, et le conseiller commente à côté de lui, au lieu de "
    "retourner un écran d'ordinateur. "
    "La carte du quartier se parcourt au doigt, l'école se pointe du doigt, la distance "
    "s'affiche. "
    "La visite 360 degrés occupe tout l'écran : on regarde l'appartement, on ne regarde plus "
    "une brochure. "
    "Le logement se choisit sur place, avec son statut réel, et la fiche client se remplit dans "
    "la foulée par lecture de la carte nationale. "
    "Et l'attente à l'accueil devient du temps utile : le visiteur explore seul pendant que le "
    "conseiller termine un rendez-vous.",

    # 22 — Ce qu'elle remplace
    "Ce qu'elle remplace, maintenant. "
    "Les brochures imprimées qui vieillissent, les plans papier annotés au crayon, le tableau "
    "des disponibilités qu'il faut corriger à la main, et la phrase que tout acheteur a déjà "
    "entendue : « je vous rappelle avec les disponibilités ».",

    # 23 — Ce qu'il faut prévoir
    "Ce qu'il faut prévoir. "
    "Un écran tactile de 43 à 55 pouces avec ordinateur intégré, ou une table tactile pour le "
    "bureau de vente principal. "
    "Le navigateur ouvert en mode kiosque sur narjiss point company : aucune installation, "
    "aucun logiciel spécifique, aucune maintenance logicielle. "
    "Une connexion internet et un point électrique. Le site est déjà conçu pour le tactile : "
    "cibles larges, aucune action au survol, contrastes lisibles à deux mètres. "
    "Quant au devis matériel, il est à demander auprès de fournisseurs locaux : nous n'avançons "
    "ici aucun chiffre que nous n'aurions pas vérifié.",

    # 24 — Comparaison honnête (+ tableau)
    "Une comparaison honnête. Trois canaux, trois rôles. "
    "Le tableau ne dit pas qu'il faut abandonner les deux premiers, mais où chacun s'arrête. "
    "Présenter l'entreprise : les trois le font. Faire venir du public : c'est la force de "
    "Facebook. "
    "Mais les disponibilités à la minute, les prix et surfaces par logement, la preuve du "
    "quartier, la visite 360 degrés, le choix d'un logement précis, les quatre langues, le "
    "conseiller à distance, le hors-horaires et la trace du contact — tout cela s'arrête chez "
    "narjiss point company, et nulle part ailleurs. "
    "Et la mise à jour : au lieu de passer par un prestataire ou par une nouvelle publication, "
    "elle se fait par l'équipe, en quelques minutes.",

    # 25 — Ce que cela apporte, et ce que cela demande  (intertitre)
    "Ce que cela apporte, et ce que cela demande.",

    # 26 — Les gains attendus
    "Les gains attendus. "
    "Le client arrive informé : l'entretien porte sur sa décision, plus sur la description du "
    "projet. "
    "Moins de déplacements pour rien, dans les deux sens : le client sait ce qui reste, et le "
    "conseiller sait ce que le client a regardé. "
    "Les familles éloignées et les Marocains résidant à l'étranger participent vraiment au "
    "choix. "
    "Chaque contact laisse une trace exploitable, y compris hors horaires. "
    "Et une image d'entreprise à la hauteur des projets, avec le même discours dans les quatre "
    "langues, quel que soit l'interlocuteur.",

    # 27 — Les conditions de réussite
    "Les conditions de réussite, et disons-les clairement. "
    "La grille des lots doit rester à jour. C'est la condition numéro un : un site qui annonce "
    "disponible un logement vendu abîme la confiance plus qu'une brochure périmée. "
    "Chaque nouveau projet demande ses photos 360 degrés : une demi-journée de prises de vue "
    "par bureau de vente et par appartement témoin. "
    "Une personne doit être désignée pour valider les comptes des conseillers et surveiller les "
    "messages laissés hors horaires. "
    "Les bornes demandent un budget matériel et une installation par agence. "
    "Quant à la prise en main, elle tient en une à deux heures par équipe : les écrans sont "
    "ceux que les conseillers connaissent déjà côté client.",

    # 28 — Où en est le projet  (intertitre)
    "Où en est le projet, honnêtement ?",

    # 29 — En ligne et opérationnel aujourd'hui
    "Voici ce qui est en ligne et opérationnel aujourd'hui. "
    "Le site public dans les quatre langues : douze projets, fiches détaillées, carte globale, "
    "cartes de quartier, albums photos et vidéos. "
    "Les visites 360 degrés : le projet, un appartement témoin et le bureau de vente, pour la "
    "Résidence Al Jawhara. "
    "La grille de commercialisation : 454 logements, avec filtres, plans de masse, statuts et "
    "prix. "
    "La fiche de renseignement client avec lecture de la carte nationale, enregistrée en base, "
    "les pièces d'identité dans un coffre hors du site. "
    "La visite guidée en direct avec la voix, et l'hôtesse virtuelle vocale. "
    "L'espace commercial et l'administration complète. "
    "Et l'hébergement sur serveur privé, avec mise en ligne en une commande et sauvegarde avant "
    "chaque modification de contenu.",

    # 30 — Terminé ces derniers jours
    "Terminé ces derniers jours, et prêt à être mis en ligne : "
    "la synchronisation des tracés et des mesures pendant une visite guidée — ce que le "
    "conseiller dessine sur la carte apparaît chez le client. "
    "Et l'espace commercial ainsi que toute l'administration traduits dans les quatre langues, "
    "arabe compris, sens de lecture inversé.",

    # 31 — Ce qui reste à décider ou à produire
    "Ce qui reste à décider ou à produire : "
    "les bornes tactiles, avec le choix du matériel et des agences pilotes ; "
    "les visites 360 degrés des onze autres projets, et les vidéos qui manquent ; "
    "et le rythme de mise à jour de la grille des lots, avec la personne qui en répond.",

    # 32 — Trois prochaines étapes (+ clotures)
    "Pour finir, trois prochaines étapes. "
    "La première : une démonstration d'une heure en agence, sur un cas réel — un client qui "
    "cherche un F3 à Dcheira, du premier clic à la fiche remplie. "
    "La deuxième : une agence pilote équipée d'une borne, et un deuxième projet complété en "
    "360 degrés, pour vérifier le coût réel d'un projet. "
    "La troisième : une règle de mise à jour de la grille des lots — chaque semaine, par une "
    "personne nommée — et la mise en ligne des traductions du back-office. "
    "Le site est visible dès maintenant : narjiss point company. Le menu Démo déroule la "
    "présentation commerciale en quatre actes, telle qu'un conseiller peut la conduire devant "
    "un client. "
    "Et un document illustré complémentaire, « Ce que le site sait faire », détaille écran par "
    "écran l'ensemble des fonctions.",
]

# Consigne de jeu passee a la synthese vocale.
CONSIGNE = (
    "Voix de présentation devant la direction d'une entreprise : ton posé, chaleureux et "
    "assuré, débit calme, articulation nette, vraies pauses aux points. "
    "Français de France, jamais précipité."
)
