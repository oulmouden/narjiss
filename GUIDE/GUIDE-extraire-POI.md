# 📍 Guide : Extraire les POI autour d'une adresse en CSV

Ce guide explique 3 méthodes pour générer rapidement les fichiers CSV (POI quotidiens + POI majeurs) à partir des coordonnées GPS d'un lieu.

---

## 🥇 Méthode 1 (recommandée) : Demander à Claude (le plus rapide)

C'est **exactement ce que je fais quand vous me demandez** "trouve les POI autour de telle adresse". J'utilise mon outil `places_search` qui interroge Google Places pour vous trouver tous les commerces, services et lieux pertinents.

### Procédure

**Pour les POI quotidiens** (le fichier `<projet>_fr.csv`), envoyez-moi un message comme :

> *"Voici les coordonnées de la résidence : [LATITUDE], [LONGITUDE]. Adresse : [QUARTIER, VILLE]. Génère-moi un fichier CSV au format Catégorie;Emoji;Nom;Adresse;Note;Latitude;Longitude;Nb Avis;Téléphone;Horaires avec tous les POI dans un rayon de 1.5 km : pharmacies, supermarchés, boulangeries, mosquées, écoles, cafés, banques, santé, hammams."*

**Pour les POI majeurs** (le fichier `<projet>_major_fr.csv`), un autre message :

> *"Pour la même résidence à [VILLE], génère un CSV des POI majeurs régionaux : aéroport, plages, médina/souk, hôpitaux, commissariat, tribunal, poste, école internationale, stade, autoroute, gare, restaurants, malls. Format identique."*

Je vous renvoie les fichiers CSV directement, prêts à l'emploi.

### Avantages
- ✅ Aucun outil à installer
- ✅ Données récentes via Google Places
- ✅ Notes, avis, téléphones, horaires automatiquement
- ✅ Format CSV exact à uploader
- ✅ Je peux ajuster le rayon, les catégories, etc.

### Pour traduire ensuite en EN/AR/ES

Une fois le CSV français prêt, vous l'uploadez dans **Gemini AI Studio** avec le prompt de traduction du fichier `prompt-traduction-csv.md`, et vous obtenez les 3 traductions d'un coup.

---

## 🥈 Méthode 2 : Manuel via OpenStreetMap

Si vous voulez le faire à la main en croisant plusieurs sources :

### Étape 1 — Trouver les coordonnées GPS d'un lieu

**Sur OpenStreetMap** (sans compte) :
1. Allez sur [openstreetmap.org](https://www.openstreetmap.org/)
2. Recherchez le nom du lieu dans la barre de recherche
3. Clic droit sur le marqueur → **"Show address"**
4. Les coordonnées GPS s'affichent dans le panneau latéral

**Sur Google Maps** :
1. Allez sur [google.com/maps](https://www.google.com/maps)
2. Recherchez le lieu, ou clic droit n'importe où sur la carte
3. La popup affiche les coordonnées en haut → cliquez dessus pour les copier (format `30.3732, -9.5372`)

### Étape 2 — Trouver les commerces autour

**Avec Google Maps** :
1. Recherchez "pharmacie près de [adresse]" ou "supermarché Dcheira El Jihadia"
2. Pour chaque résultat : clic dessus → notez nom, adresse, note, téléphone
3. Clic droit sur le marqueur → coordonnées GPS

**Avec Overpass Turbo** (pour OpenStreetMap, plus technique) :
1. Allez sur [overpass-turbo.eu](https://overpass-turbo.eu)
2. Cliquez "Wizard" en haut, tapez : `pharmacy in 1.5km around 30.3732,-9.5372`
3. Cliquez "Run" → vous voyez tous les résultats sur la carte
4. Cliquez "Export" → "GeoJSON" pour télécharger les données

### Étape 3 — Remplir le CSV manuellement

Ouvrez Excel ou LibreOffice Calc, créez un fichier avec ces colonnes :

```
Catégorie | Emoji | Nom | Adresse | Note | Latitude | Longitude | Nb Avis | Téléphone | Horaires / Notes
```

Remplissez ligne par ligne. Sauvegardez en CSV avec **séparateur point-virgule** et **encodage UTF-8**.

### Avantages / Inconvénients
- ✅ Total contrôle sur les données
- ✅ Pas de quota
- ❌ Long (1-2 heures pour 30 POI)
- ❌ Pas d'avis / téléphone facilement

---

## 🥉 Méthode 3 : Géocodage en masse via API

Pour les développeurs qui veulent automatiser :

### Avec Geoapify (gratuit, 3000 requêtes/jour)

1. Créez un compte gratuit sur [geoapify.com](https://www.geoapify.com)
2. Récupérez votre clé API
3. Utilisez l'API **Places** pour récupérer les POI :
   ```
   https://api.geoapify.com/v2/places?categories=healthcare.pharmacy&filter=circle:-9.5372,30.3732,1500&limit=50&apiKey=VOTRE_CLE
   ```
4. Le résultat est en JSON, à convertir en CSV

### Avec Nominatim (OpenStreetMap, gratuit illimité)

Plus simple mais moins riche en données :
```
https://nominatim.openstreetmap.org/search?q=pharmacie&format=json&limit=20&viewbox=-9.55,30.36,-9.52,30.39&bounded=1
```

### Avantages / Inconvénients
- ✅ Reproductible, automatisable
- ✅ Format JSON facile à traiter
- ❌ Demande des compétences techniques (Python, JavaScript, ou tableur avancé)
- ❌ Données moins riches que Google Places (moins d'avis, téléphones manquants)

---

## 🎯 Recommandation finale

**Pour vos projets immobiliers** : utilisez la **Méthode 1** (me demander). C'est :
- Le plus rapide (5-10 minutes pour un projet complet)
- Le plus précis (Google Places)
- Le plus complet (avec avis, notes, téléphones)

**Le workflow optimal** :
1. **Vous** : "Voici l'adresse de mon nouveau projet à [VILLE]: [coordonnées]"
2. **Moi** : je vous génère le CSV français complet (POI quotidiens + majeurs)
3. **Vous** : vous uploadez dans Gemini AI Studio avec le prompt de traduction
4. **Vous** : vous récupérez les 3 traductions, sauvegardez les 8 fichiers, uploadez sur GitHub

**Total : 30 minutes pour un nouveau projet complet en 4 langues.**

---

## 📋 Coordonnées GPS actuelles (à titre d'exemple)

Pour vous aider à démarrer un nouveau projet, voici quelques coordonnées de référence au Maroc :

| Ville / Quartier | Latitude | Longitude |
|---|---|---|
| Casablanca centre | 33.5731 | -7.5898 |
| Rabat Agdal | 33.9956 | -6.8503 |
| Marrakech Hivernage | 31.6223 | -8.0009 |
| Marrakech Gueliz | 31.6336 | -8.0089 |
| Agadir Founty | 30.4036 | -9.6011 |
| Agadir Dcheira | 30.3732 | -9.5372 |
| Tanger centre | 35.7595 | -5.8340 |
| Fès centre | 34.0181 | -5.0078 |
| Essaouira | 31.5125 | -9.7700 |

Vous pouvez les utiliser comme point de départ pour vos prochains projets.
