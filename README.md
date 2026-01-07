# Hetic_IoT-LiveDashboard

Projet Hetic d'IoT, avec création de WebSocket à la main via Node.js ainsi qu'avec la librairie ws. Récupération de données avec abonnement à un MQTT Mosquitto. Front-end en Svelte.

## Objectifs

- mettre en place la base projet (svelte-library, bridge, contracts)
- consommer des donnees meteo via MQTT
- produire une UI claire et jolie
- bonus: interface "flipper" a partir des topics MQTT

## Contexte technique

- broker MQTT: captain.dev0.pandor.cloud:1884
- 5 ESP32 publient des mesures meteo
- bridge Node.js: MQTT -> WebSocket (ws://localhost:8080)
- front Svelte: UI et visualisation

## Rattrapage (absents hier)

Objectif: refaire le setup complet fait hier, puis basculer sur les taches du jour.

### Etape 1 - Arborescence

1. Creer les dossiers `front`, `bridge`, `contracts` a la racine du projet.

### Etape 2 - Svelte library (front)

1. Dans `front`, creer un projet Svelte Kit type library.
2. Installer les dependances.
3. Lancer le dev server.

Commandes indicatives:

```sh
cd front
npx sv create . (et choisir svelte library pas svelte kit)
npm install
npm run dev
```

### Etape 3 - Bridge MQTT -> WebSocket (bridge)

1. Initialiser un projet Node dans `bridge`.
2. Installer `mqtt` et `ws`.
3. Creer `server.js` qui:
   - se connecte a `mqtt://captain.dev0.pandor.cloud:1884`
   - s abonne a `classroom/+/telemetry`
   - expose un WebSocket sur `ws://localhost:8080` et renvoie chaque message
4. Lancer le serveur.

Commandes indicatives:

```sh
cd bridge
npm init -y
npm install mqtt ws
node server.js
```

### Etape 4 - Contracts (contracts)

1. Creer `contracts/topics.md` avec le prefix `classroom/<deviceId>` et les topics:
   `telemetry`, `events`, `cmd`, `status`.
2. Creer `contracts/examples.json` avec au moins un exemple de payload pour chaque topic.

### Etape 5 - Connexion front

1. Dans `front/src/routes/+page.svelte`, ouvrir un WebSocket sur `ws://localhost:8080`.
2. Afficher au moins la temperature recue.

## Aller plus loin

Objectif: construire une UI belle et lisible qui suit la meteo de plusieurs lieux.

Contraintes:

- Donnees depuis MQTT via le bridge. (Utiliser captain.dev0.pandor.cloud)
- Afficher les stations/lieux (les 5 ESP32).
- Montrer: temperature, humidite, batterie, derniere mise a jour.
- Indiquer l etat (online/offline) selon la fraicheur des donnees.

Etapes proposees:

1. Demarrer le bridge et verifier qu il recoit tous les devices (topic `classroom/+/telemetry`).
2. Dans `front/src/routes/+page.svelte`, se connecter au WebSocket.
3. Stocker les donnees par deviceId (table, Map ou store).
4. Mapper deviceId -> nom de lieu (liste de 5 lieux).
5. Construire une grille de cartes avec un code couleur par etat.
6. Ajouter une touche design (typo, fond, espacements, icones).

Bonus UI:

- filtre par lieu
- moyenne globale (temp/hum)

## Bonus - Flipper (pour ceux qui ont fini)

Objectif: observer les events flipper et afficher un tableau simple.

Etapes:

1. Ouvrir MQTT Explorer.
2. Se connecter a `captain.dev0.pandor.cloud` port `1884`.
3. Explorer les topics `flipper/<deviceId>/<things>` et noter le payload exact.
4. Etendre le bridge pour s abonner a `flipper/+/+` et renvoyer les events au front.
5. Creer une interface qui affiche:
   - le dernier event (bouton, valeur, timestamp)
   - un compteur par bouton
   - une timeline simple des 20 derniers events

### Livrable

- petite interface "pinball" + un court descriptif du payload observe.

## Fin de journee - Commit

1. Verifier `git status`.
2. Ajouter les fichiers. (Penser à ignorer les dossiers node_modules)
3. Faire un commit avec un message clair.
4. Envoyer lien vers projet à <sean@pandor.media>
