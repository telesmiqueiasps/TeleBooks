FROM python:3.12-slim

# Evita arquivos .pyc e desativa buffer de stdout/stderr para logs em tempo real
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Dependências do sistema (libpq para PostgreSQL e curl para health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instala dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copia o código da aplicação
COPY . .

# Porta exposta
EXPOSE 8000

# Health check nativo para Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Inicialização com uvicorn (usando shell para expandir variável $PORT do Render)
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
