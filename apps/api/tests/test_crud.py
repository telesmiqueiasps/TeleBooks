import uuid


def test_crud_publishers(client):
    suffix = uuid.uuid4().hex[:6]
    name = f"Editora Teste {suffix}"
    # Create
    create_res = client.post(
        "/api/v1/publishers",
        json={"name": name, "website": "https://teste.com"},
    )
    assert create_res.status_code == 201
    pub = create_res.json()
    pub_id = pub["id"]
    assert pub["name"] == name

    # Read
    get_res = client.get(f"/api/v1/publishers/{pub_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == name

    # Update
    update_res = client.patch(
        f"/api/v1/publishers/{pub_id}",
        json={"website": "https://novo-site.com"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["website"] == "https://novo-site.com"

    # Delete
    del_res = client.delete(f"/api/v1/publishers/{pub_id}")
    assert del_res.status_code == 204

    # Confirm deleted
    assert client.get(f"/api/v1/publishers/{pub_id}").status_code == 404


def test_crud_authors(client):
    suffix = uuid.uuid4().hex[:6]
    name = f"Autor Teste {suffix}"
    # Create
    create_res = client.post(
        "/api/v1/authors",
        json={"name": name, "bio": "Biografia teste"},
    )
    assert create_res.status_code == 201
    author = create_res.json()
    author_id = author["id"]
    assert author["name"] == name

    # Read
    get_res = client.get(f"/api/v1/authors/{author_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == name

    # Update
    update_res = client.patch(
        f"/api/v1/authors/{author_id}",
        json={"bio": "Nova biografia atualizada"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["bio"] == "Nova biografia atualizada"

    # Delete
    del_res = client.delete(f"/api/v1/authors/{author_id}")
    assert del_res.status_code == 204

    # Confirm deleted
    assert client.get(f"/api/v1/authors/{author_id}").status_code == 404


def test_crud_genres(client):
    suffix = uuid.uuid4().hex[:6]
    slug = f"genero-epico-{suffix}"
    name = f"Gênero Épico {suffix}"
    # Create
    create_res = client.post(
        "/api/v1/genres",
        json={"name": name, "slug": slug},
    )
    assert create_res.status_code == 201
    genre = create_res.json()
    genre_id = genre["id"]
    assert genre["name"] == name
    assert genre["slug"] == slug

    # Read
    get_res = client.get(f"/api/v1/genres/{genre_id}")
    assert get_res.status_code == 200

    # Delete
    del_res = client.delete(f"/api/v1/genres/{genre_id}")
    assert del_res.status_code == 204

    # Confirm deleted
    assert client.get(f"/api/v1/genres/{genre_id}").status_code == 404


def test_crud_books(client):
    suffix = uuid.uuid4().hex[:6]
    title = f"Livro Bibliográfico {suffix}"
    # Create a book
    create_res = client.post(
        "/api/v1/books",
        json={
            "title": title,
            "subtitle": "Subtítulo do Teste",
            "page_count": 250,
            "language": "pt-BR",
        },
    )
    assert create_res.status_code == 201
    book = create_res.json()
    book_id = book["id"]
    assert book["title"] == title

    # Update
    update_res = client.patch(
        f"/api/v1/books/{book_id}",
        json={"subtitle": "Subtítulo Atualizado"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["subtitle"] == "Subtítulo Atualizado"

    # Delete
    del_res = client.delete(f"/api/v1/books/{book_id}")
    assert del_res.status_code == 204

    # Confirm deleted
    assert client.get(f"/api/v1/books/{book_id}").status_code == 404
