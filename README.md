# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

# red-tetris

# Cahier des charges – Projet Red Tetris

## 1. Contexte
Développement d’un jeu **Tetris en ligne multijoueur**, dans le cadre du projet *Red Tetris* de l’école 42.  
Objectif : réaliser un jeu jouable, responsive et en temps réel, en **Full Stack JavaScript**, en respectant les contraintes pédagogiques et techniques imposées.

---

## 2. Objectifs pédagogiques
- **JavaScript avancé** : programmation fonctionnelle côté client et orientée objet côté serveur.
- **Architecture client-serveur** : séparation claire des responsabilités et communication en temps réel via Socket.IO.
- **Gestion d’état réactive** : mise à jour de l’UI en fonction des changements d’état, sans manipulation directe du DOM.
- **Tests unitaires** : atteindre au moins 70% de couverture (statements, functions, lines) et 50% sur les branches.

---

## 3. Contraintes techniques

### Technologies imposées
- **Langage** : JavaScript uniquement (ES modules).
- **Frontend** : SPA avec framework moderne (**Nuxt 3 / Vue 3**).
- **Backend** : Node.js avec Socket.IO.
- **Gestion d’état** : Pinia (équivalent moderne de Redux pour Vue).
- **Mise en page** : CSS Grid ou Flexbox.

### Interdictions
- Manipulation directe du DOM (`document.querySelector`, `element.innerHTML`, etc.).
- Utilisation de bibliothèques DOM (jQuery).
- Canvas et SVG.

---

## 4. Fonctionnalités à implémenter

### 4.1 Gameplay Tetris
- Plateau de jeu **10 colonnes × 20 lignes**.
- **7 Tetriminos** officiels, rotations conformes aux règles originales.
- Déplacement gauche/droite, rotation, soft drop (↓), hard drop (Espace).
- **Lock delay minimal** : une pièce se fige une frame après contact.
- Suppression de lignes complètes.

### 4.2 Mode multijoueur
- Chaque joueur a son propre plateau.
- **Même séquence de pièces** pour tous les joueurs d’une salle (même positions/coords).
- Effacer `n` lignes envoie `n - 1` **lignes indestructibles** aux autres joueurs.
- Affichage du **spectrum** (hauteur de colonnes) et noms des autres joueurs en temps réel.
- Dernier joueur vivant gagne.
- Jouable en solo ou multijoueur.

### 4.3 Gestion des parties
- Connexion via URL : `/room/<nom_de_salle>/<nom_joueur>`.
- Premier joueur = **host**, lance/redémarre la partie.
- Host remplacé automatiquement en cas de déconnexion.
- Pas d’entrée de nouveaux joueurs une fois la partie démarrée.
- Plusieurs salles en parallèle possibles.

---

## 5. Architecture technique

### 5.1 Backend (Node.js + Socket.IO)
- **Classes obligatoires** : `Game`, `Player`, `Piece`.
- Génération et distribution de la séquence de pièces (seed par salle).
- Gestion des événements Socket.IO :
  - `room:join`
  - `game:start`
  - `piece:next`
  - `board:update`
  - `lines:cleared`
  - `penalty:add`
  - `player:dead`
  - `game:over`
- Envoi des spectrums aux joueurs.
- Pas de persistance (pas de base de données).

### 5.2 Frontend (Nuxt 3 + Pinia)
- Rendu **SPA** (`index.html` + `bundle.js` unique).
- Composants principaux :
  - `Board.vue` : affichage du plateau en CSS Grid.
  - `Cell.vue` : affichage d’une cellule.
  - `Opponent.vue` : affichage du spectrum et nom d’un adversaire.
- Logique Tetris en **fonctions pures** (`utils/`), ex :
  - `createBoard()`
  - `spawnPiece()`
  - `rotatePiece(piece)`
  - `canMove(piece, board)`
  - `mergePiece(board, piece)`
  - `clearLines(board)`
- Gestion d’état global avec Pinia.
- Communication Socket.IO côté client.

---

## 6. Tests unitaires
- **Outils** : Vitest + c8.
- Couverture minimale :
  - **Statements** : ≥ 70%
  - **Functions** : ≥ 70%
  - **Lines** : ≥ 70%
  - **Branches** : ≥ 50%
- Priorité : tester les fonctions pures de la logique Tetris.
- Quelques tests serveur pour valider la gestion des rooms et la distribution des pièces.

---

## 7. Répartition des rôles

| Tâche                                  | Responsable |
|----------------------------------------|-------------|
| Setup Nuxt 3 + Pinia + Socket.IO       | Léon        |
| Setup serveur Node.js + Socket.IO      | Léon        |
| Fonctions pures Tetris (`utils/`)      | Barbara     |
| Composant `Board.vue`                  | Barbara     |
| Gestion spectrums côté front            | Barbara     |
| Événements Socket côté serveur         | Léon        |
| Gestion des rooms et host               | Léon        |
| Tests frontend (fonctions pures)       | Barbara     |
| Tests backend (logique serveur)        | Tous        |

---

## 8. Phases du projet

1. **Initialisation**
   - Mise en place du repo et des dossiers `frontend` / `backend`.
   - Installation des dépendances.
2. **Gameplay solo**
   - Logique Tetris fonctionnelle côté client.
   - Rendu plateau en CSS Grid.
3. **Multijoueur**
   - Gestion des rooms et synchronisation des pièces via Socket.IO.
   - Systèmes de spectrums et pénalités.
4. **Tests**
   - Couverture minimale atteinte.
5. **Optimisation & Bonus**
   - Ajout éventuel de score, modes supplémentaires, améliorations UI.

---

## 9. Bonus possibles
- Système de score et classement.
- Modes spéciaux (pièces invisibles, gravité variable).
- Persistance des scores (fichier ou DB).
- Thèmes graphiques.

---

## 10. Livrables
- Code source complet dans le dépôt Git.
- Application fonctionnelle.
- Rapport de couverture de tests.
- README détaillé (installation, lancement, protocoles Socket.IO).
- Eventuellement : démo en ligne.

