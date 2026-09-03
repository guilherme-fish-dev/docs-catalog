# Redesign Visual (Dark Neobrutalista, Citrine & Plum) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin o catálogo de documentos (`index.html` + `styles.css`) para uma identidade visual dark + neobrutalista, paleta "Citrine & Plum", tipografia Fraunces itálico + Inter, sem alterar layout estrutural nem comportamento (JS intocado).

**Architecture:** Projeto é HTML/CSS estático sem build. Todo o trabalho acontece em `styles.css` (reescrita seção por seção, na ordem em que já existe no arquivo) e em duas linhas de `<head>` de `index.html` (troca das fontes do Google Fonts). Nenhum arquivo JS é tocado. Cada task substitui um bloco contíguo do CSS por um bloco novo equivalente (mesmos seletores, novo tratamento visual), então verifica visualmente no navegador antes de commitar.

**Tech Stack:** HTML5, CSS3 puro (custom properties), Google Fonts (Fraunces, Inter, JetBrains Mono). Sem framework, sem bundler.

## Global Constraints

- Não alterar `app.js`, `js/storage.js`, `js/importExport.js`, `projects.config.js`, `documents.js` — reskin é 100% CSS + fontes.
- Não alterar estrutura de layout (`index.html` mantém as mesmas seções, IDs e classes — só o bloco de `<link>` de fontes muda).
- Sem gradiente em nenhum background; sem `backdrop-filter`/blur em nenhum elemento.
- Sombras são sempre sólidas ("duras"), nunca com blur — formato `Xpx Ypx 0 <cor>`.
- Bordas grossas (2–3px) e cantos quase retos (`--radius: 4px`) em todos os componentes visuais.
- Cor de destaque única: citrino (`--accent: #f4d35e`) — usada em bordas ativas, sombras, foco e seleção.
- Títulos (`h1`, `h2`, `.card-title`, `.modal-title`) em Fraunces itálico peso 600; corpo em Inter; elementos técnicos (labels uppercase, tags, badges, busca) em JetBrains Mono.
- Rodar `node tests/storage.test.js` e `node tests/importExport.test.js` ao final — devem continuar passando (guarda de regressão, já que nenhum desses arquivos é tocado).

---

### Task 1: Tokens globais, base da página e fontes

**Files:**
- Modify: `styles.css:1-52`
- Modify: `index.html:7-9`

**Interfaces:**
- Produces: custom properties usadas por **todas** as tasks seguintes: `--bg`, `--surface`, `--surface-raised`, `--border`, `--accent`, `--text`, `--muted`, `--danger`, `--danger-bg`, `--shadow-sm`, `--shadow-md`, `--border-w`, `--border-w-thick`, `--radius`.

- [ ] **Step 1: Substituir tokens e base do documento em `styles.css`**

Substituir o bloco (linhas 1-52, de `:root {` até o fim de `.page-shell`, incluindo o bloco `body::before` que será removido):

```css
:root {
    --bg: #f4efe7;
    --bg-accent: #e7ded2;
    --surface: rgba(255, 251, 245, 0.84);
    --surface-strong: #fffaf3;
    --text: #1d1b18;
    --muted: #655c52;
    --line: rgba(29, 27, 24, 0.12);
    --primary: #17624a;
    --primary-strong: #0c4835;
    --accent: #d97532;
    --shadow: 0 24px 60px rgba(53, 40, 22, 0.08);
    --radius-lg: 24px;
    --radius-md: 18px;
    --radius-sm: 999px;
}

* {
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

body {
    margin: 0;
    min-height: 100vh;
    font-family: "IBM Plex Sans", sans-serif;
    color: var(--text);
    background:
        radial-gradient(circle at top left, rgba(217, 117, 50, 0.18), transparent 28%),
        radial-gradient(circle at top right, rgba(23, 98, 74, 0.16), transparent 22%),
        linear-gradient(180deg, #f8f3eb 0%, var(--bg) 100%);
}

body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image: linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
    background-size: 28px 28px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.35), transparent 70%);
}

.page-shell {
    position: relative;
    max-width: 1280px;
    margin: 0 auto;
    padding: 40px 20px 64px;
}
```

por:

```css
:root {
    --bg: #150b18;
    --surface: #1e0f22;
    --surface-raised: #241129;
    --border: #3a2240;
    --accent: #f4d35e;
    --text: #f3e9ee;
    --muted: #c9a8d1;
    --danger: #ff6a6a;
    --danger-bg: rgba(255, 106, 106, 0.14);
    --shadow-sm: 4px 4px 0 var(--accent);
    --shadow-md: 6px 6px 0 var(--accent);
    --border-w: 2px;
    --border-w-thick: 3px;
    --radius: 4px;
}

* {
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

body {
    margin: 0;
    min-height: 100vh;
    font-family: "Inter", sans-serif;
    color: var(--text);
    background: var(--bg);
}

.page-shell {
    position: relative;
    max-width: 1280px;
    margin: 0 auto;
    padding: 40px 20px 64px;
}
```

- [ ] **Step 2: Trocar as fontes carregadas em `index.html`**

Substituir (linhas 7-9):

```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

por:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@1,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 3: Verificar visualmente**

Abrir `index.html` no navegador (Browser pane: `navigate` para `file:///C:/Users/GuilhermeRodriguesBa/Documents/SitesUteis/docs/glossario/index.html`) e tirar um screenshot.

Esperado: fundo sólido ameixa quase-preto (`#150b18`), sem gradiente, sem textura de grid. O restante da página ainda vai parecer "quebrado" (cores antigas em painéis/botões) — normal, será corrigido nas próximas tasks. O importante aqui é: sem gradiente no `body`, sem `body::before`.

- [ ] **Step 4: Commit**

```bash
git add styles.css index.html
git commit -m "style: novos tokens de cor dark e fontes Fraunces/Inter/JetBrains Mono"
```

---

### Task 2: Hero e tipografia base

**Files:**
- Modify: `styles.css:54-92`

**Interfaces:**
- Consumes: `--surface`, `--accent`, `--shadow-md`, `--border-w-thick`, `--radius`, `--muted` (Task 1).
- Produces: regra compartilhada `h1, h2, .card-title, .modal-title` em Fraunces itálico — tasks 5, 7 e 9 dependem dela para não precisar redefinir `font-family`/`font-style` dos títulos.

- [ ] **Step 1: Substituir hero e headings em `styles.css`**

Substituir:

```css
.hero {
    margin-bottom: 28px;
    padding: 36px;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: linear-gradient(135deg, rgba(255, 250, 243, 0.92), rgba(236, 228, 214, 0.74));
    box-shadow: var(--shadow);
}

.eyebrow,
.results-label,
.meta-label {
    margin: 0 0 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.74rem;
    color: var(--muted);
}

h1,
h2,
.card-title {
    margin: 0;
    font-family: "Space Grotesk", sans-serif;
}

h1 {
    font-size: clamp(2.4rem, 5vw, 4.6rem);
    line-height: 0.95;
    max-width: 11ch;
}

.hero-copy {
    max-width: 66ch;
    margin: 18px 0 0;
    font-size: 1.05rem;
    line-height: 1.65;
    color: var(--muted);
}
```

por:

```css
.hero {
    margin-bottom: 28px;
    padding: 36px;
    border: var(--border-w-thick) solid var(--accent);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow-md);
}

.eyebrow,
.results-label,
.meta-label {
    margin: 0 0 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.74rem;
    font-family: "JetBrains Mono", monospace;
    font-weight: 600;
    color: var(--accent);
}

h1,
h2,
.card-title,
.modal-title {
    margin: 0;
    font-family: "Fraunces", serif;
    font-style: italic;
    font-weight: 600;
}

h1 {
    font-size: clamp(2.4rem, 5vw, 4.6rem);
    line-height: 0.95;
    max-width: 11ch;
}

.hero-copy {
    max-width: 66ch;
    margin: 18px 0 0;
    font-size: 1.05rem;
    line-height: 1.65;
    color: var(--muted);
}
```

- [ ] **Step 2: Verificar visualmente**

Recarregar a página no Browser pane e dar zoom na `.hero`. Esperado: borda grossa citrino, sombra dura deslocada (sem blur), título "Catálogo de documentos" em Fraunces itálico, "Portal interno" (eyebrow) em mono uppercase citrino.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "style: hero com borda/sombra dura e titulos em Fraunces italico"
```

---

### Task 3: Layout, painéis e barra de busca

**Files:**
- Modify: `styles.css:94-169`

**Interfaces:**
- Consumes: `--border`, `--radius`, `--surface`, `--shadow-sm`, `--accent`, `--surface-raised`, `--muted`, `--text` (Task 1).
- Produces: estilo base de `.panel`/`.doc-card` (borda + sombra dura) que a Task 5 (cards de documento) estende.

- [ ] **Step 1: Substituir layout/painéis/busca em `styles.css`**

Substituir:

```css
.layout {
    display: grid;
    grid-template-columns: 310px minmax(0, 1fr);
    gap: 20px;
}

.sidebar,
.content {
    display: grid;
    gap: 20px;
    align-content: start;
}

.panel,
.doc-card {
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
    backdrop-filter: blur(14px);
    box-shadow: var(--shadow);
}

.panel {
    padding: 20px;
}

.sticky-panel {
    position: sticky;
    top: 16px;
    z-index: 1;
}

.search-label {
    display: block;
    margin-bottom: 10px;
    font-size: 0.95rem;
    font-weight: 600;
}

.search-box {
    display: flex;
    align-items: center;
    border: 1px solid rgba(23, 98, 74, 0.16);
    border-radius: 18px;
    background: var(--surface-strong);
    padding: 6px;
}

.search-box input {
    width: 100%;
    border: 0;
    outline: none;
    background: transparent;
    padding: 12px 14px;
    font: inherit;
    color: var(--text);
}

.search-box input::placeholder {
    color: #8d8174;
}

.search-hint {
    margin: 12px 0 0;
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.5;
}

.section-head,
.content-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}
```

por:

```css
.layout {
    display: grid;
    grid-template-columns: 310px minmax(0, 1fr);
    gap: 20px;
}

.sidebar,
.content {
    display: grid;
    gap: 20px;
    align-content: start;
}

.panel,
.doc-card {
    border: var(--border-w) solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow-sm);
}

.panel {
    padding: 20px;
}

.sticky-panel {
    position: sticky;
    top: 16px;
    z-index: 1;
}

.search-label {
    display: block;
    margin-bottom: 10px;
    font-size: 0.95rem;
    font-weight: 600;
}

.search-box {
    display: flex;
    align-items: center;
    border: var(--border-w) solid var(--accent);
    border-radius: var(--radius);
    background: var(--surface-raised);
    padding: 6px;
    box-shadow: var(--shadow-sm);
}

.search-box input {
    width: 100%;
    border: 0;
    outline: none;
    background: transparent;
    padding: 12px 14px;
    font: inherit;
    font-family: "JetBrains Mono", monospace;
    color: var(--text);
}

.search-box input::placeholder {
    color: var(--muted);
}

.search-hint {
    margin: 12px 0 0;
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.5;
}

.section-head,
.content-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}
```

- [ ] **Step 2: Verificar visualmente**

Recarregar e olhar a sidebar inteira. Esperado: painéis (`Temas`, `Tags`, busca) com borda fina neutra + sombra dura citrino; caixa de busca com borda citrino grossa e sombra; texto digitado em mono.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "style: paineis e busca com borda solida e sombra dura"
```

---

### Task 4: Chips, filtros e botões

**Files:**
- Modify: `styles.css:171-238`

**Interfaces:**
- Consumes: `--border`, `--surface-raised`, `--text`, `--accent`, `--bg`, `--muted`, `--radius`, `--border-w` (Task 1).
- Produces: estilo final de `.chip`/`.filter-pill`/`.ghost-button`/`.secondary-button` — reusado visualmente (mesma linguagem) pelo `.danger-button` na Task 6 e pelos botões do formulário na Task 9 (nenhuma dependência de código, só consistência visual).

- [ ] **Step 1: Substituir chips/botões em `styles.css`**

Substituir:

```css
.chip-list,
.active-filters,
.tag-row,
.doc-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.chip,
.filter-pill,
.ghost-button,
.secondary-button,
.primary-link {
    appearance: none;
    border: 0;
    text-decoration: none;
    font: inherit;
}

.chip,
.filter-pill {
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    background: rgba(23, 98, 74, 0.08);
    color: var(--primary-strong);
    cursor: pointer;
    transition: transform 160ms ease, background-color 160ms ease, color 160ms ease;
}

.chip:hover,
.chip:focus-visible,
.ghost-button:hover,
.secondary-button:hover,
.primary-link:hover {
    transform: translateY(-1px);
}

.chip.is-selected {
    background: var(--primary);
    color: #effcf7;
}

.ghost-button,
.secondary-button {
    padding: 9px 14px;
    border-radius: var(--radius-sm);
    cursor: pointer;
}

.ghost-button {
    background: transparent;
    color: var(--muted);
}

.secondary-button {
    background: rgba(23, 98, 74, 0.1);
    color: var(--primary-strong);
}

.active-filters {
    min-height: 24px;
}

.filter-pill {
    background: rgba(217, 117, 50, 0.16);
    color: #8f4817;
}
```

por:

```css
.chip-list,
.active-filters,
.tag-row,
.doc-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.chip,
.filter-pill,
.ghost-button,
.secondary-button,
.primary-link {
    appearance: none;
    border: var(--border-w) solid var(--border);
    border-radius: var(--radius);
    text-decoration: none;
    font: inherit;
}

.chip,
.filter-pill {
    padding: 9px 13px;
    background: var(--surface-raised);
    color: var(--text);
    font-family: "JetBrains Mono", monospace;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 3px 3px 0 var(--border);
    transition: transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease, color 120ms ease, border-color 120ms ease;
}

.chip:hover,
.chip:focus-visible {
    border-color: var(--accent);
    box-shadow: 3px 3px 0 var(--accent);
    transform: translate(-1px, -1px);
}

.ghost-button:hover,
.secondary-button:hover,
.primary-link:hover {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--accent);
    border-color: var(--accent);
}

.chip.is-selected {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg);
    box-shadow: 3px 3px 0 var(--text);
}

.ghost-button,
.secondary-button {
    padding: 9px 14px;
    cursor: pointer;
    font-family: "Inter", sans-serif;
    font-weight: 600;
}

.ghost-button {
    background: transparent;
    border-color: transparent;
    color: var(--muted);
}

.ghost-button:hover {
    color: var(--accent);
}

.secondary-button {
    background: var(--surface-raised);
    color: var(--text);
    box-shadow: 3px 3px 0 var(--border);
}

.active-filters {
    min-height: 24px;
}

.filter-pill {
    background: var(--surface-raised);
    border-color: var(--accent);
    color: var(--accent);
    box-shadow: 3px 3px 0 var(--accent);
}
```

- [ ] **Step 2: Verificar visualmente**

Recarregar e conferir: chips de tema/tag com borda + sombra dura neutra que vira citrino no hover; chip selecionado com fundo citrino sólido e texto escuro (`--bg`); botão "Exportar JSON"/"Importar JSON" (`.secondary-button`) com sombra dura; botão "Renomear" (`.ghost-button`) sem borda visível em repouso, texto citrino no hover.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "style: chips, filtros e botoes com linguagem neobrutalista"
```

---

### Task 5: Grid de resultados e cards de documento

**Files:**
- Modify: `styles.css:240-340`

**Interfaces:**
- Consumes: `--border`, `--accent`, `--shadow-md`, `--shadow-sm`, `--radius`, `--surface-raised`, `--muted`, `--bg`, `--border-w` (Task 1); herda base `.doc-card` da Task 3 e `h1,h2,.card-title,.modal-title` da Task 2.
- Nota: este bloco também remove a duplicata do media query `@media (max-width: 980px)` que existe hoje logo após `.empty-state` (o mesmo bloco já existe — e continuará existindo — no grupo de responsividade no fim do arquivo, ver Task 8).

- [ ] **Step 1: Substituir grid/cards em `styles.css`**

Substituir (inclui, no final, a remoção do `@media (max-width: 980px)` duplicado):

```css
.card-grid {
    display: grid;
    gap: 18px;
}

.doc-card {
    padding: 22px;
    transition: transform 180ms ease, border-color 180ms ease;
}

.doc-card:hover {
    transform: translateY(-3px);
    border-color: rgba(23, 98, 74, 0.26);
}

.card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

.card-title {
    font-size: 1.35rem;
    line-height: 1.1;
}

.score-badge {
    flex-shrink: 0;
    padding: 9px 12px;
    border-radius: var(--radius-sm);
    background: rgba(23, 98, 74, 0.1);
    color: var(--primary-strong);
    font-size: 0.84rem;
    font-weight: 600;
}

.doc-summary {
    margin: 16px 0;
    color: var(--muted);
    line-height: 1.65;
}

.doc-meta {
    display: grid;
    gap: 8px;
    margin-bottom: 18px;
}

.meta-line {
    display: flex;
    gap: 8px;
    align-items: baseline;
    flex-wrap: wrap;
}

.meta-label {
    margin: 0;
}

.tag-row {
    margin-bottom: 18px;
}

.tag-pill {
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    background: rgba(0, 0, 0, 0.045);
    color: var(--text);
    font-size: 0.92rem;
}

.primary-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--primary), var(--primary-strong));
    color: #f5fff8;
    font-weight: 600;
}

.empty-state {
    padding: 28px;
    border: 1px dashed rgba(29, 27, 24, 0.22);
    border-radius: var(--radius-md);
    background: rgba(255, 250, 243, 0.56);
    color: var(--muted);
    line-height: 1.6;
}

@media (max-width: 980px) {
    .layout {
        grid-template-columns: 1fr;
    }

    .sticky-panel {
        position: static;
    }
}
```

por:

```css
.card-grid {
    display: grid;
    gap: 18px;
}

.doc-card {
    padding: 22px;
    transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.doc-card:hover {
    transform: translate(-2px, -2px);
    border-color: var(--accent);
    box-shadow: var(--shadow-md);
}

.card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

.card-title {
    font-size: 1.35rem;
    line-height: 1.1;
}

.score-badge {
    flex-shrink: 0;
    padding: 8px 11px;
    border: var(--border-w) solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-raised);
    color: var(--accent);
    font-family: "JetBrains Mono", monospace;
    font-size: 0.8rem;
    font-weight: 600;
}

.doc-summary {
    margin: 16px 0;
    color: var(--muted);
    line-height: 1.65;
}

.doc-meta {
    display: grid;
    gap: 8px;
    margin-bottom: 18px;
}

.meta-line {
    display: flex;
    gap: 8px;
    align-items: baseline;
    flex-wrap: wrap;
}

.meta-label {
    margin: 0;
}

.tag-row {
    margin-bottom: 18px;
}

.tag-pill {
    padding: 7px 11px;
    border: var(--border-w) solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-raised);
    color: var(--muted);
    font-family: "JetBrains Mono", monospace;
    font-size: 0.8rem;
    font-weight: 600;
}

.primary-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
    border: var(--border-w) solid var(--accent);
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--bg);
    font-weight: 700;
    box-shadow: var(--shadow-sm);
    transition: transform 120ms ease, box-shadow 120ms ease;
}

.primary-link:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0 var(--accent);
}

.empty-state {
    padding: 28px;
    border: var(--border-w) dashed var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--muted);
    line-height: 1.6;
}
```

- [ ] **Step 2: Verificar visualmente**

Cadastrar um documento de teste (usar o FAB, mesmo que ainda sem o estilo novo) ou usar um já existente, e conferir o card: borda neutra que vira citrino grossa + sombra dura no hover, badge de score e tags em mono com borda, botão "Abrir documento" (`.primary-link`) sólido citrino com sombra dura. Testar também o estado vazio (filtrar por um termo que não bata com nada) e conferir `.empty-state` com borda tracejada.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "style: grid de resultados e cards de documento neobrutalistas"
```

---

### Task 6: Badges de card, botão de perigo e barra de projeto

**Files:**
- Modify: `styles.css:342-414`

**Interfaces:**
- Consumes: `--danger`, `--danger-bg`, `--bg`, `--border`, `--radius`, `--surface-raised`, `--text`, `--accent`, `--border-w` (Task 1).

- [ ] **Step 1: Substituir badges/danger/project-bar em `styles.css`**

Substituir:

```css
/* ── Card badges ──────────────────────────────────────────────────────────── */

.card-badges {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
}

/* ── Danger / delete button ───────────────────────────────────────────────── */

.danger-button {
    appearance: none;
    border: 0;
    padding: 12px 16px;
    border-radius: 14px;
    background: rgba(185, 28, 28, 0.1);
    color: #991b1b;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: transform 160ms ease, background-color 160ms ease;
}

.danger-button:hover {
    background: rgba(185, 28, 28, 0.18);
    transform: translateY(-1px);
}

/* ── Project bar ──────────────────────────────────────────────────────────── */

.project-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
}

.project-bar-field {
    display: flex;
    align-items: center;
    gap: 10px;
}

.project-bar-field label {
    font-weight: 600;
    font-size: 0.9rem;
}

.project-bar-field select {
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid rgba(29, 27, 24, 0.2);
    background: var(--surface-strong);
    font: inherit;
    color: var(--text);
}

.project-bar-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
}

.project-bar-divider {
    width: 1px;
    align-self: stretch;
    background: var(--line);
}
```

por:

```css
/* ── Card badges ──────────────────────────────────────────────────────────── */

.card-badges {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
}

/* ── Danger / delete button ───────────────────────────────────────────────── */

.danger-button {
    appearance: none;
    border: var(--border-w) solid var(--danger);
    padding: 11px 15px;
    border-radius: var(--radius);
    background: var(--danger-bg);
    color: var(--danger);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 3px 3px 0 var(--danger);
    transition: transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease, color 120ms ease;
}

.danger-button:hover {
    background: var(--danger);
    color: var(--bg);
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0 var(--danger);
}

/* ── Project bar ──────────────────────────────────────────────────────────── */

.project-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
}

.project-bar-field {
    display: flex;
    align-items: center;
    gap: 10px;
}

.project-bar-field label {
    font-weight: 600;
    font-size: 0.9rem;
}

.project-bar-field select {
    padding: 10px 12px;
    border: var(--border-w) solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-raised);
    font: inherit;
    color: var(--text);
}

.project-bar-field select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 3px 3px 0 var(--accent);
}

.project-bar-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
}

.project-bar-divider {
    width: 2px;
    align-self: stretch;
    background: var(--border);
}
```

- [ ] **Step 2: Verificar visualmente**

Recarregar e conferir a barra de projeto no topo: `select` com borda sólida (não mais arredondada) e sombra citrino ao focar; botão "Remover" (`.danger-button`) vermelho-coral com borda e sombra dura, invertendo cor no hover.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "style: botao de perigo e barra de projeto neobrutalistas"
```

---

### Task 7: Botão flutuante (FAB)

**Files:**
- Modify: `styles.css:416-440`

**Interfaces:**
- Consumes: `--text`, `--accent`, `--bg`, `--radius`, `--border-w-thick` (Task 1).

- [ ] **Step 1: Substituir o FAB em `styles.css`**

Substituir:

```css
.fab {
    position: fixed;
    bottom: 32px;
    right: 32px;
    z-index: 100;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 16px 22px;
    border: 0;
    border-radius: var(--radius-sm);
    background: linear-gradient(135deg, var(--primary), var(--primary-strong));
    color: #effcf7;
    font: 600 1rem "IBM Plex Sans", sans-serif;
    cursor: pointer;
    box-shadow: 0 8px 28px rgba(12, 72, 53, 0.38);
    transition: transform 160ms ease, box-shadow 160ms ease;
}

.fab:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 36px rgba(12, 72, 53, 0.46);
}
```

por:

```css
.fab {
    position: fixed;
    bottom: 32px;
    right: 32px;
    z-index: 100;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 16px 22px;
    border: var(--border-w-thick) solid var(--text);
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--bg);
    font: 700 1rem "Inter", sans-serif;
    cursor: pointer;
    box-shadow: 6px 6px 0 var(--text);
    transition: transform 160ms ease, box-shadow 160ms ease;
}

.fab:hover {
    transform: translate(-2px, -2px);
    box-shadow: 8px 8px 0 var(--text);
}
```

- [ ] **Step 2: Verificar visualmente**

Recarregar e conferir o botão "+ Cadastrar" no canto inferior direito: fundo citrino sólido, borda quase-branca grossa, sombra dura quase-branca (contraste alto contra o fundo ameixa).

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "style: FAB com contorno grosso e sombra dura"
```

---

### Task 8: Modal de cadastro (overlay, painel, cabeçalho)

**Files:**
- Modify: `styles.css:442-509`

**Interfaces:**
- Consumes: `--accent`, `--surface`, `--radius`, `--border-w-thick`, `--border-w`, `--muted` (Task 1); herda `font-family`/`font-style` de `.modal-title` da regra compartilhada da Task 2 (aqui só resta o `font-size`).

- [ ] **Step 1: Substituir modal em `styles.css`**

Substituir:

```css
.modal-overlay[hidden] {
    display: none;
}

.modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    background: rgba(15, 12, 8, 0.46);
    backdrop-filter: blur(4px);
    padding: 20px;
    overflow-y: auto;
}

.modal-panel {
    width: 100%;
    max-width: 540px;
    min-height: calc(100vh - 40px);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface-strong);
    box-shadow: 0 32px 80px rgba(15, 12, 8, 0.28);
    display: flex;
    flex-direction: column;
    animation: slideIn 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes slideIn {
    from { opacity: 0; transform: translateX(32px); }
    to   { opacity: 1; transform: translateX(0); }
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 0;
    gap: 12px;
}

.modal-title {
    font-size: 1.5rem;
    font-family: "Space Grotesk", sans-serif;
}

.icon-button {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 8px;
    border-radius: 10px;
    line-height: 1;
    transition: background-color 140ms ease, color 140ms ease;
}

.icon-button:hover {
    background: rgba(0, 0, 0, 0.07);
    color: var(--text);
}

.tab-content {
    padding: 24px;
    flex: 1;
    overflow-y: auto;
}
```

por:

```css
.modal-overlay[hidden] {
    display: none;
}

.modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    background: rgba(9, 5, 10, 0.72);
    padding: 20px;
    overflow-y: auto;
}

.modal-panel {
    width: 100%;
    max-width: 540px;
    min-height: calc(100vh - 40px);
    border: var(--border-w-thick) solid var(--accent);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: -8px 8px 0 var(--accent);
    display: flex;
    flex-direction: column;
    animation: slideIn 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes slideIn {
    from { opacity: 0; transform: translateX(32px); }
    to   { opacity: 1; transform: translateX(0); }
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 0;
    gap: 12px;
}

.modal-title {
    font-size: 1.5rem;
}

.icon-button {
    appearance: none;
    border: var(--border-w) solid transparent;
    background: transparent;
    color: var(--muted);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 8px;
    border-radius: var(--radius);
    line-height: 1;
    transition: border-color 140ms ease, color 140ms ease;
}

.icon-button:hover {
    border-color: var(--accent);
    color: var(--accent);
}

.tab-content {
    padding: 24px;
    flex: 1;
    overflow-y: auto;
}
```

- [ ] **Step 2: Verificar visualmente**

Clicar em "+ Cadastrar" para abrir o modal. Esperado: overlay escuro sem blur, painel do modal com borda citrino grossa e sombra dura deslocada para a esquerda (coerente com o modal entrando pela direita), título "Cadastrar documento" em Fraunces itálico, botão de fechar (X) ganhando borda citrino no hover.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "style: modal de cadastro com painel neobrutalista"
```

---

### Task 9: Formulário (campos, chips de tag, erro, ações)

**Files:**
- Modify: `styles.css:510-641`

**Interfaces:**
- Consumes: `--border`, `--radius`, `--surface-raised`, `--text`, `--accent`, `--muted`, `--surface`, `--danger`, `--danger-bg`, `--border-w` (Task 1).

- [ ] **Step 1: Substituir formulário em `styles.css`**

Substituir:

```css
.form-field {
    display: grid;
    gap: 8px;
    margin-bottom: 20px;
}

.form-field label {
    font-weight: 600;
    font-size: 0.95rem;
}

.optional-label {
    font-weight: 400;
    color: var(--muted);
    font-size: 0.88rem;
}

.form-field input,
.form-field textarea {
    width: 100%;
    border: 1px solid rgba(29, 27, 24, 0.2);
    border-radius: 14px;
    background: var(--surface-strong);
    padding: 12px 14px;
    font: inherit;
    color: var(--text);
    outline: none;
    transition: border-color 160ms ease;
    box-sizing: border-box;
}

.form-field input:focus,
.form-field textarea:focus,
.chip-input-box:focus-within {
    border-color: var(--primary);
}

.form-field textarea {
    resize: vertical;
    min-height: 80px;
}

.field-hint {
    margin: 0;
    font-size: 0.87rem;
    color: var(--muted);
    line-height: 1.5;
}

/* ── Chip tag input ───────────────────────────────────────────────────────── */

.chip-input-box {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    border: 1px solid rgba(29, 27, 24, 0.2);
    border-radius: 14px;
    background: var(--surface-strong);
    padding: 8px 10px;
    cursor: text;
    transition: border-color 160ms ease;
    min-height: 48px;
}

.chip-input-box input {
    border: 0;
    outline: none;
    background: transparent;
    font: inherit;
    color: var(--text);
    padding: 4px 6px;
    flex: 1;
    min-width: 120px;
    width: auto;
    border-radius: 0;
}

.form-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    background: rgba(23, 98, 74, 0.12);
    color: var(--primary-strong);
    font-size: 0.88rem;
    font-weight: 500;
}

.form-chip button {
    appearance: none;
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 1rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    opacity: 0.7;
    transition: opacity 120ms ease;
}

.form-chip button:hover {
    opacity: 1;
}

/* ── Form error / actions ─────────────────────────────────────────────────── */

.form-error {
    padding: 12px 16px;
    border-radius: 12px;
    background: rgba(185, 28, 28, 0.1);
    color: #991b1b;
    font-size: 0.93rem;
    margin-bottom: 20px;
}

.form-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}
```

por:

```css
.form-field {
    display: grid;
    gap: 8px;
    margin-bottom: 20px;
}

.form-field label {
    font-weight: 600;
    font-size: 0.95rem;
}

.optional-label {
    font-weight: 400;
    color: var(--muted);
    font-size: 0.88rem;
}

.form-field input,
.form-field textarea {
    width: 100%;
    border: var(--border-w) solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-raised);
    padding: 12px 14px;
    font: inherit;
    color: var(--text);
    outline: none;
    transition: border-color 160ms ease, box-shadow 160ms ease;
    box-sizing: border-box;
}

.form-field input:focus,
.form-field textarea:focus,
.chip-input-box:focus-within {
    border-color: var(--accent);
    box-shadow: 3px 3px 0 var(--accent);
}

.form-field textarea {
    resize: vertical;
    min-height: 80px;
}

.field-hint {
    margin: 0;
    font-size: 0.87rem;
    color: var(--muted);
    line-height: 1.5;
}

/* ── Chip tag input ───────────────────────────────────────────────────────── */

.chip-input-box {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    border: var(--border-w) solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-raised);
    padding: 8px 10px;
    cursor: text;
    transition: border-color 160ms ease, box-shadow 160ms ease;
    min-height: 48px;
}

.chip-input-box input {
    border: 0;
    outline: none;
    background: transparent;
    font: inherit;
    color: var(--text);
    padding: 4px 6px;
    flex: 1;
    min-width: 120px;
    width: auto;
    border-radius: 0;
}

.form-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: var(--border-w) solid var(--accent);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--accent);
    font-family: "JetBrains Mono", monospace;
    font-size: 0.82rem;
    font-weight: 600;
}

.form-chip button {
    appearance: none;
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 1rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    opacity: 0.7;
    transition: opacity 120ms ease;
}

.form-chip button:hover {
    opacity: 1;
}

/* ── Form error / actions ─────────────────────────────────────────────────── */

.form-error {
    padding: 12px 16px;
    border: var(--border-w) solid var(--danger);
    border-radius: var(--radius);
    background: var(--danger-bg);
    color: var(--danger);
    font-size: 0.93rem;
    margin-bottom: 20px;
}

.form-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}
```

- [ ] **Step 2: Verificar visualmente**

No modal aberto, preencher o campo "Tags" e confirmar com Enter — o chip criado deve sair com borda citrino, fundo escuro e texto citrino em mono. Focar um input de texto e conferir a borda + sombra dura citrino. Submeter o formulário vazio (campos obrigatórios) e conferir a mensagem de erro (`.form-error`) com borda/fundo vermelho-coral.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "style: formulario de cadastro com inputs e chips neobrutalistas"
```

---

### Task 10: Responsividade (consolidar breakpoints)

**Files:**
- Modify: `styles.css:650-715` (últimos blocos `@media` do arquivo)

**Interfaces:**
- Consumes: `--radius` (Task 1). Nenhuma task depende deste bloco — é o último ajuste de CSS do plano.

- [ ] **Step 1: Atualizar o breakpoint de 640px em `styles.css`**

Substituir (o bloco `@media (max-width: 980px)` deste trecho já é idêntico ao que sobrou da Task 5 e não muda — só o `@media (max-width: 640px)` precisa da correção da variável de raio):

```css
@media (max-width: 640px) {
    .page-shell {
        padding: 18px 14px 60px;
    }

    .project-bar {
        flex-direction: column;
        align-items: stretch;
    }

    .project-bar-actions {
        justify-content: flex-start;
    }

    .hero,
    .panel,
    .doc-card {
        padding: 18px;
    }

    .card-head,
    .content-topbar,
    .section-head {
        flex-direction: column;
        align-items: flex-start;
    }

    .primary-link,
    .secondary-button,
    .danger-button {
        width: 100%;
        justify-content: center;
    }

    .modal-overlay {
        padding: 0;
        align-items: flex-end;
    }

    .modal-panel {
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        min-height: 85vh;
        max-width: 100%;
        animation: slideUp 240ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    @keyframes slideUp {
        from { opacity: 0; transform: translateY(32px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    .fab {
        bottom: 20px;
        right: 16px;
    }
}
```

por:

```css
@media (max-width: 640px) {
    .page-shell {
        padding: 18px 14px 60px;
    }

    .project-bar {
        flex-direction: column;
        align-items: stretch;
    }

    .project-bar-actions {
        justify-content: flex-start;
    }

    .hero,
    .panel,
    .doc-card {
        padding: 18px;
    }

    .card-head,
    .content-topbar,
    .section-head {
        flex-direction: column;
        align-items: flex-start;
    }

    .primary-link,
    .secondary-button,
    .danger-button {
        width: 100%;
        justify-content: center;
    }

    .modal-overlay {
        padding: 0;
        align-items: flex-end;
    }

    .modal-panel {
        border-radius: var(--radius) var(--radius) 0 0;
        min-height: 85vh;
        max-width: 100%;
        animation: slideUp 240ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    @keyframes slideUp {
        from { opacity: 0; transform: translateY(32px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    .fab {
        bottom: 20px;
        right: 16px;
    }
}
```

- [ ] **Step 2: Verificar que não sobrou nenhuma referência a variáveis antigas**

Rodar:

```bash
grep -n "radius-lg\|radius-md\|radius-sm\|var(--line)\|var(--primary)\|var(--primary-strong)\|surface-strong\|var(--shadow)" styles.css
```

Esperado: nenhuma linha encontrada (todas as variáveis antigas foram substituídas pelas novas ao longo das tasks 1-10). Se algo aparecer, localizar o seletor e trocar pela variável nova equivalente antes de prosseguir.

- [ ] **Step 3: Verificar visualmente o responsivo**

No Browser pane, usar `resize_window` com preset `mobile` (375x812), recarregar a página e tirar um screenshot da página inteira e do modal aberto. Esperado: mesma linguagem visual (bordas grossas, sombra dura, sem blur/gradiente) mantida em telas pequenas; modal com cantos arredondados só no topo (comportamento existente preservado). Depois, `resize_window` de volta para `desktop`.

- [ ] **Step 4: Commit**

```bash
git add styles.css
git commit -m "style: consolidar breakpoints com o novo token de raio"
```

---

### Task 11: Verificação final completa e regressão

**Files:**
- Nenhum arquivo modificado — apenas verificação.

**Interfaces:**
- Consumes: todo o CSS reescrito nas tasks 1-10.

- [ ] **Step 1: Rodar os testes de regressão do JS (não deve haver nenhuma mudança de comportamento)**

```bash
node tests/storage.test.js
node tests/importExport.test.js
```

Esperado: ambos terminam sem erro (mesma saída de antes do redesign — nenhum arquivo JS foi tocado neste plano).

- [ ] **Step 2: Passada visual completa no navegador**

No Browser pane, com `resize_window` em `desktop`, recarregar `index.html` e conferir, tirando screenshot de cada uma:

1. Página completa (hero, barra de projeto, sidebar, grid de cards).
2. Sidebar com pelo menos um tema e uma tag selecionados (estado `.is-selected` / `.filter-pill` em "Filtros ativos").
3. Modal de cadastro aberto, com um chip de tag adicionado e o formulário submetido vazio (mensagem de erro visível).
4. Estado vazio de resultados (buscar por um termo sem match).

Esperado em todas: sem gradiente, sem blur, bordas sólidas grossas, sombra dura (sem blur) na cor citrino (ou vermelho-coral no caso de erro/perigo), tipografia Fraunces itálico nos títulos e Inter no corpo, mono nos elementos técnicos (tags, badges, busca, eyebrow).

- [ ] **Step 3: Conferir contraste de acessibilidade dos pares de cor principais**

Verificar (manualmente ou com uma ferramenta de contraste) que `--text` (`#f3e9ee`) sobre `--bg` (`#150b18`) e sobre `--surface` (`#1e0f22`), e `--muted` (`#c9a8d1`) sobre `--surface-raised` (`#241129`), atingem pelo menos AA (4.5:1) para texto normal. Se algum par ficar abaixo disso, ajustar a luminosidade da cor problemática (ex.: clarear `--muted`) e repetir o Step 2 para essa área.

- [ ] **Step 4: Commit final (se o Step 3 gerou algum ajuste) ou encerrar**

Se nenhum ajuste foi necessário, não há o que commitar nesta task — as tasks 1-10 já cobrem todo o trabalho. Se o Step 3 exigiu ajuste de cor:

```bash
git add styles.css
git commit -m "style: ajuste de contraste de acessibilidade na paleta Citrine & Plum"
```
