# Arquivar Documento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir arquivar/desarquivar um documento (ele some da busca e dos filtros por padrão, mas continua salvo), com um checkbox "Incluir arquivados" na busca pra trazê-lo de volta quando necessário.

**Architecture:** Documento ganha um campo `archived` (boolean). Task 1 introduz o campo, o botão Arquivar/Desarquivar no card e faz `rebuildIndex()` excluir documentos arquivados incondicionalmente (slice testável por si só: arquivar já esconde o documento de tudo). Task 2 adiciona o checkbox "Incluir arquivados" (`index.html` + `app.js`) que torna essa exclusão condicional ao estado do checkbox, e a badge "Arquivado" no card quando ele volta a aparecer.

**Tech Stack:** JavaScript vanilla (sem framework), DOM API. Mesmo módulo (`app.js`) das features anteriores, mais uma pequena adição de markup em `index.html`.

## Global Constraints

- Não alterar `js/storage.js`, `js/importExport.js`, `styles.css`, `projects.config.js` — ambos os módulos de storage/import-export já tratam documentos como objetos genéricos, um campo `archived` a mais não exige mudança neles.
- Sem CSS novo: a badge "Arquivado" reaproveita a classe `.score-badge` já existente; o botão Arquivar/Desarquivar reaproveita `.secondary-button`; o checkbox usa aparência nativa do navegador com o texto no estilo `.field-hint` já existente.
- `archived` começa `false` em todo documento novo. Editar um documento (feature já existente) preserva o valor atual de `archived` — nunca reseta pra `false` nem arquiva um documento só por ter sido editado.
- Checkbox "Incluir arquivados" começa desmarcado sempre — não é persistido entre sessões ou trocas de projeto; reseta junto com os outros filtros.
- Sem view separada de arquivados — é sempre um toggle dentro da busca normal.
- Sem testes automatizados novos: `app.js` não tem suíte de testes hoje. Verificação é manual, no navegador servido localmente (`file://` direto não aplica CSS/JS neste ambiente de preview). Rodar `node tests/storage.test.js` e `node tests/importExport.test.js` ao final como guarda de regressão.

---

### Task 1: Campo `archived`, botão Arquivar/Desarquivar e exclusão dos resultados

**Files:**
- Modify: `app.js` (`rebuildIndex`, `createCard`, handler de submit do form, nova função `toggleArchived`)

**Interfaces:**
- Produces: função `toggleArchived(id)` (alterna `archived` do documento com esse `id` no projeto ativo, salva, reconstrói índice e re-renderiza — mesmo padrão de `deleteDocument`); todo documento passa a ter um campo `archived` (boolean) persistido. Task 2 consome esse campo em `createCard` (pra badge) e a mesma convenção de nome `archived`.
- Consumes: `storageApi.getDocs`/`saveDocs`, `escapeHtml`, `rebuildIndex`, `render` — todos já existentes.

- [ ] **Step 1: Fazer `rebuildIndex` excluir documentos arquivados**

Localizar em `app.js`:

```js
    function rebuildIndex() {
        var docs = state.activeProjectId ? storageApi.getDocs(state.activeProjectId) : [];
        enriched = docs.map(enrich);
        themes = Array.from(new Set(enriched.map(function (d) { return d.theme; }))).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
        tags = Array.from(new Set(enriched.reduce(function (acc, d) { return acc.concat(d.tags); }, []))).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
    }
```

Substituir por:

```js
    function rebuildIndex() {
        var docs = state.activeProjectId ? storageApi.getDocs(state.activeProjectId) : [];
        docs = docs.filter(function (d) { return !d.archived; });
        enriched = docs.map(enrich);
        themes = Array.from(new Set(enriched.map(function (d) { return d.theme; }))).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
        tags = Array.from(new Set(enriched.reduce(function (acc, d) { return acc.concat(d.tags); }, []))).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
    }
```

Nota: essa exclusão é incondicional nesta task (não existe checkbox ainda). A Task 2 torna essa linha condicional ao estado do checkbox "Incluir arquivados".

- [ ] **Step 2: Adicionar `toggleArchived` logo depois de `deleteDocument`**

Localizar em `app.js`:

```js
    // Delete doc
    function deleteDocument(id) {
        var docs = storageApi.getDocs(state.activeProjectId).filter(function (d) { return d.id !== id; });
        storageApi.saveDocs(state.activeProjectId, docs);
        rebuildIndex(); render();
    }
```

Substituir por:

```js
    // Delete doc
    function deleteDocument(id) {
        var docs = storageApi.getDocs(state.activeProjectId).filter(function (d) { return d.id !== id; });
        storageApi.saveDocs(state.activeProjectId, docs);
        rebuildIndex(); render();
    }

    // Archive doc
    function toggleArchived(id) {
        var docs = storageApi.getDocs(state.activeProjectId);
        var doc = docs.filter(function (d) { return d.id === id; })[0];
        if (!doc) return;
        doc.archived = !doc.archived;
        storageApi.saveDocs(state.activeProjectId, docs);
        rebuildIndex(); render();
    }
```

- [ ] **Step 3: Adicionar o botão Arquivar/Desarquivar no card**

Localizar em `app.js`, dentro de `createCard(doc)`:

```js
            '<div class="doc-actions">' + linkMarkup + ' <button class="secondary-button edit-btn" type="button" data-id="' + escapeHtml(doc.id) + '">Editar</button> <button class="danger-button delete-btn" type="button" data-id="' + escapeHtml(doc.id) + '">Remover</button></div>'
        ].join("\n");
        article.querySelector(".edit-btn").addEventListener("click", function () { openEditModal(doc); });
        article.querySelector(".delete-btn").addEventListener("click", function () { deleteDocument(doc.id); });
        return article;
```

Substituir por:

```js
            '<div class="doc-actions">' + linkMarkup + ' <button class="secondary-button edit-btn" type="button" data-id="' + escapeHtml(doc.id) + '">Editar</button> <button class="secondary-button archive-btn" type="button" data-id="' + escapeHtml(doc.id) + '">' + (doc.archived ? "Desarquivar" : "Arquivar") + '</button> <button class="danger-button delete-btn" type="button" data-id="' + escapeHtml(doc.id) + '">Remover</button></div>'
        ].join("\n");
        article.querySelector(".edit-btn").addEventListener("click", function () { openEditModal(doc); });
        article.querySelector(".archive-btn").addEventListener("click", function () { toggleArchived(doc.id); });
        article.querySelector(".delete-btn").addEventListener("click", function () { deleteDocument(doc.id); });
        return article;
```

Nota: nesta task, um documento arquivado nunca chega a ser renderizado (já é excluído em `rebuildIndex`), então o ramo `"Desarquivar"` deste botão fica sem uso visível até a Task 2 — isso é esperado, não é código morto (a lógica já está correta pra quando a Task 2 tornar arquivados visíveis de novo).

- [ ] **Step 4: Preservar `archived` ao criar e editar; iniciar `archived: false` na criação**

Localizar em `app.js`, dentro do handler de submit do `#doc-form`:

```js
        var docs = storageApi.getDocs(state.activeProjectId);
        if (editingDocId) {
            var index = docs.findIndex(function (d) { return d.id === editingDocId; });
            var updatedDoc = { id: editingDocId, title: title, theme: theme, tags: tagsList, summary: summary, sourceUrl: sourceUrl, synonyms: synonymsList };
            if (index === -1) { docs.push(updatedDoc); } else { docs[index] = updatedDoc; }
        } else {
            var id = slugify(title) + "-" + Date.now();
            docs.push({ id: id, title: title, theme: theme, tags: tagsList, summary: summary, sourceUrl: sourceUrl, synonyms: synonymsList });
        }
```

Substituir por:

```js
        var docs = storageApi.getDocs(state.activeProjectId);
        if (editingDocId) {
            var index = docs.findIndex(function (d) { return d.id === editingDocId; });
            var previousArchived = index === -1 ? false : !!docs[index].archived;
            var updatedDoc = { id: editingDocId, title: title, theme: theme, tags: tagsList, summary: summary, sourceUrl: sourceUrl, synonyms: synonymsList, archived: previousArchived };
            if (index === -1) { docs.push(updatedDoc); } else { docs[index] = updatedDoc; }
        } else {
            var id = slugify(title) + "-" + Date.now();
            docs.push({ id: id, title: title, theme: theme, tags: tagsList, summary: summary, sourceUrl: sourceUrl, synonyms: synonymsList, archived: false });
        }
```

- [ ] **Step 5: Verificar manualmente no navegador**

Servir o projeto localmente (ex.: `python -m http.server` na raiz do repo — nunca abrir `index.html` via `file://` direto neste ambiente, o preview não aplica CSS/JS) e testar:

1. Cadastrar um documento de teste com um Tema exclusivo (ex.: `"Tema Teste Unico"`) — confirmar que aparece normalmente, com botão "Arquivar" no card, e que o tema aparece na sidebar.
2. Clicar em "Arquivar": o card some da lista de resultados imediatamente, e `"Tema Teste Unico"` some da sidebar de Temas (nenhum outro documento o usa).
3. Inspecionar o `localStorage` do navegador (ex.: via ferramenta de JS do navegador: `JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('docscat_v1_docs_'))))`) e confirmar que o documento **continua lá**, com `archived: true` — não foi removido, só escondido.
4. Cadastrar outro documento novo e confirmar no `localStorage` que ele nasce com `archived: false`.
5. Editar esse documento novo (feature já existente) sem arquivá-lo, salvar, e confirmar no `localStorage` que `archived` continua `false` depois da edição.

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "feat: adicionar arquivamento de documento (campo archived e botao no card)"
```

---

### Task 2: Checkbox "Incluir arquivados" e badge no card

**Files:**
- Modify: `index.html` (novo checkbox no painel de busca)
- Modify: `app.js` (`el`, `state`, `rebuildIndex`, `resetFilters`, `createCard`, listeners de evento)

**Interfaces:**
- Consumes: `state.includeArchived` (novo, boolean), `el.includeArchived` (novo, referência ao checkbox), `rebuildIndex`, `render`, `resetFilters` — todos já existentes ou introduzidos nesta mesma task.

- [ ] **Step 1: Adicionar o checkbox no painel de busca**

Localizar em `index.html`:

```html
                <section class="panel sticky-panel">
                    <label class="search-label" for="search-input">Buscar por tema, tag ou descricao</label>
                    <div class="search-box">
                        <input id="search-input" type="search" placeholder="Ex.: nomeclatura, metadata, padrao" autocomplete="off">
                    </div>
                    <p class="search-hint" id="search-hint">Digite para filtrar e ranquear os resultados.</p>
                </section>
```

Substituir por:

```html
                <section class="panel sticky-panel">
                    <label class="search-label" for="search-input">Buscar por tema, tag ou descricao</label>
                    <div class="search-box">
                        <input id="search-input" type="search" placeholder="Ex.: nomeclatura, metadata, padrao" autocomplete="off">
                    </div>
                    <p class="search-hint" id="search-hint">Digite para filtrar e ranquear os resultados.</p>
                    <p class="field-hint">
                        <label for="include-archived"><input id="include-archived" type="checkbox"> Incluir arquivados</label>
                    </p>
                </section>
```

- [ ] **Step 2: Adicionar `includeArchived` a `el` e a `state`**

Localizar em `app.js`:

```js
        formError: document.getElementById("form-error"),
        modalTitle: document.getElementById("modal-title"),
        formSubmit: document.querySelector("#doc-form button[type=\"submit\"]")
    };
```

Substituir por:

```js
        formError: document.getElementById("form-error"),
        modalTitle: document.getElementById("modal-title"),
        formSubmit: document.querySelector("#doc-form button[type=\"submit\"]"),
        includeArchived: document.getElementById("include-archived")
    };
```

Localizar em `app.js`:

```js
    var state = { query: "", selectedTheme: null, selectedTags: new Set(), activeProjectId: null };
```

Substituir por:

```js
    var state = { query: "", selectedTheme: null, selectedTags: new Set(), activeProjectId: null, includeArchived: false };
```

- [ ] **Step 3: Tornar a exclusão de arquivados condicional ao checkbox**

Localizar em `app.js`:

```js
    function rebuildIndex() {
        var docs = state.activeProjectId ? storageApi.getDocs(state.activeProjectId) : [];
        docs = docs.filter(function (d) { return !d.archived; });
        enriched = docs.map(enrich);
        themes = Array.from(new Set(enriched.map(function (d) { return d.theme; }))).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
        tags = Array.from(new Set(enriched.reduce(function (acc, d) { return acc.concat(d.tags); }, []))).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
    }
```

Substituir por:

```js
    function rebuildIndex() {
        var docs = state.activeProjectId ? storageApi.getDocs(state.activeProjectId) : [];
        if (!state.includeArchived) { docs = docs.filter(function (d) { return !d.archived; }); }
        enriched = docs.map(enrich);
        themes = Array.from(new Set(enriched.map(function (d) { return d.theme; }))).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
        tags = Array.from(new Set(enriched.reduce(function (acc, d) { return acc.concat(d.tags); }, []))).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
    }
```

- [ ] **Step 4: Resetar o checkbox junto com os outros filtros**

Localizar em `app.js`:

```js
    function resetFilters(skipRender) {
        state.query = ""; state.selectedTheme = null; state.selectedTags.clear();
        el.searchInput.value = "";
        if (!skipRender) render();
    }
```

Substituir por:

```js
    function resetFilters(skipRender) {
        state.query = ""; state.selectedTheme = null; state.selectedTags.clear(); state.includeArchived = false;
        el.searchInput.value = ""; el.includeArchived.checked = false;
        if (!skipRender) render();
    }
```

- [ ] **Step 5: Adicionar a badge "Arquivado" no card**

Localizar em `app.js`, dentro de `createCard(doc)`:

```js
            '  <div class="card-badges"><span class="score-badge">Relevancia ' + Math.max(doc.score, 0).toFixed(2) + '</span></div>',
```

Substituir por:

```js
            '  <div class="card-badges"><span class="score-badge">Relevancia ' + Math.max(doc.score, 0).toFixed(2) + '</span>' + (doc.archived ? '<span class="score-badge">Arquivado</span>' : "") + '</div>',
```

- [ ] **Step 6: Ligar o checkbox e corrigir o botão "Resetar filtros" pra reconstruir o índice**

Localizar em `app.js`:

```js
    el.clearTheme.addEventListener("click", function () { state.selectedTheme = null; render(); });
    el.clearTags.addEventListener("click", function () { state.selectedTags.clear(); render(); });
    el.resetFilters.addEventListener("click", function () { resetFilters(false); });
```

Substituir por:

```js
    el.clearTheme.addEventListener("click", function () { state.selectedTheme = null; render(); });
    el.clearTags.addEventListener("click", function () { state.selectedTags.clear(); render(); });
    el.includeArchived.addEventListener("change", function (e) { state.includeArchived = e.target.checked; rebuildIndex(); render(); });
    el.resetFilters.addEventListener("click", function () { resetFilters(true); rebuildIndex(); render(); });
```

Nota: `resetFilters` agora também zera `state.includeArchived`, então o clique em "Resetar filtros" precisa reconstruir o índice (`rebuildIndex()`) antes de renderizar — por isso a troca de `resetFilters(false)` (que só renderiza) para `resetFilters(true); rebuildIndex(); render();` (mesmo padrão já usado em `switchToProject`). Isso não muda o comportamento de resetar tema/tag/busca, só garante que o índice reflita `includeArchived` corretamente.

- [ ] **Step 7: Verificar manualmente no navegador**

Servir localmente e testar (pode reaproveitar o documento arquivado da Task 1, se o `localStorage` ainda tiver):

1. Com "Incluir arquivados" desmarcado (padrão), confirmar que o comportamento é o mesmo de antes da Task 2 — documentos arquivados continuam escondidos.
2. Marcar "Incluir arquivados": o documento arquivado volta a aparecer nos resultados, com a badge "Arquivado" ao lado da badge de relevância, e o botão do card agora diz "Desarquivar". O Tema exclusivo dele volta a aparecer na sidebar.
3. Clicar em "Desarquivar": a badge some, o botão volta a dizer "Arquivar", e o documento continua visível (o checkbox ainda está marcado).
4. Desmarcar o checkbox: o documento (agora desarquivado) continua visível normalmente.
5. Marcar "Incluir arquivados" de novo, então clicar em "Resetar filtros": confirmar que o checkbox desmarca e documentos arquivados (se houver algum nesse momento) somem de novo.
6. Trocar de projeto com o checkbox marcado: confirmar que ele volta a desmarcado no novo projeto.
7. Exportar o projeto atual (JSON) com um documento arquivado, e reimportar num projeto novo — abrir o arquivo `.json` baixado (ou inspecionar via editor de texto) e confirmar que o campo `"archived"` está presente no documento exportado; depois de importar, marcar "Incluir arquivados" no projeto novo e confirmar que o documento importado aparece com a badge "Arquivado" corretamente.

- [ ] **Step 8: Rodar os testes de regressão**

```bash
node tests/storage.test.js
node tests/importExport.test.js
```

Esperado: ambos terminam com "All ... tests passed." — nenhum dos dois arquivos testados foi tocado por este plano.

- [ ] **Step 9: Commit**

```bash
git add index.html app.js
git commit -m "feat: adicionar checkbox para incluir arquivados na busca"
```
