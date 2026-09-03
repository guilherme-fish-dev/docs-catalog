(function glossaryApp() {
    "use strict";

    const STORAGE_KEY = "glossary_user_documents";

    // Data helpers
    function loadLocalDocuments() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
        catch { return []; }
    }
    function saveLocalDocuments(docs) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    }

    // Text / vector helpers
    const stopWords = new Set([
        "a","as","o","os","de","da","do","das","dos","e","em",
        "para","por","com","no","na","nos","nas","um","uma","ou"
    ]);

    function normalizeText(value) {
        return (value || "").toLowerCase().normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ").trim();
    }

    function tokenize(value) {
        return normalizeText(value).split(" ").filter(Boolean).filter(function(t){ return !stopWords.has(t); });
    }

    function buildWeightedBag(doc) {
        const bag = new Map();
        function add(text, w) {
            tokenize(text).forEach(function(t){ bag.set(t, (bag.get(t)||0)+w); });
        }
        add(doc.title, 5); add(doc.theme, 4); add(doc.tags.join(" "), 4);
        add(doc.summary, 3); add((doc.synonyms||[]).join(" "), 2);
        return bag;
    }

    function enrich(doc) {
        return Object.assign({}, doc, {
            normalizedTheme: normalizeText(doc.theme),
            normalizedTags: doc.tags.map(normalizeText),
            searchableText: normalizeText([doc.title, doc.theme, doc.tags.join(" "), doc.summary, (doc.synonyms||[]).join(" ")].join(" ")),
            weightedBag: buildWeightedBag(doc)
        });
    }

    function cosineSimilarity(left, right) {
        let dot=0, magL=0, magR=0;
        left.forEach(function(v){ magL+=v*v; });
        right.forEach(function(v){ magR+=v*v; });
        left.forEach(function(v,k){ if(right.has(k)) dot+=v*right.get(k); });
        return (!magL||!magR)?0:dot/(Math.sqrt(magL)*Math.sqrt(magR));
    }

    function buildQueryBag(q) {
        const bag = new Map();
        tokenize(q).forEach(function(t){ bag.set(t,(bag.get(t)||0)+1); });
        return bag;
    }

    function computeScore(doc, query) {
        if (!query) return 1;
        const nq = normalizeText(query);
        const qTokens = tokenize(query);
        let score = cosineSimilarity(buildQueryBag(query), doc.weightedBag);
        if (normalizeText(doc.title).includes(nq)) score += 1.6;
        if (doc.normalizedTheme.includes(nq)) score += 1.1;
        doc.normalizedTags.forEach(function(t){ if(t.includes(nq)) score+=0.9; });
        qTokens.forEach(function(t){ if(doc.searchableText.includes(t)) score+=0.2; });
        return score;
    }

    // Index
    var enriched = [], themes = [], tags = [];

    function rebuildIndex() {
        const staticDocs = window.GLOSSARY_DOCUMENTS || [];
        const localDocs = loadLocalDocuments();
        const all = staticDocs.concat(localDocs);
        enriched = all.map(enrich);
        themes = Array.from(new Set(enriched.map(function(d){ return d.theme; }))).sort(function(a,b){ return a.localeCompare(b,"pt-BR"); });
        tags = Array.from(new Set(enriched.reduce(function(acc,d){ return acc.concat(d.tags); },[]))).sort(function(a,b){ return a.localeCompare(b,"pt-BR"); });
    }

    // State
    const state = { query:"", selectedTheme:null, selectedTags:new Set() };

    // Elements
    const el = {
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
        tabBtns: document.querySelectorAll(".tab-btn"),
        tabForm: document.getElementById("tab-form"),
        tabExport: document.getElementById("tab-export"),
        exportCode: document.getElementById("export-code"),
        btnCopyJson: document.getElementById("btn-copy-json")
    };

    // Filter / render
    function filterDocuments() {
        return enriched
            .filter(function(doc){
                if (state.selectedTheme && doc.theme !== state.selectedTheme) return false;
                if (state.selectedTags.size>0 && !Array.from(state.selectedTags).every(function(t){ return doc.tags.includes(t); })) return false;
                if (!state.query) return true;
                return computeScore(doc, state.query) > 0;
            })
            .map(function(doc){ return Object.assign({}, doc, {score: computeScore(doc, state.query)}); })
            .sort(function(a,b){ return b.score-a.score || a.title.localeCompare(b.title,"pt-BR"); });
    }

    function renderThemes() {
        el.themeList.innerHTML = "";
        themes.forEach(function(theme){
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "chip"+(state.selectedTheme===theme?" is-selected":"");
            btn.textContent = theme;
            btn.addEventListener("click", function(){ state.selectedTheme = state.selectedTheme===theme?null:theme; render(); });
            el.themeList.appendChild(btn);
        });
    }

    function renderTags() {
        el.tagList.innerHTML = "";
        tags.forEach(function(tag){
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "chip"+(state.selectedTags.has(tag)?" is-selected":"");
            btn.textContent = tag;
            btn.addEventListener("click", function(){
                if(state.selectedTags.has(tag)){ state.selectedTags.delete(tag); } else { state.selectedTags.add(tag); }
                render();
            });
            el.tagList.appendChild(btn);
        });
    }

    function renderActiveFilters() {
        el.activeFilters.innerHTML = "";
        function addPill(text){ const p=document.createElement("span"); p.className="filter-pill"; p.textContent=text; el.activeFilters.appendChild(p); }
        if (state.query) addPill("Busca: "+state.query);
        if (state.selectedTheme) addPill("Tema: "+state.selectedTheme);
        Array.from(state.selectedTags).forEach(function(t){ addPill("Tag: "+t); });
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    }

    function createCard(doc) {
        const article = document.createElement("article");
        article.className = "doc-card"+(doc._source==="local"?" is-local":"");
        const tagsMarkup = doc.tags.map(function(t){ return '<span class="tag-pill">'+escapeHtml(t)+'</span>'; }).join("");
        const localBadge = doc._source==="local"?'<span class="local-badge">Cadastrado</span>':"";
        const deleteBtn = doc._source==="local"
            ?'<button class="danger-button delete-btn" type="button" data-id="'+escapeHtml(doc.id)+'">Remover</button>':"";
        article.innerHTML = [
            '<div class="card-head">',
            '  <div><p class="eyebrow">'+escapeHtml(doc.theme)+'</p><h3 class="card-title">'+escapeHtml(doc.title)+'</h3></div>',
            '  <div class="card-badges">'+localBadge+'<span class="score-badge">Relevancia '+Math.max(doc.score,0).toFixed(2)+'</span></div>',
            '</div>',
            '<p class="doc-summary">'+escapeHtml(doc.summary)+'</p>',
            '<div class="doc-meta"><div class="meta-line"><span class="meta-label">Tema</span><strong>'+escapeHtml(doc.theme)+'</strong></div></div>',
            '<div class="tag-row">'+tagsMarkup+'</div>',
            '<div class="doc-actions"><a class="primary-link" href="'+escapeHtml(doc.sourceUrl)+'" target="_blank" rel="noreferrer">Abrir documento</a> '+deleteBtn+'</div>'
        ].join("\n");
        const deleteEl = article.querySelector(".delete-btn");
        if (deleteEl) deleteEl.addEventListener("click", function(){ deleteLocalDocument(doc.id); });
        return article;
    }

    function renderResults() {
        const filtered = filterDocuments();
        el.results.innerHTML = "";
        el.resultsCount.textContent = filtered.length+" documento"+(filtered.length===1?"":"s");
        if (filtered.length===0){
            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent = "Nenhum documento encontrado com os filtros atuais.";
            el.results.appendChild(empty);
            return;
        }
        filtered.forEach(function(doc){ el.results.appendChild(createCard(doc)); });
    }

    function renderSearchHint() {
        el.searchHint.textContent = state.query
            ? "A ordenacao combina correspondencia textual e similaridade vetorial leve entre os termos pesquisados e os metadados do documento."
            : "Digite para filtrar e ranquear os resultados.";
    }

    function resetFilters() {
        state.query=""; state.selectedTheme=null; state.selectedTags.clear();
        el.searchInput.value=""; render();
    }

    function render() {
        renderThemes(); renderTags(); renderActiveFilters(); renderResults(); renderSearchHint();
    }

    // Delete local doc
    function deleteLocalDocument(id) {
        const saved = loadLocalDocuments().filter(function(d){ return d.id!==id; });
        saveLocalDocuments(saved); rebuildIndex(); render();
    }

    // Modal
    const formTags = new Set();
    const formSynonyms = new Set();

    function openModal() {
        el.modalOverlay.hidden = false;
        document.body.classList.add("modal-open");
        el.themesDatalist.innerHTML = themes.map(function(t){ return '<option value="'+escapeHtml(t)+'">'; }).join("");
        switchTab("form"); resetForm();
        setTimeout(function(){ el.fTitle.focus(); }, 50);
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

    function switchTab(tabName) {
        el.tabBtns.forEach(function(btn){ btn.classList.toggle("is-active", btn.dataset.tab===tabName); });
        el.tabForm.hidden = tabName!=="form";
        el.tabExport.hidden = tabName!=="export";
    }

    // Chip inputs
    function renderChips(box, input, chipSet) {
        Array.from(box.querySelectorAll(".form-chip")).forEach(function(c){ c.remove(); });
        chipSet.forEach(function(value){
            const chip = document.createElement("span");
            chip.className = "form-chip";
            chip.innerHTML = escapeHtml(value)+'<button type="button" aria-label="Remover '+escapeHtml(value)+'">\u00d7</button>';
            chip.querySelector("button").addEventListener("click", function(){ chipSet.delete(value); renderChips(box, input, chipSet); });
            box.insertBefore(chip, input);
        });
    }

    function flushChipInput(input, box, chipSet) {
        const val = input.value.replace(/,/g,"").trim();
        if (val){ chipSet.add(val); input.value=""; renderChips(box, input, chipSet); }
    }

    function bindChipInput(input, box, chipSet) {
        input.addEventListener("keydown", function(e){
            if ((e.key==="Enter"||e.key===",") && input.value.trim()){
                e.preventDefault(); flushChipInput(input, box, chipSet);
            } else if (e.key==="Backspace" && !input.value && chipSet.size>0){
                const last = Array.from(chipSet).slice(-1)[0];
                chipSet.delete(last); renderChips(box, input, chipSet);
            }
        });
        input.addEventListener("blur", function(){ flushChipInput(input, box, chipSet); });
    }

    function showError(msg, focusEl) {
        el.formError.textContent = msg; el.formError.hidden = false;
        if (focusEl) focusEl.focus();
    }

    function slugify(text) {
        return normalizeText(text).replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"").replace(/-+/g,"-");
    }

    el.docForm.addEventListener("submit", function(e){
        e.preventDefault(); el.formError.hidden = true;
        flushChipInput(el.fTagsInput, el.tagsChipBox, formTags);
        flushChipInput(el.fSynonymsInput, el.synonymsChipBox, formSynonyms);
        const title = el.fTitle.value.trim();
        const theme = el.fTheme.value.trim();
        const summary = el.fSummary.value.trim();
        const sourceUrl = el.fUrl.value.trim();
        const tagsList = Array.from(formTags);
        const synonymsList = Array.from(formSynonyms);
        if (!title){ showError("O titulo e obrigatorio.", el.fTitle); return; }
        if (!theme){ showError("O tema e obrigatorio.", el.fTheme); return; }
        if (tagsList.length===0){ showError("Adicione ao menos uma tag.", el.fTagsInput); return; }
        if (!summary){ showError("O resumo e obrigatorio.", el.fSummary); return; }
        if (!sourceUrl){ showError("O link do documento e obrigatorio.", el.fUrl); return; }
        const id = slugify(title)+"-"+Date.now();
        const newDoc = { id:id, title:title, theme:theme, tags:tagsList, summary:summary, sourceUrl:sourceUrl, synonyms:synonymsList, _source:"local" };
        const saved = loadLocalDocuments();
        saved.push(newDoc); saveLocalDocuments(saved); rebuildIndex(); render();
        const exportPayload = { id:id, title:title, theme:theme, tags:tagsList, summary:summary, sourceUrl:sourceUrl, synonyms:synonymsList };
        el.exportCode.textContent = JSON.stringify(exportPayload, null, 4);
        el.btnCopyJson.textContent = "Copiar";
        switchTab("export");
    });

    el.btnCopyJson.addEventListener("click", function(){
        navigator.clipboard.writeText(el.exportCode.textContent).then(function(){
            el.btnCopyJson.textContent = "Copiado!";
            setTimeout(function(){ el.btnCopyJson.textContent = "Copiar"; }, 2000);
        });
    });

    // Event listeners
    el.searchInput.addEventListener("input", function(e){
        state.query = e.target.value.trim(); renderResults(); renderActiveFilters(); renderSearchHint();
    });
    el.clearTheme.addEventListener("click", function(){ state.selectedTheme=null; render(); });
    el.clearTags.addEventListener("click", function(){ state.selectedTags.clear(); render(); });
    el.resetFilters.addEventListener("click", resetFilters);
    el.btnNewDoc.addEventListener("click", openModal);
    el.modalClose.addEventListener("click", closeModal);
    el.formCancel.addEventListener("click", closeModal);
    el.modalOverlay.addEventListener("click", function(e){ if(e.target===el.modalOverlay) closeModal(); });
    document.addEventListener("keydown", function(e){ if(e.key==="Escape" && !el.modalOverlay.hidden) closeModal(); });
    el.tabBtns.forEach(function(btn){ btn.addEventListener("click", function(){ switchTab(btn.dataset.tab); }); });
    bindChipInput(el.fTagsInput, el.tagsChipBox, formTags);
    bindChipInput(el.fSynonymsInput, el.synonymsChipBox, formSynonyms);

    // Init
    rebuildIndex();
    render();
})();
