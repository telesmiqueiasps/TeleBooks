# Identidade Visual Oficial — TeleBooks

Documento de referência da identidade visual do TeleBooks, diretrizes de design, tokens CSS, especificações de ativos gráficos e status de implementação.

---

## 1. Conceito e Mensagem de Marca

- **Nome Oficial:** TeleBooks
- **Tagline Principal:** *Sua biblioteca, do seu jeito.*
- **Subtítulo & Manifesto:** *Mais que livros, é sobre pessoas.*
- **Frase de Destaque:** *Grandes histórias começam com um bom livro.*
- **Pilares de Ação:** *Organize. Leia. Compartilhe.*

---

## 2. Paleta de Cores Oficial

| Cor | HEX | Token Tailwind | Aplicação no Sistema |
| :--- | :--- | :--- | :--- |
| **Azul Principal** | `#007BFF` | `telebooks.blue` / `primary.DEFAULT` | Botões primários, destaques ativos, barras de progresso, acentos |
| **Azul Escuro** | `#0F172A` | `telebooks.navy` / `surface.dark` | Cards no modo dark, cabeçalhos, textos de alto contraste |
| **Fundo Dark** | `#0B0F1A` | `telebooks.darkBg` | Background global no modo escuro |
| **Roxo** | `#6366F1` | `telebooks.purple` | Gradientes de avatar, tags especiais, badges secundários |
| **Verde** | `#10B981` | `telebooks.green` | Status de sucesso, livros concluídos ("Lidos") |
| **Cinza** | `#E5E7EB` | `telebooks.gray` | Bordas e separadores no modo claro |
| **Fundo Light** | `#F8FAFC` | `background` (light) | Background global no modo claro |

---

## 3. Tipografia

- **Títulos e Destaques:** **Sora** (`font-display` / `font-sora` / `var(--font-sora)`)
  - Pesos configurados: `300`, `400`, `500`, `600`, `700`, `800`
  - Utilizado em: Logo wordmark, títulos de página (h1, h2, h3), números das métricas, títulos dos livros.
- **Textos e Interface:** **Inter** (`font-sans` / `var(--font-sans)`)
  - Pesos configurados: `300`, `400`, `500`, `600`, `700`
  - Utilizado em: Parágrafos, inputs, formulários, botões, labels e metadados.

---

## 4. Onde Colocar os Arquivos Gráficos Oficiais

Para que o Next.js e o PWA sirvam seus arquivos estáticos nativamente, coloque os arquivos no diretório **`apps/web/public/`**:

| Arquivo | Localização Exata no Projeto | Finalidade |
| :--- | :--- | :--- |
| `logo.png` | `apps/web/public/logo.png` | Logo oficial completa do sistema (usada no topo do Login, Cadastro, Sidebar e Topbar) |
| `icone.png` | `apps/web/public/icone.png` | Ícone quadrado do sistema (usado no Favicon PNG, PWA mobile/instalável, Apple Touch Icon e variante compacta do `<Logo variant="icon" />`) |
| `icone.ico` | `apps/web/public/icone.ico` | Favicon `.ico` oficial para navegadores desktop |

> [!NOTE]
> O componente `<Logo />` (`apps/web/components/ui/logo.tsx`) possui **fallback inteligente**: enquanto os arquivos não forem colados no diretório ou durante o carregamento, o sistema exibe automaticamente o vetor SVG do livro 3D em degradê e a tipografia Sora. Assim que você colar os arquivos em `apps/web/public/`, eles assumem imediatamente!

---

## 5. Arquivos e Componentes Integrados

1. **`apps/web/components/ui/logo.tsx`**:
   - Componente flexível com suporte aos modos `full` (logo completa), `icon` (apenas ícone) e vetor SVG fallback.
   - Trata erro de carregamento automaticamente.

2. **`apps/web/app/layout.tsx`**:
   - Carregamento otimizado de Google Fonts (`Sora` e `Inter`).
   - Metadados completos com título, descrição e rotas de ícones (`/icone.ico`, `/icone.png`, `/favicon.ico`).
   - Viewport configurada com `themeColor: "#007BFF"`.

3. **`apps/web/public/manifest.json`**:
   - PWA configurado com nome, orientação `portrait`, cores `#0B0F1A` e `#007BFF`, e ícones apontando para `/icone.png` e `/icone.ico`.

4. **`apps/web/app/globals.css` & `tailwind.config.ts`**:
   - Tokens CSS `:root` e `.dark` com `#F8FAFC` (claro) e `#0B0F1A` (escuro).
   - Cores oficiais `telebooks` mapeadas no Tailwind.

5. **`apps/web/components/shell/`**:
   - `sidebar.tsx`: NavItem ativo em formato de pílula sólida azul (`bg-[#007BFF] text-white`) idêntico ao mockup, gradiente de avatar `#007BFF` para `#6366F1`, e contador dinâmico.
   - `topbar.tsx`: Campo de busca global com placeholder *"Buscar livros, autores, editoras..."*, sino de notificação e logo mobile.
   - `bottom-nav.tsx`: Navegação mobile moderna com indicador azul e contraste adaptativo.

6. **`apps/web/app/page.tsx` (Dashboard)**:
   - Header: *"Olá, [Nome] 👋"* com Sora e *"Sua biblioteca, do seu jeito."*
   - Grade de 4 métricas rápidas: **Livros**, **Autores**, **Editoras**, **Coleções**.
   - Seção **"Continuar lendo"**: cards horizontais com barra de progresso em `% lido` e clique direto para atualizar leitura.
   - Seção **"Adicionados recentemente"**: filtros de status pills com azul `#007BFF`.

7. **`apps/web/app/(auth)/login/page.tsx` e `cadastro/page.tsx`**:
   - Telas de autenticação com logo centralizada, slogan *"Mais que livros, é sobre pessoas."*, botões primários `#007BFF` e fundos alinhados à identidade.

---

## 6. Próximos Passos Recomendados

- Colocar os arquivos `logo.png`, `icone.png` e `icone.ico` na pasta `apps/web/public/`.
- Se desejar gerar variações automáticas de tamanhos do PWA (192x192 e 512x512), pode também duplicar `icone.png` como `icon-192.png` e `icon-512.png`.
