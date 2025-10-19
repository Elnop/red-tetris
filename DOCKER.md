# 🐳 Docker Setup - Red Tetris

Ce document explique comment utiliser Docker pour lancer le projet Red Tetris.

## 📋 Prérequis

- Docker installé (version 20.10+)
- Make installé

## 🚀 Démarrage rapide

### Mode développement (hot-reload)

```bash
# 1. Construire l'image de développement
make build-dev

# 2. Lancer le serveur de développement
make dev

# 3. Accéder à l'application
# Frontend: http://localhost:3000
# Backend Socket.IO: http://localhost:3001
```

### Mode production

```bash
# 1. Construire l'image de production (inclut les tests)
make build-prod

# 2. Lancer le serveur de production
make prod

# 3. Accéder à l'application
# Frontend: http://localhost:3000
```

## 📦 Architecture Docker

Le projet utilise un **Dockerfile multi-stage** :

```
┌─────────────┐
│    base     │  ← Installation des dépendances
└─────────────┘
      │
      ├──────────────────┬──────────────────┐
      │                  │                  │
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│    test     │   │   builder   │   │ development │
│             │   │             │   │             │
│ Run tests   │   │ npm build   │   │  Hot-reload │
└─────────────┘   └─────────────┘   └─────────────┘
                         │
                  ┌─────────────┐
                  │ production  │
                  │             │
                  │   Optimized │
                  └─────────────┘
```

## 🎯 Commandes disponibles

### Build

| Commande | Description |
|----------|-------------|
| `make build-dev` | Construire l'image de développement |
| `make build-prod` | Construire l'image de production (avec tests) |
| `make build-prod-no-test` | Construire l'image de production (sans tests) |

### Run

| Commande | Description |
|----------|-------------|
| `make dev` | Lancer en mode développement (hot-reload) |
| `make prod` | Lancer en mode production |
| `make restart-dev` | Redémarrer le conteneur de développement |
| `make restart-prod` | Redémarrer le conteneur de production |

### Test

| Commande | Description |
|----------|-------------|
| `make test` | Exécuter les tests dans Docker |
| `make test-coverage` | Exécuter les tests avec rapport de couverture |

### Logs & Debug

| Commande | Description |
|----------|-------------|
| `make logs` | Afficher les logs du conteneur de développement |
| `make logs-prod` | Afficher les logs du conteneur de production |
| `make shell-dev` | Ouvrir un shell dans le conteneur de développement |
| `make shell-prod` | Ouvrir un shell dans le conteneur de production |

### Cleanup

| Commande | Description |
|----------|-------------|
| `make stop` | Arrêter tous les conteneurs |
| `make clean` | Arrêter et supprimer tous les conteneurs et images |
| `make clean-all` | Nettoyage complet (inclut volumes et cache) |

### Info

| Commande | Description |
|----------|-------------|
| `make status` | Afficher le statut des conteneurs |
| `make images` | Afficher toutes les images Red Tetris |
| `make help` | Afficher l'aide |

## 🔧 Configuration

### Ports exposés

- **3000** : Frontend Nuxt.js
- **3001** : Backend Socket.IO

### Volumes en mode développement

Le mode développement monte les dossiers suivants pour le hot-reload :

```
./app       → /app/app
./server    → /app/server
./public    → /app/public
./nuxt.config.ts → /app/nuxt.config.ts
```

## 📊 Workflow typique

### Développement

```bash
# Terminal 1: Construire et lancer
make build-dev
make dev

# Terminal 2: Voir les logs
make logs

# Développer...
# Les modifications dans app/, server/ sont détectées automatiquement

# Arrêter
make stop
```

### Production

```bash
# Build avec tests
make build-prod

# Lancer
make prod

# Vérifier
make logs-prod

# Arrêter
make stop
```

### Tests

```bash
# Tests uniquement
make test

# Tests avec couverture
make test-coverage
```

## 🐛 Troubleshooting

### Le port 3000 ou 3001 est déjà utilisé

```bash
# Trouver le processus
lsof -i :3000
lsof -i :3001

# Ou arrêter tous les conteneurs Red Tetris
make stop
```

### Problème de build

```bash
# Nettoyer et reconstruire
make clean
make build-dev
```

### Modifications non détectées en dev

```bash
# Redémarrer le conteneur
make restart-dev

# Ou reconstruire
make stop
make clean
make build-dev
make dev
```

### Espace disque

```bash
# Nettoyer les images et conteneurs inutilisés
make clean-all
```

## 🔒 Sécurité

### Mode production

- Exécution avec un utilisateur non-root (`nuxtjs:nodejs`)
- Installation uniquement des dépendances de production
- Image Alpine légère (node:22-alpine3.22) - **Version LTS la plus récente**
- Mise à jour automatique des packages Alpine (`apk upgrade`)
- Health checks activés

### Vulnérabilités et sécurité

L'image de base `node:22-alpine3.22` utilise :
- **Node.js 22** (dernière version LTS)
- **Alpine Linux 3.22** (dernière version stable)
- Mise à jour automatique des packages système Alpine pour corriger les vulnérabilités connues

**Note :** Même avec les dernières versions et mises à jour, certains scanners de sécurité peuvent signaler des vulnérabilités. Ces vulnérabilités sont généralement dans les packages système Alpine et non dans Node.js lui-même. Alpine a une surface d'attaque réduite grâce à sa taille minimale.

**Actions recommandées :**
- Mettre à jour régulièrement l'image de base vers la dernière version
- Utiliser `docker scout` ou `trivy` pour scanner les images
- En production, considérer l'utilisation de Distroless ou d'images minimales

```bash
# Scanner l'image pour les vulnérabilités
docker scout cves red-tetris:prod

# Ou avec Trivy
trivy image red-tetris:prod
```

## 📝 Fichiers Docker

- **Dockerfile** : Configuration multi-stage
- **Makefile** : Commandes de gestion
- **.dockerignore** : Fichiers exclus du contexte Docker

## 🎓 Pour aller plus loin

### Personnaliser les variables d'environnement

Créez un fichier `.env` (déjà ignoré par Git) :

```bash
NODE_ENV=development
HOST=0.0.0.0
PORT=3000
```

### Inspecter l'image

```bash
# Taille de l'image
docker images red-tetris

# Historique des layers
docker history red-tetris:prod

# Scanner les vulnérabilités
docker scout cves red-tetris:prod
```

### Debug avancé

```bash
# Entrer dans le conteneur
make shell-dev

# Vérifier les processus
ps aux

# Vérifier les ports
netstat -tulpn

# Vérifier les logs Nuxt
npm run dev -- --verbose
```

## 📚 Ressources

- [Documentation Nuxt.js](https://nuxt.com/docs)
- [Documentation Docker](https://docs.docker.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
