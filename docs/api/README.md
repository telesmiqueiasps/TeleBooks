# API REST TeleBooks (FastAPI)

## Visão Geral
A API do TeleBooks é construída em Python utilizando FastAPI e SQLAlchemy 2.x, com documentação automática via OpenAPI (Swagger).

## Rotas Planejadas
- `/api/v1/health`: Verificação de status e ambiente da aplicação.
- `/api/v1/auth`: Autenticação e sessões (integração Supabase Auth).
- `/api/v1/profile`: Perfis de usuário.
- `/api/v1/books`: Catálogo bibliográfico global.
- `/api/v1/authors`: Autores de livros.
- `/api/v1/publishers`: Editoras.
- `/api/v1/genres`: Gêneros e categorias.
- `/api/v1/library`: Estante pessoal do usuário (`user_books`).
- `/api/v1/reading`: Sessões e progresso de leitura.
- `/api/v1/notes`: Anotações privadas do leitor.
- `/api/v1/quotes`: Citações privadas do leitor.
- `/api/v1/reviews`: Avaliações do leitor.
- `/api/v1/lists`: Listas de leitura do usuário.
- `/api/v1/statistics`: Métricas agregadas de leitura.

## Documentação Interativa Local
Com a API em execução em `http://localhost:8000`:
- Swagger UI: `http://localhost:8000/api/v1/docs`
- ReDoc: `http://localhost:8000/api/v1/redoc`
