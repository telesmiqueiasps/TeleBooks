#!/usr/bin/env bash
set -e

echo "=== TeleBooks: Configurando ambiente local ==="

# 1. Copiar variáveis de ambiente caso não existam
if [ ! -f .env ]; then
  echo "Criando .env a partir de .env.example..."
  cp .env.example .env
fi

# 2. Instalar dependências JS via pnpm
echo "Instalando dependências dos pacotes via pnpm..."
pnpm install

# 3. Preparar ambiente Python
echo "Preparando ambiente Python na pasta apps/api..."
cd apps/api
if [ ! -d ".venv" ]; then
  python -m venv .venv
fi

# Ativação do venv cross-platform
if [ -f ".venv/bin/activate" ]; then
  source .venv/bin/activate
elif [ -f ".venv/Scripts/activate" ]; then
  source .venv/Scripts/activate
fi

pip install -r requirements.txt
cd ../..

echo "=== Setup concluído com sucesso! Execute 'pnpm dev' para iniciar. ==="
