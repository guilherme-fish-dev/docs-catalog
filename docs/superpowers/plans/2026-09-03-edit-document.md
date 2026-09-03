# Editar Documento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir editar um documento já cadastrado (todos os campos), reaproveitando o modal/formulário de cadastro existente, mantendo o `id` do documento estável.

**Architecture:** Toda a mudança fica em `app.js`. Introduz uma variável de estado `editingDocId` (null = modo criação) que o modal já existente passa a respeitar: um novo botão "Editar" no card abre o mesmo modal só que pré-preenchido e com `editingDocId` setado; o handler de submit do formulário passa a checar essa variável para decidir entre criar um documento novo (comportamento atual, inalterado) ou atualizar o documento existente no lugar (mesma posição no array, mesmo `id`).

**Tech Stack:** JavaScript vanilla (sem framework), DOM API. Mesmo arquivo/módulo que já existe (`app.js`), sem novas dependências.

## Global Constraints

- Único arquivo tocado: `app.js`. Não alterar `js/storage.js`, `js/importExport.js`, `styles.css`, `index.html`, `projects.config.js`.
- O botão "Editar" usa a classe `.secondary-button` já existente em `styles.css` (mesmo estilo visual de "Exportar JSON"/"Importar JSON") — não criar CSS novo.
- Editar nunca regenera o `id` do documento. Criação continua gerando `id` do jeito atual: `slugify(title) + "-" + Date.now()`.
- O campo Tema continua sendo um valor único de texto por documento — não vira lista (fora de escopo, decidido no spec).
- Strings de UI novas seguem a convenção ASCII já usada no arquivo (ex.: "titulo", "obrigatorio", sem acentos) — usar "Editar documento" e "Salvar alteracoes".
- Mesmas validações de campo do cadastro se aplicam à edição, sem duplicar a lógica de validação.
- Sem testes automatizados novos: `app.js` não tem suíte de testes hoje (só `js/storage.js`/`js/importExport.js`, que são módulos puros sem DOM, têm testes em `tests/`). Verificação é manual, no navegador. Rodar `node tests/storage.test.js` e `node tests/importExport.test.js` ao final como guarda de regressão (não devem ser afetados).

---

### Task 1: Estado de edição, pré-preenchimento do modal e botão "Editar" no card

**Files:**
- Modify: `app.js` (bloco `el = { ... }`, bloco "Modal (cadastro de documento)", função `createCard`)

**Interfaces:**
- Produces: variável de módulo `editingDocId` (string com o `id` do documento em edição, ou `null` em modo criação); função `openEditModal(doc)` que abre o modal pré-preenchido para editar `doc`; função `setModalMode(isEditing)` que atualiza o título do modal e o texto do botão de submit. Task 2 consome `editingDocId` no handler de submit — deve ler exatamente esse nome de variável.
- Consumes: `el.modalOverlay`, `el.docForm`, `el.fTitle`, `el.fTheme`, `el.fSummary`, `el.fUrl`, `el.tagsChipBox`, `el.fTagsInput`, `el.synonymsChipBox`, `el.fSynonymsInput`, `el.themesDatalist`, `el.formError`, `formTags`, `formSynonyms`, `renderChips`, `escapeHtml`, `themes` — todos já existentes em `app.js`, inalterados.

- [ ] **Step 1: Adicionar `modalTitle` e `formSubmit` ao objeto `el`**

Localizar em `app.js`:

```js
        formError: document.getElementById("form-error")
    };
```

Substituir por:

```js
        formError: document.getElementById("form-error"),
        modalTitle: document.getElementById("modal-title"),
        formSubmit: document.querySelector("#doc-form button[type=\"submit\"]")
    };
```

- [ ] **Step 2: Adicionar `editingDocId`, `setModalMode`, `openEditModal`, e atualizar `resetForm`**

Localizar em `app.js`:

```js
    // Modal (cadastro de documento)
    var formTags = new Set();
    var formSynonyms = new Set();

    function openModal() {
        if (!state.activeProjectId) return;
        el.modalOverlay.hidden = false;
        document.body.classList.add("modal-open");
        el.themesDatalist.innerHTML = themes.map(function (t) { return '<option value="' + escapeHtml(t) + '">'; }).join("");
        resetForm();
        setTimeout(function () { el.fTitle.focus(); }, 50);
    }

    function closeModal() {
        el.modalOverlay.hidden = true;
        document.body.classList.remove("modal-open");
        resetForm();
    }

    function resetForm() {
        el.docForm.reset();
        formTags.clear(); formSynonyms.clear();
        renderChips(el.tagsChipBox, el.fTagsInput, formTags);
        renderChips(el.synonymsChipBox, el.fSynonymsInput, formSynonyms);
        el.formError.hidden = true; el.formError.textContent = "";
    }
```

Substituir por:

```js
    // Modal (cadastro/edicao de documento)
    var formTags = new Set();
    var formSynonyms = new Set();
    var editingDocId = null;

    function setModalMode(isEditing) {
        el.modalTitle.textContent = isEditing ? "Editar documento" : "Cadastrar documento";
        el.formSubmit.textContent = isEditing ? "Salvar alteracoes" : "Salvar documento";
    }

    function openModal() {
        if (!state.activeProjectId) return;
        el.modalOverlay.hidden = false;
        document.body.classList.add("modal-open");
        el.themesDatalist.innerHTML = themes.map(function (t) { return '<option value="' + escapeHtml(t) + '">'; }).join("");
        resetForm();
        setTimeout(function () { el.fTitle.focus(); }, 50);
    }

    function openEditModal(doc) {
        if (!state.activeProjectId) return;
        el.modalOverlay.hidden = false;
        document.body.classList.add("modal-open");
        el.themesDatalist.innerHTML = themes.map(function (t) { return '<option value="' + escapeHtml(t) + '">'; }).join("");
        resetForm();
        editingDocId = doc.id;
        el.fTitle.value = doc.title;
        el.fTheme.value = doc.theme;
        el.fSummary.value = doc.summary;
        el.fUrl.value = doc.sourceUrl;
        (doc.tags || []).forEach(function (t) { formTags.add(t); });
        (doc.synonyms || []).forEach(function (s) { formSynonyms.add(s); });
        renderChips(el.tagsChipBox, el.fTagsInput, formTags);
        renderChips(el.synonymsChipBox, el.fSynonymsInput, formSynonyms);
        setModalMode(true);
        setTimeout(function () { el.fTitle.focus(); }, 50);
    }

    function closeModal() {
        el.modalOverlay.hidden = true;
        document.body.classList.remove("modal-open");
        resetForm();
    }

    function resetForm() {
        el.docForm.reset();
        formTags.clear(); formSynonyms.clear();
        renderChips(el.tagsChipBox, el.fTagsInput, formTags);
        renderChips(el.synonymsChipBox, el.fSynonymsInput, formSynonyms);
        el.formError.hidden = true; el.formError.textContent = "";
        editingDocId = null;
        setModalMode(false);
    }
```

Note: `openModal()` fica **idêntico** ao original — `resetForm()` agora zera `editingDocId` e chama `setModalMode(false)` internamente, então o modo criação já sai correto sem precisar de mudança na função `openModal`. `closeModal()` também fica idêntico (já chamava `resetForm()`).

- [ ] **Step 3: Adicionar o botão "Editar" no card, ao lado de "Remover"**

Localizar em `app.js`, dentro de `createCard(doc)`:

```js
            '<div class="doc-actions">' + linkMarkup + ' <button class="danger-button delete-btn" type="button" data-id="' + escapeHtml(doc.id) + '">Remover</button></div>'
        ].join("\n");
        article.querySelector(".delete-btn").addEventListener("click", function () { deleteDocument(doc.id); });
        return article;
```

Substituir por:

```js
            '<div class="doc-actions">' + linkMarkup + ' <button class="secondary-button edit-btn" type="button" data-id="' + escapeHtml(doc.id) + '">Editar</button> <button class="danger-button delete-btn" type="button" data-id="' + escapeHtml(doc.id) + '">Remover</button></div>'
        ].join("\n");
        article.querySelector(".edit-btn").addEventListener("click", function () { openEditModal(doc); });
        article.querySelector(".delete-btn").addEventListener("click", function () { deleteDocument(doc.id); });
        return article;
```

- [ ] **Step 4: Verificar manualmente no navegador**

Servir o projeto localmente (ex.: `python -m http.server` na raiz do repo) e abrir no navegador (o preview de `file://` não aplica CSS/JS neste ambiente — sempre usar um servidor local).

1. Cadastrar um documento de teste (fluxo de criação deve continuar idêntico ao de antes).
2. No card criado, confirmar que agora existe um botão "Editar" (estilo `.secondary-button`, igual "Exportar JSON") ao lado de "Remover".
3. Clicar em "Editar": o modal abre com título "Editar documento", botão de submit com texto "Salvar alteracoes", e todos os campos (título, tema, resumo, link) e os dois grupos de chips (tags, sinônimos) pré-preenchidos exatamente com os valores do documento.
4. Clicar em "Cancelar": modal fecha, documento original permanece inalterado (nada foi salvo ainda — o submit ainda não trata edição nesta task).
5. Clicar em "+ Cadastrar" logo em seguida: modal abre vazio, com título "Cadastrar documento" e botão "Salvar documento" — confirma que não há vazamento de estado do modo edição anterior.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: adicionar botao Editar e pre-preenchimento do modal de documento"
```

---

### Task 2: Salvar edição no lugar (mesmo `id`) ao submeter o formulário

**Files:**
- Modify: `app.js` (handler de submit do `#doc-form`)

**Interfaces:**
- Consumes: `editingDocId`, `slugify`, `storageApi.getDocs`, `storageApi.saveDocs`, `rebuildIndex`, `render`, `closeModal`, `showError` — todos já existentes ou introduzidos na Task 1.

- [ ] **Step 1: Atualizar o handler de submit para branchear entre criar e editar**

Localizar em `app.js`:

```js
    el.docForm.addEventListener("submit", function (e) {
        e.preventDefault(); el.formError.hidden = true;
        flushChipInput(el.fTagsInput, el.tagsChipBox, formTags);
        flushChipInput(el.fSynonymsInput, el.synonymsChipBox, formSynonyms);
        var title = el.fTitle.value.trim();
        var theme = el.fTheme.value.trim();
        var summary = el.fSummary.value.trim();
        var sourceUrl = el.fUrl.value.trim();
        var tagsList = Array.from(formTags);
        var synonymsList = Array.from(formSynonyms);
        if (!title) { showError("O titulo e obrigatorio.", el.fTitle); return; }
        if (!theme) { showError("O tema e obrigatorio.", el.fTheme); return; }
        if (tagsList.length === 0) { showError("Adicione ao menos uma tag.", el.fTagsInput); return; }
        if (!summary) { showError("O resumo e obrigatorio.", el.fSummary); return; }
        if (!sourceUrl) { showError("O link do documento e obrigatorio.", el.fUrl); return; }
        var id = slugify(title) + "-" + Date.now();
        var newDoc = { id: id, title: title, theme: theme, tags: tagsList, summary: summary, sourceUrl: sourceUrl, synonyms: synonymsList };
        var docs = storageApi.getDocs(state.activeProjectId);
        docs.push(newDoc);
        storageApi.saveDocs(state.activeProjectId, docs);
        rebuildIndex(); render();
        closeModal();
    });
```

Substituir por:

```js
    el.docForm.addEventListener("submit", function (e) {
        e.preventDefault(); el.formError.hidden = true;
        flushChipInput(el.fTagsInput, el.tagsChipBox, formTags);
        flushChipInput(el.fSynonymsInput, el.synonymsChipBox, formSynonyms);
        var title = el.fTitle.value.trim();
        var theme = el.fTheme.value.trim();
        var summary = el.fSummary.value.trim();
        var sourceUrl = el.fUrl.value.trim();
        var tagsList = Array.from(formTags);
        var synonymsList = Array.from(formSynonyms);
        if (!title) { showError("O titulo e obrigatorio.", el.fTitle); return; }
        if (!theme) { showError("O tema e obrigatorio.", el.fTheme); return; }
        if (tagsList.length === 0) { showError("Adicione ao menos uma tag.", el.fTagsInput); return; }
        if (!summary) { showError("O resumo e obrigatorio.", el.fSummary); return; }
        if (!sourceUrl) { showError("O link do documento e obrigatorio.", el.fUrl); return; }
        var docs = storageApi.getDocs(state.activeProjectId);
        if (editingDocId) {
            var index = docs.findIndex(function (d) { return d.id === editingDocId; });
            var updatedDoc = { id: editingDocId, title: title, theme: theme, tags: tagsList, summary: summary, sourceUrl: sourceUrl, synonyms: synonymsList };
            if (index === -1) { docs.push(updatedDoc); } else { docs[index] = updatedDoc; }
        } else {
            var id = slugify(title) + "-" + Date.now();
            docs.push({ id: id, title: title, theme: theme, tags: tagsList, summary: summary, sourceUrl: sourceUrl, synonyms: synonymsList });
        }
        storageApi.saveDocs(state.activeProjectId, docs);
        rebuildIndex(); render();
        closeModal();
    });
```

Nota: `index === -1` (documento não encontrado, caso extremo — ex.: removido em outra aba entre abrir o modal e salvar) cai para `push`, evitando perder a edição; isso não deveria acontecer no fluxo normal de uma única aba.

- [ ] **Step 2: Verificar manualmente no navegador — fluxo completo de edição**

Com o projeto servido localmente:

1. Cadastrar um documento de teste com Tema `"Padroes, Teste"` (reproduzindo o caso relatado) — confirmar que a sidebar de "Temas" mostra um único tema com esse texto completo.
2. Clicar em "Editar" nesse card, corrigir o campo Tema para `"Padroes"`, e clicar em "Salvar alteracoes".
3. Confirmar: o modal fecha, o card atualiza com o novo tema, a sidebar de "Temas" agora mostra `"Padroes"` (e não mais o valor antigo, caso nenhum outro documento o use).
4. Editar novamente o mesmo documento (qualquer campo) e salvar de novo — confirmar visualmente ou via `localStorage` que o `id` do documento não mudou entre as duas edições.
5. Editar um documento removendo uma tag existente e adicionando uma nova via os chip-inputs, salvar, e confirmar que o card exibe exatamente o conjunto final de tags (não a união com as antigas).
6. Abrir a edição de um documento, apagar o campo Título, e tentar salvar — confirmar que aparece "O titulo e obrigatorio." (mesma mensagem do cadastro) e o modal não fecha.
7. Repetir o teste 6 para Tema vazio, zero tags, Resumo vazio e Link vazio — cada um deve mostrar sua mensagem de erro correspondente sem fechar o modal.
8. Cadastrar um documento novo (fluxo de criação) logo depois de ter editado outro — confirmar que gera um documento novo (não sobrescreve o que foi editado por último).

- [ ] **Step 3: Rodar os testes de regressão**

```bash
node tests/storage.test.js
node tests/importExport.test.js
```

Esperado: ambos terminam com "All ... tests passed." — nenhum dos dois arquivos testados foi tocado por este plano.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: salvar edicao de documento no lugar mantendo o id"
```
