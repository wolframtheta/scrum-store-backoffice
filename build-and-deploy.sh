#!/bin/bash

set -e

DEPLOY_HOST="root@46.62.250.143"
DEPLOY_PATH="/dades/scrum-store-backoffice"

# Verificar que estamos en un repositorio git
if [ ! -d ".git" ]; then
  echo "❌ Error: No se encontró un repositorio git en este directorio"
  exit 1
fi

# Verificar que no hay cambios sin commitear
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Error: Hay cambios sin commitear en el repositorio"
  echo "Por favor, haz commit de todos los cambios antes de hacer deploy"
  git status --short
  exit 1
fi

# Verificar que estamos en una rama válida
CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
  echo "❌ Error: No se pudo determinar la rama actual"
  exit 1
fi

# Leer versión del package.json
VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BUILD_TAG="${VERSION}-${TIMESTAMP}"
GIT_TAG="backoffice-${BUILD_TAG}"

echo "📦 Building scrum-store-backoffice..."
echo "📋 Version: ${VERSION}"
echo "🏷️  Build tag: ${BUILD_TAG}"
echo "🌿 Current branch: ${CURRENT_BRANCH}"

# Crear tag en git
if git rev-parse "$GIT_TAG" >/dev/null 2>&1; then
  echo "⚠️  Warning: El tag ${GIT_TAG} ya existe. Usando tag existente."
else
  echo "🏷️  Creating git tag: ${GIT_TAG}"
  git tag -a "${GIT_TAG}" -m "Backoffice deployment ${BUILD_TAG}"
  
  # Hacer push del tag al remoto
  echo "⬆️  Pushing tag to remote..."
  git push origin "${GIT_TAG}" || {
    echo "⚠️  Warning: No se pudo hacer push del tag. Continuando con el build..."
  }
fi

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
  echo "📥 Installing dependencies..."
  npm install
fi

# Build de producción
echo "🔨 Building for production..."
npm run build

# Verificar que el build se completó
BUILD_DIR="dist/scrum-store-backoffice/browser"
if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ Error: Build directory '$BUILD_DIR' not found!"
  exit 1
fi

# Crear archivo de versión en el build
echo "${BUILD_TAG}" > ${BUILD_DIR}/.version
echo "Version: ${BUILD_TAG}" > ${BUILD_DIR}/VERSION.txt

echo "📤 Deploying to ${DEPLOY_HOST}:${DEPLOY_PATH}..."
rsync -avz --delete ${BUILD_DIR}/ ${DEPLOY_HOST}:${DEPLOY_PATH}/

echo "✅ Deploy completed!"
echo "📋 Version deployed: ${BUILD_TAG}"
echo "🌐 Backoffice available at: http://46.62.250.143/scrum-store-backoffice/"

