(function docsCatalogApp() {
    "use strict";

    var storageApi = window.DocsCatalogStorage.createStorageApi(window.localStorage);
    var slugify = window.DocsCatalogStorage.slugify;
    var buildExportPayload = window.DocsCatalogImportExport.buildExportPayload;
    var applyImport = window.DocsCatalogImportExport.applyImport;

    // Text / vector helpers (unchanged from the original prototype)
    var stopWords = new Set([
        "a", "as", "o", "os", "de", "da", "do", "das", "dos", "e", "em",
        "para", "por", "com", "no", "na", "nos", "nas", "um", "uma", "ou"
    ]);

    function normalizeText(value) {
        return (value || "").toLowerCase().normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ").trim();
    }

    function tokenize(value) {
        return normalizeText(value).split(" ").filter(Boolean).filter(function (t) { return !stopWords.has(t); });
    }

    function buildWeightedBag(doc) {
        var bag = new Map();
        function add(text, w) {
            tokenize(text).forEach(function (t) { bag.set(t, (bag.get(t) || 0) + w); });
        }
        add(doc.title, 5); add(doc.theme, 4); add(doc.tags.join(" "), 4);
        add(doc.summary, 3); add((doc.synonyms || []).join(" "), 2);
        return bag;
    }

    function enrich(doc) {
        var tags = Array.isArray(doc.tags) ? doc.tags : [];
        var synonyms = Array.isArray(doc.synonyms) ? doc.synonyms : [];
        var title = String(doc.title || "");
        var theme = String(doc.theme || "");
        var summary = String(doc.summary || "");
        var safeDoc = Object.assign({}, doc, { tags: tags, synonyms: synonyms, title: title, theme: theme, summary: summary });
        return Object.assign({}, safeDoc, {
            normalizedTheme: normalizeText(theme),
            normalizedTags: tags.map(normalizeText),
            searchableText: normalizeText([title, theme, tags.join(" "), summary, synonyms.join(" ")].join(" ")),
            weightedBag: buildWeightedBag(safeDoc)
        });
    }

    function cosineSimilarity(left, right) {
        var dot = 0, magL = 0, magR = 0;
        left.forEach(function (v) { magL += v * v; });
        right.forEach(function (v) { magR += v * v; });
        left.forEach(function (v, k) { if (right.has(k)) dot += v * right.get(k); });
        return (!magL || !magR) ? 0 : dot / (Math.sqrt(magL) * Math.sqrt(magR));
    }

    function buildQueryBag(q) {
        var bag = new Map();
        tokenize(q).forEach(function (t) { bag.set(t, (bag.get(t) || 0) + 1); });
        return bag;
    }

    function computeScore(doc, query) {
        if (!query) return 1;
        var nq = normalizeText(query);
        var qTokens = tokenize(query);
        var score = cosineSimilarity(buildQueryBag(query), doc.weightedBag);
        if (normalizeText(doc.title).includes(nq)) score += 1.6;
        if (doc.normalizedTheme.includes(nq)) score += 1.1;
        doc.normalizedTags.forEach(function (t) { if (t.includes(nq)) score += 0.9; });
        qTokens.forEach(function (t) { if (doc.searchableText.includes(t)) score += 0.2; });
        return score;
    }

    // Index (scoped to the active project)
    var enriched = [], themes = [], tags = [];

    function rebuildIndex() {
        var docs = state.activeProjectId ? storageApi.getDocs(state.activeProjectId) : [];
        enriched = docs.map(enrich);
        themes = Array.from(new Set(enriched.map(function (d) { return d.theme; }))).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
        tags = Array.from(new Set(enriched.reduce(function (acc, d) { return acc.concat(d.tags); }, []))).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
    }

    // State
    var state = { query: "", selectedTheme: null, selectedTags: new Set(), activeProjectId: null };

    // Elements
    var el = {
        projectSelect: document.getElementById("project-select"),
        btnNewProject: document.getElementById("btn-new-project"),
        btnRenameProject: document.getElementById("btn-rename-project"),
        btnRemoveProject: document.getElementById("btn-remove-project"),
        btnExportProject: document.getElementById("btn-export-project"),
        btnImportProject: document.getElementById("btn-import-project"),
        importFileInput: document.getElementById("import-file-input"),
        searchInput: document.getElementById("search-input"),
        searchHint: document.getElementById("search-hint"),
        themeList: document.getElementById("theme-list"),
        tagList: document.getElementById("tag-list"),
        activeFilters: document.getElementById("active-filters"),
        results: document.getElementById("results"),
        resultsCount: document.getElementById("results-count"),
        clearTheme: document.getElementById("clear-theme"),
        clearTags: document.getElementById("clear-tags"),
        resetFilters: document.getElementById("reset-filters"),
        btnNewDoc: document.getElementById("btn-new-doc"),
        modalOverlay: document.getElementById("modal-overlay"),
        modalClose: document.getElementById("modal-close"),
        formCancel: document.getElementById("form-cancel"),
        docForm: document.getElementById("doc-form"),
        fTitle: document.getElementById("f-title"),
        fTheme: document.getElementById("f-theme"),
        fSummary: document.getElementById("f-summary"),
        fUrl: document.getElementById("f-url"),
        tagsChipBox: document.getElementById("tags-chip-box"),
        fTagsInput: document.getElementById("f-tags-input"),
        synonymsChipBox: document.getElementById("synonyms-chip-box"),
        fSynonymsInput: document.getElementById("f-synonyms-input"),
        themesDatalist: document.getElementById("themes-datalist"),
        formError: document.getElementById("form-error"),
        modalTitle: document.getElementById("modal-title"),
        formSubmit: document.querySelector("#doc-form button[type=\"submit\"]")
    };

    // Project registry UI
    function renderProjectSelect() {
        var projects = storageApi.getProjects();
        el.projectSelect.innerHTML = "";
        projects.forEach(function (p) {
            var opt = document.createElement("option");
            opt.value = p.id; opt.textContent = p.label;
            if (p.id === state.activeProjectId) opt.selected = true;
            el.projectSelect.appendChild(opt);
        });
        var hasProjects = projects.length > 0;
        el.projectSelect.disabled = !hasProjects;
        el.btnRenameProject.disabled = !hasProjects;
        el.btnRemoveProject.disabled = !hasProjects;
        el.btnExportProject.disabled = !hasProjects;
        el.btnNewDoc.disabled = !hasProjects;
    }

    function switchToProject(projectId) {
        state.activeProjectId = projectId;
        storageApi.setActiveProjectId(projectId);
        resetFilters(true);
        rebuildIndex();
        render();
    }

    function getActiveProject() {
        var projects = storageApi.getProjects();
        return projects.filter(function (p) { return p.id === state.activeProjectId; })[0] || null;
    }

    function handleNewProject() {
        var label = window.prompt("Nome do novo projeto:");
        if (!label || !label.trim()) return;
        var project = storageApi.createProject(label.trim());
        renderProjectSelect();
        switchToProject(project.id);
    }

    function handleRenameProject() {
        var project = getActiveProject();
        if (!project) return;
        var label = window.prompt("Novo nome do projeto:", project.label);
        if (!label || !label.trim() || label.trim() === project.label) return;
        storageApi.renameProject(project.id, label.trim());
        renderProjectSelect();
    }

    function handleRemoveProject() {
        var project = getActiveProject();
        if (!project) return;
        var confirmed = window.confirm("Remover o projeto \"" + project.label + "\" e todos os seus documentos? Essa acao nao pode ser desfeita.");
        if (!confirmed) return;
        storageApi.removeProject(project.id);
        var nextId = storageApi.getActiveProjectId();
        renderProjectSelect();
        switchToProject(nextId);
    }

    function downloadJson(filename, payload) {
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleExportProject() {
        var project = getActiveProject();
        if (!project) return;
        var docs = storageApi.getDocs(project.id);
        var payload = buildExportPayload(project, docs);
        var today = new Date().toISOString().slice(0, 10);
        downloadJson(project.id + "-export-" + today + ".json", payload);
    }

    function handleImportProject() {
        el.importFileInput.value = "";
        el.importFileInput.click();
    }

    function handleImportFileSelected(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
            var payload;
            try {
                payload = JSON.parse(String(reader.result));
            } catch (err) {
                window.alert("Arquivo JSON invalido.");
                return;
            }
            if (!payload || !payload.project || !payload.project.id) {
                window.alert("Arquivo de importacao invalido: faltando dados do projeto.");
                return;
            }
            var projects = storageApi.getProjects();
            var existingProject = projects.filter(function (p) { return p.id === payload.project.id; })[0];
            var actualProjectId;
            if (existingProject) {
                actualProjectId = existingProject.id;
            } else {
                actualProjectId = storageApi.createProject(payload.project.label || payload.project.id, payload.project.id).id;
            }
            var merge = window.confirm("Mesclar com os documentos existentes do projeto?\nOK = mesclar (mantem os locais em caso de conflito de id)\nCancelar = substituir tudo pelo arquivo importado");
            var existingDocs = storageApi.getDocs(actualProjectId);
            var result;
            try {
                result = applyImport(existingDocs, payload, merge ? "merge" : "replace");
            } catch (err) {
                window.alert("Nao foi possivel importar: " + err.message);
                return;
            }
            storageApi.saveDocs(actualProjectId, result.docs);
            if (result.conflicts.length) {
                window.alert(result.conflicts.length + " documento(s) ignorado(s) por conflito de id: " + result.conflicts.join(", "));
            }
            if (result.rejected && result.rejected.length) {
                window.alert(result.rejected.length + " documento(s) invalido(s) ignorado(s) na importacao.");
            }
            renderProjectSelect();
            switchToProject(actualProjectId);
        };
        reader.readAsText(file);
    }

    // Filter / render
    function filterDocuments() {
        return enriched
            .filter(function (doc) {
                if (state.selectedTheme && doc.theme !== state.selectedTheme) return false;
                if (state.selectedTags.size > 0 && !Array.from(state.selectedTags).every(function (t) { return doc.tags.includes(t); })) return false;
                if (!state.query) return true;
                return computeScore(doc, state.query) > 0;
            })
            .map(function (doc) { return Object.assign({}, doc, { score: computeScore(doc, state.query) }); })
            .sort(function (a, b) { return b.score - a.score || a.title.localeCompare(b.title, "pt-BR"); });
    }

    function renderThemes() {
        el.themeList.innerHTML = "";
        themes.forEach(function (theme) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "chip" + (state.selectedTheme === theme ? " is-selected" : "");
            btn.textContent = theme;
            btn.addEventListener("click", function () { state.selectedTheme = state.selectedTheme === theme ? null : theme; render(); });
            el.themeList.appendChild(btn);
        });
    }

    function renderTags() {
        el.tagList.innerHTML = "";
        tags.forEach(function (tag) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "chip" + (state.selectedTags.has(tag) ? " is-selected" : "");
            btn.textContent = tag;
            btn.addEventListener("click", function () {
                if (state.selectedTags.has(tag)) { state.selectedTags.delete(tag); } else { state.selectedTags.add(tag); }
                render();
            });
            el.tagList.appendChild(btn);
        });
    }

    function renderActiveFilters() {
        el.activeFilters.innerHTML = "";
        function addPill(text) { var p = document.createElement("span"); p.className = "filter-pill"; p.textContent = text; el.activeFilters.appendChild(p); }
        if (state.query) addPill("Busca: " + state.query);
        if (state.selectedTheme) addPill("Tema: " + state.selectedTheme);
        Array.from(state.selectedTags).forEach(function (t) { addPill("Tag: " + t); });
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    var SAFE_URL_SCHEME = /^(https?|mailto|file):/i;

    function createCard(doc) {
        var article = document.createElement("article");
        article.className = "doc-card";
        var tagsMarkup = doc.tags.map(function (t) { return '<span class="tag-pill">' + escapeHtml(t) + '</span>'; }).join("");
        var sourceUrl = String(doc.sourceUrl || "");
        var linkMarkup = SAFE_URL_SCHEME.test(sourceUrl)
            ? '<a class="primary-link" href="' + escapeHtml(sourceUrl) + '" target="_blank" rel="noreferrer">Abrir documento</a>'
            : '<span class="primary-link">' + escapeHtml(sourceUrl) + '</span>';
        article.innerHTML = [
            '<div class="card-head">',
            '  <div><p class="eyebrow">' + escapeHtml(doc.theme) + '</p><h3 class="card-title">' + escapeHtml(doc.title) + '</h3></div>',
            '  <div class="card-badges"><span class="score-badge">Relevancia ' + Math.max(doc.score, 0).toFixed(2) + '</span></div>',
            '</div>',
            '<p class="doc-summary">' + escapeHtml(doc.summary) + '</p>',
            '<div class="doc-meta"><div class="meta-line"><span class="meta-label">Tema</span><strong>' + escapeHtml(doc.theme) + '</strong></div></div>',
            '<div class="tag-row">' + tagsMarkup + '</div>',
            '<div class="doc-actions">' + linkMarkup + ' <button class="secondary-button edit-btn" type="button" data-id="' + escapeHtml(doc.id) + '">Editar</button> <button class="danger-button delete-btn" type="button" data-id="' + escapeHtml(doc.id) + '">Remover</button></div>'
        ].join("\n");
        article.querySelector(".edit-btn").addEventListener("click", function () { openEditModal(doc); });
        article.querySelector(".delete-btn").addEventListener("click", function () { deleteDocument(doc.id); });
        return article;
    }

    function renderResults() {
        var filtered = filterDocuments();
        el.results.innerHTML = "";
        el.resultsCount.textContent = filtered.length + " documento" + (filtered.length === 1 ? "" : "s");
        if (!state.activeProjectId) {
            var noProject = document.createElement("div");
            noProject.className = "empty-state";
            noProject.textContent = "Nenhum projeto cadastrado ainda. Clique em \"+ Novo projeto\" para comecar.";
            el.results.appendChild(noProject);
            return;
        }
        if (filtered.length === 0) {
            var emptyDocs = document.createElement("div");
            emptyDocs.className = "empty-state";
            emptyDocs.textContent = "Nenhum documento encontrado com os filtros atuais.";
            el.results.appendChild(emptyDocs);
            return;
        }
        filtered.forEach(function (doc) { el.results.appendChild(createCard(doc)); });
    }

    function renderSearchHint() {
        el.searchHint.textContent = state.query
            ? "A ordenacao combina correspondencia textual e similaridade vetorial leve entre os termos pesquisados e os metadados do documento."
            : "Digite para filtrar e ranquear os resultados.";
    }

    function resetFilters(skipRender) {
        state.query = ""; state.selectedTheme = null; state.selectedTags.clear();
        el.searchInput.value = "";
        if (!skipRender) render();
    }

    function render() {
        renderProjectSelect(); renderThemes(); renderTags(); renderActiveFilters(); renderResults(); renderSearchHint();
    }

    // Delete doc
    function deleteDocument(id) {
        var docs = storageApi.getDocs(state.activeProjectId).filter(function (d) { return d.id !== id; });
        storageApi.saveDocs(state.activeProjectId, docs);
        rebuildIndex(); render();
    }

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

    // Chip inputs
    function renderChips(box, input, chipSet) {
        Array.from(box.querySelectorAll(".form-chip")).forEach(function (c) { c.remove(); });
        chipSet.forEach(function (value) {
            var chip = document.createElement("span");
            chip.className = "form-chip";
            chip.innerHTML = escapeHtml(value) + '<button type="button" aria-label="Remover ' + escapeHtml(value) + '">×</button>';
            chip.querySelector("button").addEventListener("click", function () { chipSet.delete(value); renderChips(box, input, chipSet); });
            box.insertBefore(chip, input);
        });
    }

    function flushChipInput(input, box, chipSet) {
        var val = input.value.replace(/,/g, "").trim();
        if (val) { chipSet.add(val); input.value = ""; renderChips(box, input, chipSet); }
    }

    function bindChipInput(input, box, chipSet) {
        input.addEventListener("keydown", function (e) {
            if ((e.key === "Enter" || e.key === ",") && input.value.trim()) {
                e.preventDefault(); flushChipInput(input, box, chipSet);
            } else if (e.key === "Backspace" && !input.value && chipSet.size > 0) {
                var last = Array.from(chipSet).slice(-1)[0];
                chipSet.delete(last); renderChips(box, input, chipSet);
            }
        });
        input.addEventListener("blur", function () { flushChipInput(input, box, chipSet); });
    }

    function showError(msg, focusEl) {
        el.formError.textContent = msg; el.formError.hidden = false;
        if (focusEl) focusEl.focus();
    }

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

    // Event listeners
    el.searchInput.addEventListener("input", function (e) {
        state.query = e.target.value.trim(); renderResults(); renderActiveFilters(); renderSearchHint();
    });
    el.clearTheme.addEventListener("click", function () { state.selectedTheme = null; render(); });
    el.clearTags.addEventListener("click", function () { state.selectedTags.clear(); render(); });
    el.resetFilters.addEventListener("click", function () { resetFilters(false); });
    el.btnNewDoc.addEventListener("click", openModal);
    el.modalClose.addEventListener("click", closeModal);
    el.formCancel.addEventListener("click", closeModal);
    el.modalOverlay.addEventListener("click", function (e) { if (e.target === el.modalOverlay) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !el.modalOverlay.hidden) closeModal(); });
    bindChipInput(el.fTagsInput, el.tagsChipBox, formTags);
    bindChipInput(el.fSynonymsInput, el.synonymsChipBox, formSynonyms);

    el.projectSelect.addEventListener("change", function (e) { switchToProject(e.target.value); });
    el.btnNewProject.addEventListener("click", handleNewProject);
    el.btnRenameProject.addEventListener("click", handleRenameProject);
    el.btnRemoveProject.addEventListener("click", handleRemoveProject);
    el.btnExportProject.addEventListener("click", handleExportProject);
    el.btnImportProject.addEventListener("click", handleImportProject);
    el.importFileInput.addEventListener("change", handleImportFileSelected);

    // Init
    var OLD_USER_DOCS_KEY = "glossary_user_documents";

    function readLegacyUserDocuments() {
        var raw;
        try {
            raw = window.localStorage.getItem(OLD_USER_DOCS_KEY);
        } catch (e) {
            return [];
        }
        if (!raw) return [];
        var parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            return [];
        }
        if (!Array.isArray(parsed)) return [];
        return parsed.map(function (doc) {
            var copy = Object.assign({}, doc);
            delete copy._source;
            return copy;
        });
    }

    var legacyUserDocs = readLegacyUserDocuments();
    var legacySeedDocuments = (window.LEGACY_SEED_DOCUMENTS || []).concat(legacyUserDocs);
    storageApi.ensureSeeded(window.PROJECTS_SEED || [], legacySeedDocuments);
    try {
        window.localStorage.removeItem(OLD_USER_DOCS_KEY);
    } catch (e) {
        // ignore storage access errors
    }
    state.activeProjectId = storageApi.getActiveProjectId();
    rebuildIndex();
    render();
})();
