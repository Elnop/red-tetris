# Red Tetris - Context Documentation

**Date:** 15 Novembre 2025
**Dernière modification:** Migration du système d'items vers génération client-side désynchronisée

---

## 📋 Table des matières

1. [Vue d'ensemble du projet](#vue-densemble-du-projet)
2. [Architecture technique](#architecture-technique)
3. [Système d'items (Power-ups)](#système-ditems-power-ups)
4. [Modifications récentes](#modifications-récentes)
5. [Problèmes connus et solutions](#problèmes-connus-et-solutions)
6. [Structure des fichiers](#structure-des-fichiers)
7. [Commandes utiles](#commandes-utiles)
8. [Prochaines étapes](#prochaines-étapes)

---

## Vue d'ensemble du projet

**Red Tetris** est un jeu Tetris multijoueur en temps réel avec un système de power-ups.

### Technologies
- **Frontend:** Nuxt 3, Vue 3, Pinia, TypeScript
- **Backend:** Nitro (serveur Nuxt), Socket.IO
- **Styling:** CSS personnalisé avec système de thèmes
- **Build:** Vite

### Fonctionnalités principales
- ✅ Multijoueur temps réel (Socket.IO)
- ✅ Synchronisation des pièces via seed
- ✅ Système de thèmes colorés
- ✅ Power-ups désynchronisés par joueur
- ✅ Ghost pieces (aperçu de la chute)
- ✅ Garbage lines (lignes de pénalité)
- ✅ Inventaire d'items (5 slots max)
- ✅ Effets visuels (flash de bombe, glow des items)

---

## Architecture technique

### Frontend (Nuxt 3 + Vue 3)

#### Structure des composables
- **`useGame.ts`**: Logique principale du jeu, boucle de jeu, contrôles
- **`useActivePiece.ts`**: Gestion de la pièce active (spawn, drop, lock)
- **`useBoard.ts`**: Gestion de la grille (lignes, garbage lines)
- **`useItems.ts`**: Gestion des items (collection, utilisation, effets)
- **`useGhostDisplay.ts`**: Affichage des ghost pieces
- **`socketEmiters.ts`**: Gestion des événements Socket.IO

#### Stores (Pinia)
- **`useGameStore.ts`**: État du jeu (grille, pièces, score, items)
- **`useRoomStore.ts`**: État de la room (users, settings, power-ups)
- **`useUserStore.ts`**: État utilisateur (username, stats)
- **`useThemeStore.ts`**: Gestion des thèmes visuels

### Backend (Nitro + Socket.IO)

**Fichier principal:** `server/plugins/socket.ts`

Le serveur gère :
- Création/suppression de rooms
- Gestion des utilisateurs (connexion, déconnexion)
- Broadcasting des événements de jeu
- Synchronisation des settings (powerUpsEnabled, itemSpawnRate)
- **NE GÈRE PLUS:** Génération d'items (migré côté client)

---

## Système d'items (Power-ups)

### 🎯 Architecture actuelle (IMPORTANT)

**Génération d'items:** ✅ **CLIENT-SIDE (désynchronisé)**
- Chaque joueur génère ses propres items de manière aléatoire
- Pas de synchronisation entre joueurs
- Génération au démarrage du jeu via `Math.random()`
- Plus de chaos et de variété dans le gameplay

### 8 Power-ups disponibles

| Icon | Nom | Type | Effet | Durée |
|------|-----|------|-------|-------|
| 💥 | Block Bomb | Self | Détruit 3x3 blocs au point le plus haut (+1 ligne) | Instantané |
| 💣 | Add Lines | Others | Envoie 2 lignes garbage à tous les adversaires | Instantané |
| 🐌 | Speed Down | Self | Ralentit la vitesse de chute | 8s |
| ✨ | Clear Random | Self | Efface 8 blocs aléatoires | Instantané |
| 🌀 | Confusion | Others | Inverse les contrôles des adversaires | 5s |
| ❄️ | Freeze | Others | Gèle tous les adversaires | 3s |
| 🛡️ | Immunity | Self | Immunité contre les garbage lines | 10s |
| 🔮 | Preview | Self | Voir les 5 prochaines pièces | 10s |

### Génération et collection

1. **Au démarrage du jeu:**
   - Client reçoit `tetris-start` avec `seed`, `powerUpsEnabled`, `itemSpawnRate`
   - Si `powerUpsEnabled === true`:
     - Génère localement 200 items via `generateRandomItemSpawns(itemSpawnRate)`
     - Stocke dans `itemSpawnMap` (Map<pieceIndex, ItemType>)

2. **Pendant le jeu:**
   - Quand une pièce spawn: vérifie si `itemSpawnMap.has(currentPieceIndex)`
   - Si oui: affiche bordure dorée animée sur la pièce
   - Quand la pièce lock: ajoute l'item à l'inventaire (max 5)

3. **Utilisation:**
   - Touches 1-5 pour utiliser les items de l'inventaire
   - Émet `item-used` au serveur
   - Serveur broadcast `item-effect` à tous les joueurs
   - Chaque client applique l'effet selon `targetSelf`/`targetOthers`

### Effets visuels

- **Pièce avec item:** Bordure dorée (#FFD700) + glow + animation pulse
- **Block Bomb:** Flash transparent de la couleur du thème sur les 9 cellules (400ms)
- **Animation:** `bomb-flash` avec scale 1→1.2→1

---

## Modifications récentes

### 1. Migration items server→client (15 Nov 2025)

**Avant:**
- Serveur générait items avec seed déterministe
- Broadcast de la map complète aux clients
- Validation serveur des collections

**Après:**
- Client génère items aléatoirement (`Math.random()`)
- Chaque joueur a des items différents
- Pas de synchronisation ni validation serveur

**Fichiers modifiés:**

#### Créés
- `app/utils/itemGeneration.ts` - Fonction `generateRandomItemSpawns()`

#### Modifiés (Client)
- `app/composables/socketEmiters.ts` - Handler `tetris-start` génère items localement
- `app/composables/useItems.ts` - Suppression emit `item-collected`
- `app/utils/itemsConfig.ts` - Export `ITEM_TYPES`
- `app/types/socket.d.ts` - Suppression types `item-collected`, `itemSpawns`

#### Modifiés (Serveur)
- `server/plugins/socket.ts`:
  - Suppression enum `ItemType`
  - Suppression fonctions `mulberry32()`, `generateItemSpawns()`
  - Suppression `itemSpawns` du type `RoomState`
  - Suppression handler `item-collected`
  - Suppression génération dans `tetris-start`

### 2. Fix Block Bomb (15 Nov 2025)

**Problème initial:** Bombe explosait au centre vertical (souvent vide)

**Solutions appliquées:**
1. Chercher le bloc le plus haut de la grille
2. Cibler **une ligne en dessous** pour toucher plus de blocs remplis
3. Afficher nombre de blocs détruits dans les logs
4. Ajouter effet visuel de flash transparent

**Fichiers modifiés:**
- `app/composables/useItems.ts` - Logique `effectBlockBomb()`
- `app/composables/useGame.ts` - Flash effect + listener `block-bomb-flash`
- `app/components/Game.vue` - Animation `bomb-flash`

### 3. Fix handler item-effect (15 Nov 2025)

**Problème:** Items self-targeting (Block Bomb, Speed Down) ne fonctionnaient pas

**Cause:** Handler ne vérifiait pas si item était destiné à la source

**Solution:**
```typescript
if (config.targetSelf && !config.targetOthers) {
  // Self-only item - apply only if we are the source
  if (isSource) {
    applyItemEffect(payload.itemType, userStore.username)
  }
}
```

---

## Problèmes connus et solutions

### ✅ Items ne s'affichent pas dans l'inventaire
**Cause:** `itemSpawnMap` était undefined (problème `storeToRefs()`)
**Solution:** Déplacer `itemSpawnMap` dans `storeToRefs()` au lieu de destructuration directe

### ✅ Block Bomb ne détruit pas de blocs
**Cause:** Ciblait le centre de la grille (souvent vide)
**Solution:** Cibler le bloc le plus haut + 1 ligne en dessous

### ✅ Garbage lines différentes de l'existant
**Cause:** Nouvelle implémentation ne matchait pas `useBoard.ts`
**Solution:** Copier l'implémentation exacte (lignes blanches sans trous)

### ✅ ROWS/COLS undefined dans useItems
**Cause:** `ROWS` et `COLS` sont des constantes, pas des refs
**Solution:** Les destructurer directement de `gameStore`, pas de `storeToRefs()`

### ⚠️ Items spawn rate 100% pour tests
**Note:** Actuellement configuré à 1 (100%) pour faciliter les tests. Remettre à 0.08 (8%) pour production.

---

## Structure des fichiers

```
red-tetris/
├── app/
│   ├── components/
│   │   ├── Game.vue              # Composant principal de jeu + grille
│   │   └── ItemInventory.vue     # Affichage inventaire items
│   ├── composables/
│   │   ├── useGame.ts            # Logique jeu + boucle + contrôles + flash
│   │   ├── useActivePiece.ts    # Gestion pièce active + items
│   │   ├── useBoard.ts          # Grille + garbage lines
│   │   ├── useItems.ts          # Items + effets
│   │   ├── useGhosts.ts         # Ghost pieces
│   │   └── socketEmiters.ts     # Socket.IO events
│   ├── pages/
│   │   ├── index.vue            # Page d'accueil (create/join room)
│   │   └── [roomName]/
│   │       └── [userName].vue   # Page de jeu
│   ├── stores/
│   │   ├── useGameStore.ts      # État jeu (grille, items, score)
│   │   ├── useRoomStore.ts      # État room (users, settings)
│   │   ├── useUserStore.ts      # État user
│   │   └── useThemeStore.ts     # Thèmes visuels
│   ├── types/
│   │   ├── items.ts             # Types items (ItemType enum, interfaces)
│   │   ├── socket.d.ts          # Types Socket.IO
│   │   └── game.d.ts            # Types jeu
│   └── utils/
│       ├── itemGeneration.ts    # 🆕 Génération aléatoire items
│       ├── itemsConfig.ts       # Config des 8 items
│       ├── pieces.ts            # Formes Tetris + rotations
│       └── validation.ts        # Validation username/room
├── server/
│   └── plugins/
│       └── socket.ts            # Serveur Socket.IO (simplifié)
└── nuxt.config.ts               # Config Nuxt
```

---

## Commandes utiles

### Développement
```bash
# Installation
npm install

# Dev mode (port 3000)
npm run dev

# Build production
npm run build

# Preview production
npm run preview

# Serveur Socket.IO seul (port 3001)
# Déjà lancé automatiquement avec npm run dev
```

### Git
```bash
# Status des modifications
git status

# Voir les derniers commits
git log --oneline -10

# Créer un commit
git add .
git commit -m "feat: description"
```

### Debug items
```bash
# Dans la console du navigateur, chercher:
[ITEMS-DEBUG]
[ITEMS-GEN]

# Logs importants:
# - Generated X random items
# - Piece has item! Type: xxx
# - Item collected successfully
# - Block Bomb targeting one row below highest block
```

---

## Prochaines étapes

### 🔧 Améliorations suggérées

1. **Équilibrage items**
   - Tester différents spawn rates (actuellement 100% pour tests)
   - Ajuster durées des effets temporaires
   - Équilibrer les items offensifs vs défensifs

2. **Effets visuels**
   - Ajouter particules pour les autres items (freeze, confusion, etc.)
   - Améliorer l'animation de la bombe
   - Indicateur visuel pour les effets actifs

3. **UX**
   - Tooltip sur les items de l'inventaire (afficher description)
   - Son lors de la collection/utilisation d'items
   - Indication visuelle du cooldown/durée des effets

4. **Performance**
   - Optimiser le re-render lors du flash
   - Limiter la génération d'items à 200 pièces max

5. **Features manquantes**
   - Implémenter effet Confusion (inversion des contrôles)
   - Implémenter effet Preview (afficher plus de pièces)
   - Système de stats (items utilisés, blocs détruits)

### 🐛 Bugs potentiels à surveiller

- **Flash effect:** Vérifier que le flash disparaît bien après 400ms
- **Item collection:** Vérifier que l'inventaire ne dépasse jamais 5 items
- **Block Bomb:** Tester edge cases (grille vide, un seul bloc)
- **Garbage lines:** Vérifier qu'elles ne causent pas de game over immédiat

---

## Configuration importante

### Spawn rate items
**Fichier:** `app/pages/index.vue` (ligne 27)
```typescript
const itemSpawnRate = ref(8) // Default 8% (actuellement en test à 100%)
```

**Fichier:** `app/utils/itemsConfig.ts` (ligne 75)
```typescript
export const ITEM_SPAWN_RATE = 0.08 // 8% chance per piece
```

### Taille inventaire
**Fichier:** `app/utils/itemsConfig.ts` (ligne 76)
```typescript
export const MAX_INVENTORY_SIZE = 5
```

### Durée du flash
**Fichier:** `app/composables/useGame.ts` (ligne 147)
```typescript
setTimeout(() => {
  flashingCells.value.clear()
}, 400) // 400ms flash duration
```

---

## Notes de développement

### Pinia stores - storeToRefs() vs destructuring

**Important:** Ne pas confondre les refs et les constantes/méthodes

```typescript
// ✅ Correct
const { grid, active, isPlaying } = storeToRefs(gameStore) // Refs réactifs
const { ROWS, COLS, setGridCell } = gameStore // Constantes + méthodes

// ❌ Incorrect
const { grid, active, ROWS, COLS } = storeToRefs(gameStore) // ROWS/COLS seront undefined
```

### Socket.IO event flow

1. **Client → Server:** `emit(event, data)`
2. **Server → All clients in room:** `io.to(room).emit(event, data)`
3. **Server → Others (not sender):** `socket.to(room).emit(event, data)`
4. **Server → Specific client:** `io.to(socketId).emit(event, data)`

### Items targeting logic

```typescript
// Self-only item (Block Bomb, Speed Down, Clear Random)
targetSelf: true, targetOthers: false

// Others-only item (Add Lines, Confusion, Freeze)
targetSelf: false, targetOthers: true

// Handler checks:
if (config.targetSelf && !config.targetOthers && isSource) {
  applyItemEffect() // Apply to self
}
if (config.targetOthers && !isSource) {
  applyItemEffect() // Apply to others
}
```

---

## Contact & Ressources

- **Repository:** https://github.com/Elnop/red-tetris
- **42 Intra:** https://projects.intra.42.fr/42cursus-red-tetris/mine
- **Documentation Nuxt:** https://nuxt.com/docs
- **Documentation Socket.IO:** https://socket.io/docs/v4/

---

## Changelog résumé

### 15 Novembre 2025
- ✅ Migration système items: server → client
- ✅ Génération aléatoire désynchronisée par joueur
- ✅ Fix Block Bomb: cibler bloc le plus haut + 1
- ✅ Ajout effet visuel flash sur Block Bomb
- ✅ Fix handler item-effect pour items self-targeting
- ✅ Nettoyage code serveur (suppression logique items)
- ✅ Documentation complète du contexte

### Commits précédents importants
- `a2b5189` - fix(game): restart
- `f4ac10f` - fix(game): restart
- `b176651` - fix(final): theme and make prod
- `527489f` - fix(build): share link displayed on make prod
- `a38e214` - feat(theme): change theme system

---

**Bon courage pour la suite du développement ! 🎮🚀**
