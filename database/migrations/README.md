# Migrações do Banco de Dados

Este diretório armazena o histórico versionado de migrações SQL (Alembic / Supabase).

## Diretrizes
1. Toda alteração na estrutura de dados do banco **deve** ser realizada através de uma migração versionada.
2. Nunca altere o banco de produção manualmente.
3. RLS (Row Level Security) e índices de performance devem acompanhar os scripts de criação de tabelas.
