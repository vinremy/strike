# BoxTrack — application de suivi de boxe

Prototype d'application mobile (iOS + Android) qui se connecte en Bluetooth Low Energy à une puce de suivi de frappe.

## Ce que fait l'app

- **Connexion au capteur** : recherche de la puce en Bluetooth, ou **simulateur** intégré pour faire des démos sans matériel.
- **Séance en direct** : minuteur de rounds et de repos (préréglages Sac, Cardio, Pro, Test 30 s), compteur de coups, dernier coup (type, main, vitesse, force), fréquence cardiaque et zone d'effort, répartition des coups.
- **Bilan de séance** : vitesse et force (moyenne et max), cadence, calories estimées, coups par round, répartition par type et gauche/droite, courbe de fatigue (vitesse), courbe cardio.
- **Historique** : toutes les séances sont enregistrées sur le téléphone.

## Lancer le projet

```bash
npm install
npx expo start          # puis « w » pour ouvrir l'aperçu web (simulateur uniquement)
npm test                # tests du protocole Bluetooth
npm run typecheck
```

Le Bluetooth demande un *development build* : il ne marche ni dans Expo Go ni sur le web.

```bash
npx expo run:ios        # nécessite un Mac + Xcode
npx expo run:android    # nécessite Android Studio
# ou, sans rien installer : npx eas-cli@latest build --profile development
```

## Protocole Bluetooth proposé pour la puce

Tout le protocole se trouve dans [`src/device/protocol.ts`](src/device/protocol.ts). Pour l'adapter au firmware, il suffit de modifier ce fichier.

| Élément | UUID | Détail |
|---|---|---|
| Service BoxTrack | `6e400001-b5a3-f393-e0a9-e50e24dcca9e` | Service personnalisé |
| Caractéristique « coup » (notify) | `6e400003-b5a3-f393-e0a9-e50e24dcca9e` | 1 notification par coup, 8 octets (voir ci-dessous) |
| Fréquence cardiaque | `0x180D` / `0x2A37` | Service standard : fonctionne aussi avec une ceinture cardio |
| Batterie | `0x180F` / `0x2A19` | Service standard, en % |

La puce doit annoncer un nom qui commence par `BoxTrack`.

**Paquet « coup »** (little-endian) :

| Octet | Contenu |
|---|---|
| 0 | Main : `0` gauche, `1` droite |
| 1 | Type : `0` direct, `1` crochet, `2` uppercut, `3` swing |
| 2–3 | Vitesse de pointe, `uint16` en cm/s (850 = 8,50 m/s) |
| 4–5 | Force estimée, `uint16` en newtons |
| 6–7 | Réservé |

La détection et la classification des coups se font **dans la puce**. L'app reçoit des coups déjà « prêts ».

## Structure

```
src/
  app/                 écrans (Expo Router)
    (tabs)/index.tsx      accueil + lancement de séance
    (tabs)/historique.tsx historique
    (tabs)/appareil.tsx   connexion au capteur
    seance/live.tsx       séance en direct
    seance/[id].tsx       bilan
  device/
    types.ts           interface commune des capteurs
    protocol.ts        format des paquets BLE (à adapter au firmware)
    BleDevice.ts       vraie puce (react-native-ble-plx)
    SimulatedDevice.ts faux capteur pour démo et développement
  state/               état global, historique, calcul des stats
  components/ui.tsx    composants visuels (cartes, barres, courbes)
```

## Pistes pour la suite

- Profil utilisateur (poids, âge, FC max) pour des calories et des zones cardio précises.
- Synchronisation dans le cloud et comptes utilisateurs.
- Objectifs, records et progression sur plusieurs semaines.
- Calibration de la force avec la puce réelle.
- Deux capteurs (un par gant).
