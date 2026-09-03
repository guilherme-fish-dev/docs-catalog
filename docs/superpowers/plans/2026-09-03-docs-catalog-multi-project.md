# Catálogo de Documentos Multi-Projeto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-project "Glossário de Documentos" prototype into a generic, multi-project local document catalog with a project switcher and manual JSON export/import for syncing between machines.

**Architecture:** Static HTML/CSS/JS app (no backend, no build step). Two new pure, dependency-injected JS modules (`js/storage.js`, `js/importExport.js`) hold all state logic and are unit-tested with plain Node `assert` (no framework). `app.js` stays the DOM/orchestration layer, wired against those modules. All document data moves out of the static `documents.js` array into per-project `localStorage` namespaces; `documents.js` is kept only as a one-time migration seed and is never read after first load.

**Tech Stack:** Vanilla JS (ES5-style, no build), plain HTML/CSS, Node.js (only for running the unit tests — `node tests/*.test.js`, no test framework dependency).

## Global Constraints

- No backend, no build step, no external dependencies — app must keep working opened directly via `file://`.
- `documents.js` must never be committed to git (already covered by `.gitignore` at `SitesUteis/docs/glossario/.gitignore`); this plan does not touch that file's git status, only its in-file contents.
- All document data (titles, links, tags, summaries) lives only in the browser's `localStorage`, namespaced per project — never in a static file that could accidentally get committed.
- Every doc is fully manageable (add/remove) from the UI now — no more "static vs. locally-added" distinction from the old prototype.
- Sync between machines is manual, via the Export/Import JSON buttons — no network calls, no cloud storage.
- Keep Portuguese (pt-BR) copy consistent with the existing UI's tone and spelling conventions (no accents needed in code strings shown in `alert`/`prompt`, matching the existing codebase's ASCII-only JS string convention — e.g. "nao" not "não" in JS string literals, same as existing code does with "informacoes"/"acao" etc.).

---

### Task 1: `js/storage.js` — project registry + per-project docs storage

**Files:**
- Create: `js/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Produces (used by Task 2 is independent, but Task 5/app.js consumes all of this):
  - `window.DocsCatalogStorage.createStorageApi(storageBackend)` → object with:
    - `getProjects(): Array<{id: string, label: string}>`
    - `createProject(label: string, preferredId?: string): {id: string, label: string}`
    - `renameProject(id: string, newLabel: string): void`
    - `removeProject(id: string): void`
    - `getActiveProjectId(): string | null`
    - `setActiveProjectId(id: string | null): void`
    - `getDocs(projectId: string): Array<Doc>`
    - `saveDocs(projectId: string, docs: Array<Doc>): void`
    - `ensureSeeded(seedProjects: Array<{id,label}>, legacySeedDocs: Array<Doc>): void`
  - `window.DocsCatalogStorage.slugify(text: string): string`
  - `Doc` shape (unchanged from the current prototype): `{id, title, theme, tags: string[], summary, sourceUrl, synonyms: string[]}`
  - `storageBackend` must implement `getItem(key)`, `setItem(key, value)`, `removeItem(key)` (i.e. the `localStorage`/`Storage` interface — a real `localStorage` in the browser, a mock object in tests).

- [ ] **Step 1: Create the folder and write the module**

Create `js/storage.js`:

```js
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DocsCatalogStorage = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var PREFIX = "docscat_v1_";
    var PROJECTS_KEY = PREFIX + "projects";
    var ACTIVE_PROJECT_KEY = PREFIX + "active_project";

    function docsKey(projectId) {
        return PREFIX + "docs_" + projectId;
    }

    function slugify(text) {
        return String(text || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function readJson(storage, key, fallback) {
        var raw = storage.getItem(key);
        if (!raw) return fallback;
        try {
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function writeJson(storage, key, value) {
        storage.setItem(key, JSON.stringify(value));
    }

    function createStorageApi(storage) {
        function getProjects() {
            return readJson(storage, PROJECTS_KEY, []);
        }

        function saveProjects(list) {
            writeJson(storage, PROJECTS_KEY, list);
        }

        function uniqueId(baseId, existingIds) {
            var base = baseId || "projeto";
            var id = base;
            var suffix = 2;
            while (existingIds.indexOf(id) !== -1) {
                id = base + "-" + suffix;
                suffix += 1;
            }
            return id;
        }

        function createProject(label, preferredId) {
            var projects = getProjects();
            var existingIds = projects.map(function (p) { return p.id; });
            var baseId = slugify(preferredId || label);
            var id = uniqueId(baseId, existingIds);
            var project = { id: id, label: label };
            projects.push(project);
            saveProjects(projects);
            if (storage.getItem(docsKey(id)) === null) {
                writeJson(storage, docsKey(id), []);
            }
            return project;
        }

        function renameProject(id, newLabel) {
            var projects = getProjects();
            var found = false;
            projects = projects.map(function (p) {
                if (p.id === id) {
                    found = true;
                    return { id: id, label: newLabel };
                }
                return p;
            });
            if (!found) throw new Error("Projeto nao encontrado: " + id);
            saveProjects(projects);
        }

        function removeProject(id) {
            var projects = getProjects().filter(function (p) { return p.id !== id; });
            saveProjects(projects);
            storage.removeItem(docsKey(id));
            if (getActiveProjectId() === id) {
                setActiveProjectId(projects.length ? projects[0].id : null);
            }
        }

        function getActiveProjectId() {
            return storage.getItem(ACTIVE_PROJECT_KEY) || null;
        }

        function setActiveProjectId(id) {
            if (id === null || id === undefined) {
                storage.removeItem(ACTIVE_PROJECT_KEY);
            } else {
                storage.setItem(ACTIVE_PROJECT_KEY, id);
            }
        }

        function getDocs(projectId) {
            return readJson(storage, docsKey(projectId), []);
        }

        function saveDocs(projectId, docs) {
            writeJson(storage, docsKey(projectId), docs);
        }

        function ensureSeeded(seedProjects, legacySeedDocs) {
            var projects = getProjects();
            if (projects.length === 0 && seedProjects && seedProjects.length) {
                projects = seedProjects.map(function (p) { return { id: p.id, label: p.label }; });
                saveProjects(projects);
            }
            projects.forEach(function (p) {
                if (storage.getItem(docsKey(p.id)) === null) {
                    var seedDocs = p.id === "cliente-exemplo" && legacySeedDocs ? legacySeedDocs : [];
                    saveDocs(p.id, seedDocs);
                }
            });
            if (!getActiveProjectId() && projects.length) {
                setActiveProjectId(projects[0].id);
            }
        }

        return {
            getProjects: getProjects,
            createProject: createProject,
            renameProject: renameProject,
            removeProject: removeProject,
            getActiveProjectId: getActiveProjectId,
            setActiveProjectId: setActiveProjectId,
            getDocs: getDocs,
            saveDocs: saveDocs,
            ensureSeeded: ensureSeeded
        };
    }

    return { createStorageApi: createStorageApi, slugify: slugify };
});
```

- [ ] **Step 2: Write the failing tests first would normally go here — but since this is a straight extraction of new behavior, write the module and its tests together, then run them (this step documents the tests; run them for real in Step 3)**

Create `tests/storage.test.js`:

```js
var assert = require("assert");
var storageModule = require("../js/storage.js");
var createStorageApi = storageModule.createStorageApi;
var slugify = storageModule.slugify;

function makeMockStorage() {
    var data = {};
    return {
        getItem: function (k) {
            return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
        },
        setItem: function (k, v) { data[k] = String(v); },
        removeItem: function (k) { delete data[k]; }
    };
}

function run(name, fn) {
    fn();
    console.log("ok - " + name);
}

run("slugify normalizes accents, spaces and case", function () {
    assert.strictEqual(slugify("Cliente Acao Ltda"), "cliente-acao-ltda");
    assert.strictEqual(slugify("  Multi   Spaces  "), "multi-spaces");
});

run("createProject creates unique ids and empty docs", function () {
    var api = createStorageApi(makeMockStorage());
    var p1 = api.createProject("Cliente X");
    assert.strictEqual(p1.id, "cliente-x");
    assert.deepStrictEqual(api.getDocs(p1.id), []);
    var p2 = api.createProject("Cliente X");
    assert.strictEqual(p2.id, "cliente-x-2");
});

run("createProject respects preferredId without clobbering existing docs", function () {
    var storage = makeMockStorage();
    var api = createStorageApi(storage);
    var p = api.createProject("Projeto Importado", "cliente-exemplo");
    assert.strictEqual(p.id, "cliente-exemplo");
    api.saveDocs("cliente-exemplo", [{ id: "d1" }]);
    // creating again with same preferredId must not wipe existing docs
    api.createProject("Projeto Importado", "cliente-exemplo");
    assert.deepStrictEqual(api.getDocs("cliente-exemplo"), [{ id: "d1" }]);
});

run("renameProject updates label without changing id or docs", function () {
    var api = createStorageApi(makeMockStorage());
    var p = api.createProject("Cliente Y");
    api.saveDocs(p.id, [{ id: "d1" }]);
    api.renameProject(p.id, "Cliente Y Renomeado");
    var projects = api.getProjects();
    assert.strictEqual(projects[0].label, "Cliente Y Renomeado");
    assert.strictEqual(projects[0].id, p.id);
    assert.deepStrictEqual(api.getDocs(p.id), [{ id: "d1" }]);
});

run("renameProject throws for unknown id", function () {
    var api = createStorageApi(makeMockStorage());
    assert.throws(function () { api.renameProject("nao-existe", "X"); });
});

run("removeProject deletes docs and clears active project if it was active", function () {
    var api = createStorageApi(makeMockStorage());
    var p = api.createProject("Cliente Z");
    api.setActiveProjectId(p.id);
    api.removeProject(p.id);
    assert.deepStrictEqual(api.getDocs(p.id), []);
    assert.strictEqual(api.getProjects().length, 0);
    assert.strictEqual(api.getActiveProjectId(), null);
});

run("docs are isolated per project", function () {
    var api = createStorageApi(makeMockStorage());
    var a = api.createProject("A");
    var b = api.createProject("B");
    api.saveDocs(a.id, [{ id: "doc-a" }]);
    api.saveDocs(b.id, [{ id: "doc-b" }]);
    assert.deepStrictEqual(api.getDocs(a.id), [{ id: "doc-a" }]);
    assert.deepStrictEqual(api.getDocs(b.id), [{ id: "doc-b" }]);
});

run("ensureSeeded seeds projects and cliente-exemplo docs once, then is idempotent", function () {
    var api = createStorageApi(makeMockStorage());
    var seedProjects = [{ id: "cliente-exemplo", label: "ClienteExemplo" }];
    var legacyDocs = [{ id: "doc-1", title: "Doc 1" }];

    api.ensureSeeded(seedProjects, legacyDocs);
    assert.deepStrictEqual(api.getProjects(), seedProjects);
    assert.deepStrictEqual(api.getDocs("cliente-exemplo"), legacyDocs);
    assert.strictEqual(api.getActiveProjectId(), "cliente-exemplo");

    // user empties the project's docs, then a reload must not re-seed over that edit
    api.saveDocs("cliente-exemplo", []);
    api.ensureSeeded(seedProjects, legacyDocs);
    assert.deepStrictEqual(api.getDocs("cliente-exemplo"), []);
});

console.log("All storage tests passed.");
```

- [ ] **Step 3: Run the tests**

Run: `node "C:\Users\usuario\Documents\SitesUteis\docs\glossario\tests\storage.test.js"`

Expected: nine `ok - ...` lines followed by `All storage tests passed.`, exit code 0. If any assertion fails, Node prints an `AssertionError` with a stack trace — fix `js/storage.js` until all pass.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\usuario\Documents\SitesUteis\docs\glossario"
git add js/storage.js tests/storage.test.js
git commit -m "feat: add per-project storage module with unit tests"
```

---

### Task 2: `js/importExport.js` — export payload + merge/replace import logic

**Files:**
- Create: `js/importExport.js`
- Test: `tests/importExport.test.js`

**Interfaces:**
- Consumes: `Doc` shape from Task 1 (`{id, title, theme, tags, summary, sourceUrl, synonyms}`); no direct dependency on `storage.js` code, only the shared shape.
- Produces (used by Task 5/app.js):
  - `window.DocsCatalogImportExport.buildExportPayload(project: {id,label}, docs: Array<Doc>): {project: {id,label}, documents: Array<Doc>}`
  - `window.DocsCatalogImportExport.applyImport(existingDocs: Array<Doc>, payload: {project, documents}, mode: "merge" | "replace"): {docs: Array<Doc>, conflicts: string[]}`
    - `mode: "replace"` → returns `payload.documents` verbatim (copy), `conflicts: []`.
    - `mode: "merge"` → keeps every doc in `existingDocs`, appends only incoming docs whose `id` is not already present; ids that collide go into `conflicts` and are **not** overwritten.
    - Throws `Error` if `payload` is missing `project` or `documents` is not an array, or if `mode` is neither `"merge"` nor `"replace"`.

- [ ] **Step 1: Write the module**

Create `js/importExport.js`:

```js
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DocsCatalogImportExport = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function buildExportPayload(project, docs) {
        return {
            project: { id: project.id, label: project.label },
            documents: docs
        };
    }

    function applyImport(existingDocs, payload, mode) {
        if (!payload || !payload.project || !Array.isArray(payload.documents)) {
            throw new Error("Arquivo de importacao invalido.");
        }
        var incoming = payload.documents;
        if (mode === "replace") {
            return { docs: incoming.slice(), conflicts: [] };
        }
        if (mode !== "merge") {
            throw new Error("Modo de importacao invalido: " + mode);
        }
        var existingIds = {};
        existingDocs.forEach(function (d) { existingIds[d.id] = true; });
        var merged = existingDocs.slice();
        var conflicts = [];
        incoming.forEach(function (doc) {
            if (existingIds[doc.id]) {
                conflicts.push(doc.id);
            } else {
                merged.push(doc);
            }
        });
        return { docs: merged, conflicts: conflicts };
    }

    return { buildExportPayload: buildExportPayload, applyImport: applyImport };
});
```

- [ ] **Step 2: Write the tests**

Create `tests/importExport.test.js`:

```js
var assert = require("assert");
var importExport = require("../js/importExport.js");
var buildExportPayload = importExport.buildExportPayload;
var applyImport = importExport.applyImport;

function run(name, fn) {
    fn();
    console.log("ok - " + name);
}

run("buildExportPayload wraps project and docs", function () {
    var payload = buildExportPayload({ id: "p1", label: "Projeto 1" }, [{ id: "d1" }]);
    assert.deepStrictEqual(payload, {
        project: { id: "p1", label: "Projeto 1" },
        documents: [{ id: "d1" }]
    });
});

run("applyImport replace overwrites existing docs entirely", function () {
    var result = applyImport(
        [{ id: "old" }],
        { project: { id: "p1", label: "P1" }, documents: [{ id: "new" }] },
        "replace"
    );
    assert.deepStrictEqual(result, { docs: [{ id: "new" }], conflicts: [] });
});

run("applyImport merge adds new docs and reports id conflicts without overwriting", function () {
    var existing = [{ id: "d1", title: "Existing" }];
    var incoming = {
        project: { id: "p1", label: "P1" },
        documents: [{ id: "d1", title: "From file" }, { id: "d2", title: "New" }]
    };
    var result = applyImport(existing, incoming, "merge");
    assert.deepStrictEqual(result.docs, [{ id: "d1", title: "Existing" }, { id: "d2", title: "New" }]);
    assert.deepStrictEqual(result.conflicts, ["d1"]);
});

run("applyImport throws on payload missing project or documents", function () {
    assert.throws(function () { applyImport([], {}, "merge"); });
    assert.throws(function () { applyImport([], { project: { id: "p1", label: "P1" } }, "merge"); });
});

run("applyImport throws on invalid mode", function () {
    assert.throws(function () {
        applyImport([], { project: { id: "p1", label: "P1" }, documents: [] }, "bogus");
    });
});

console.log("All importExport tests passed.");
```

- [ ] **Step 3: Run the tests**

Run: `node "C:\Users\usuario\Documents\SitesUteis\docs\glossario\tests\importExport.test.js"`

Expected: five `ok - ...` lines, then `All importExport tests passed.`, exit code 0.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\usuario\Documents\SitesUteis\docs\glossario"
git add js/importExport.js tests/importExport.test.js
git commit -m "feat: add import/export payload logic with unit tests"
```

---

### Task 3: Seed files — `projects.config.js` and renamed legacy seed in `documents.js`

**Files:**
- Create: `projects.config.js`
- Modify: `documents.js` (local-only file, gitignored — never touches git)

**Interfaces:**
- Produces: `window.PROJECTS_SEED: Array<{id: string, label: string}>` (consumed by Task 5's `storageApi.ensureSeeded` call).
- Produces: `window.LEGACY_SEED_DOCUMENTS: Array<Doc>` (consumed the same way, only used once per browser profile).

- [ ] **Step 1: Create `projects.config.js`**

```js
window.PROJECTS_SEED = [
    { id: "cliente-exemplo", label: "ClienteExemplo" }
];
```

- [ ] **Step 2: Rename the legacy global in `documents.js`**

`documents.js` currently starts with:

```js
window.GLOSSARY_DOCUMENTS = [
```

Change the first line to:

```js
window.LEGACY_SEED_DOCUMENTS = [
```

Leave the rest of the file (the two existing document entries) untouched — this is purely a rename of the exposed global variable, no data changes.

- [ ] **Step 3: Verify the rename**

Run: `grep -n "window\." "C:\Users\usuario\Documents\SitesUteis\docs\glossario\documents.js"`

Expected: `1:window.LEGACY_SEED_DOCUMENTS = [`

- [ ] **Step 4: Commit (only the new seed file — `documents.js` stays gitignored)**

```bash
cd "C:\Users\usuario\Documents\SitesUteis\docs\glossario"
git add projects.config.js
git status
```

Confirm the `git status` output does **not** list `documents.js` as a tracked change before committing (it must show as ignored/untracked-and-ignored, not staged). Then:

```bash
git commit -m "feat: add project seed config"
```

---

### Task 4: `index.html` — project bar, drop the old export-JSON tab, rebrand copy

**Files:**
- Modify: `index.html`

**Interfaces:**
- Produces the following element ids, consumed by Task 5's `el` map in `app.js`: `project-select`, `btn-new-project`, `btn-rename-project`, `btn-remove-project`, `btn-export-project`, `btn-import-project`, `import-file-input`.
- Removes element ids `btn-copy-json`, `export-code`, `tab-export`, and the `.tab-btn`/`.modal-tabs` markup — Task 5's `app.js` must not reference them any more.

- [ ] **Step 1: Rebrand the `<title>`**

Old:
```html
    <title>Glossario de Documentos</title>
```
New:
```html
    <title>Catalogo de Documentos</title>
```

- [ ] **Step 2: Rebrand the hero heading and add the project bar right after it**

Old:
```html
        <header class="hero">
            <p class="eyebrow">Portal interno</p>
            <h1>Glossario de documentos</h1>
            <p class="hero-copy">
                Navegue por tema, filtre por tags e pesquise por termos relacionados. A busca usa texto,
                sinonimos e um ranking vetorial leve para ordenar melhor os resultados.
            </p>
        </header>
```
New:
```html
        <header class="hero">
            <p class="eyebrow">Portal interno</p>
            <h1>Catalogo de documentos</h1>
            <p class="hero-copy">
                Navegue por tema, filtre por tags e pesquise por termos relacionados. A busca usa texto,
                sinonimos e um ranking vetorial leve para ordenar melhor os resultados.
            </p>
        </header>

        <section class="project-bar panel" aria-label="Selecao de projeto">
            <div class="project-bar-field">
                <label for="project-select">Projeto</label>
                <select id="project-select"></select>
            </div>
            <div class="project-bar-actions">
                <button id="btn-new-project" class="secondary-button" type="button">+ Novo projeto</button>
                <button id="btn-rename-project" class="ghost-button" type="button">Renomear</button>
                <button id="btn-remove-project" class="danger-button" type="button">Remover</button>
                <span class="project-bar-divider" aria-hidden="true"></span>
                <button id="btn-export-project" class="secondary-button" type="button">Exportar JSON</button>
                <button id="btn-import-project" class="secondary-button" type="button">Importar JSON</button>
                <input id="import-file-input" type="file" accept="application/json" hidden>
            </div>
        </section>
```

- [ ] **Step 3: Remove the modal tabs header**

Old:
```html
            <div class="modal-tabs" role="tablist">
                <button class="tab-btn is-active" data-tab="form" type="button" role="tab">Formulario</button>
                <button class="tab-btn" data-tab="export" type="button" role="tab">Exportar JSON</button>
            </div>

            <div id="tab-form" class="tab-content">
```
New:
```html
            <div id="tab-form" class="tab-content">
```

- [ ] **Step 4: Remove the export-JSON tab content block entirely**

Delete this whole block (it directly follows the closing `</form>` and `</div>` of `tab-form`):

```html
            <div id="tab-export" class="tab-content" hidden>
                <p class="export-instruction">
                    Documento salvo localmente. Para fixar permanentemente, copie o objeto abaixo e adicione ao array em
                    <code>documents.js</code>.
                </p>
                <div class="code-block-wrap">
                    <button id="btn-copy-json" class="secondary-button copy-btn" type="button">Copiar</button>
                    <pre id="export-code" class="code-block"></pre>
                </div>
            </div>
```

Result: nothing replaces it — delete the block, leaving `tab-form`'s closing `</div>` followed directly by the modal panel's closing `</div>`.

- [ ] **Step 5: Add the new script includes before `documents.js`/`app.js`**

Old:
```html
    <script src="./documents.js"></script>
    <script src="./app.js"></script>
```
New:
```html
    <script src="./js/storage.js"></script>
    <script src="./js/importExport.js"></script>
    <script src="./projects.config.js"></script>
    <script src="./documents.js"></script>
    <script src="./app.js"></script>
```

Note: on a machine where `documents.js` doesn't exist yet (fresh clone — it's gitignored), that one `<script>` tag fails to load (404 or file-not-found) and the browser console shows an error for it, but every other script tag still loads and runs normally — this is expected and harmless.

- [ ] **Step 6: Open the file in a browser and sanity-check it loads without new console errors**

Run: open `C:\Users\usuario\Documents\SitesUteis\docs\glossario\index.html` directly in a browser (double-click it, or `start` it from a terminal).

Expected: the page renders the hero + a project bar with an empty-looking select (this is expected — `app.js` hasn't been updated yet in this task, so nothing wires the new elements up; do not worry about non-functional buttons yet, just confirm no HTML parse errors and the existing search/filter panel below still renders).

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\usuario\Documents\SitesUteis\docs\glossario"
git add index.html
git commit -m "feat: add project bar markup, drop legacy export-JSON tab, rebrand copy"
```

---

### Task 5: `app.js` — wire storage, import/export and the project switcher

**Files:**
- Modify: `app.js` (full rewrite of the file's contents)

**Interfaces:**
- Consumes: `window.DocsCatalogStorage.createStorageApi`/`.slugify` (Task 1), `window.DocsCatalogImportExport.buildExportPayload`/`.applyImport` (Task 2), `window.PROJECTS_SEED` (Task 3), `window.LEGACY_SEED_DOCUMENTS` (Task 3, may be `undefined` on a fresh clone), and the element ids from Task 4.
- Produces: no new globals — this is the top-level IIFE that wires everything to the DOM. Behavior change from the old prototype: **every** document card now has a "Remover" button (no more static-vs-local distinction, since all docs now live in editable per-project storage); adding a document via the "+ Cadastrar" modal closes the modal immediately after saving instead of switching to an export tab (that tab no longer exists — Task 4 removed it).

- [ ] **Step 1: Replace the full contents of `app.js`**

```js
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
        return Object.assign({}, doc, {
            normalizedTheme: normalizeText(doc.theme),
            normalizedTags: doc.tags.map(normalizeText),
            searchableText: normalizeText([doc.title, doc.theme, doc.tags.join(" "), doc.summary, (doc.synonyms || []).join(" ")].join(" ")),
            weightedBag: buildWeightedBag(doc)
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
        formError: document.getElementById("form-error")
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
            var alreadyExists = projects.some(function (p) { return p.id === payload.project.id; });
            if (!alreadyExists) {
                storageApi.createProject(payload.project.label || payload.project.id, payload.project.id);
            }
            var merge = window.confirm("Mesclar com os documentos existentes do projeto?\nOK = mesclar (mantem os locais em caso de conflito de id)\nCancelar = substituir tudo pelo arquivo importado");
            var existingDocs = storageApi.getDocs(payload.project.id);
            var result;
            try {
                result = applyImport(existingDocs, payload, merge ? "merge" : "replace");
            } catch (err) {
                window.alert("Nao foi possivel importar: " + err.message);
                return;
            }
            storageApi.saveDocs(payload.project.id, result.docs);
            if (result.conflicts.length) {
                window.alert(result.conflicts.length + " documento(s) ignorado(s) por conflito de id: " + result.conflicts.join(", "));
            }
            renderProjectSelect();
            switchToProject(payload.project.id);
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

    function createCard(doc) {
        var article = document.createElement("article");
        article.className = "doc-card";
        var tagsMarkup = doc.tags.map(function (t) { return '<span class="tag-pill">' + escapeHtml(t) + '</span>'; }).join("");
        article.innerHTML = [
            '<div class="card-head">',
            '  <div><p class="eyebrow">' + escapeHtml(doc.theme) + '</p><h3 class="card-title">' + escapeHtml(doc.title) + '</h3></div>',
            '  <div class="card-badges"><span class="score-badge">Relevancia ' + Math.max(doc.score, 0).toFixed(2) + '</span></div>',
            '</div>',
            '<p class="doc-summary">' + escapeHtml(doc.summary) + '</p>',
            '<div class="doc-meta"><div class="meta-line"><span class="meta-label">Tema</span><strong>' + escapeHtml(doc.theme) + '</strong></div></div>',
            '<div class="tag-row">' + tagsMarkup + '</div>',
            '<div class="doc-actions"><a class="primary-link" href="' + escapeHtml(doc.sourceUrl) + '" target="_blank" rel="noreferrer">Abrir documento</a> <button class="danger-button delete-btn" type="button" data-id="' + escapeHtml(doc.id) + '">Remover</button></div>'
        ].join("\n");
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

    // Chip inputs
    function renderChips(box, input, chipSet) {
        Array.from(box.querySelectorAll(".form-chip")).forEach(function (c) { c.remove(); });
        chipSet.forEach(function (value) {
            var chip = document.createElement("span");
            chip.className = "form-chip";
            chip.innerHTML = escapeHtml(value) + '<button type="button" aria-label="Remover ' + escapeHtml(value) + '">\u00d7</button>';
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
    storageApi.ensureSeeded(window.PROJECTS_SEED || [], window.LEGACY_SEED_DOCUMENTS || []);
    state.activeProjectId = storageApi.getActiveProjectId();
    rebuildIndex();
    render();
})();
```

- [ ] **Step 2: Manual smoke test in the browser**

Run: open (or reload) `C:\Users\usuario\Documents\SitesUteis\docs\glossario\index.html`.

Expected, in order:
1. Project select shows "ClienteExemplo" already selected.
2. Results list shows the 2 migrated documents (Contrato de Locacao, Implementação W3).
3. Opening DevTools → Application → Local Storage shows keys `docscat_v1_projects`, `docscat_v1_active_project`, `docscat_v1_docs_cliente-exemplo`.
4. Click "+ Novo projeto", type "Teste", confirm the select switches to "Teste" and the results list is empty with the "Nenhum documento encontrado" state replaced by the "Nenhum projeto cadastrado" text — wait, it should show the *documents* empty state (project exists, just no docs) — confirm the exact message reads "Nenhum documento encontrado com os filtros atuais."
5. Click "+ Cadastrar", fill the form, save — confirm the modal closes and the new doc appears with a working "Remover" button.
6. Switch back to "ClienteExemplo" via the select — confirm the "Teste" project's doc does not appear (isolation).
7. Click "Exportar JSON" on "ClienteExemplo" — confirm a `cliente-exemplo-export-<date>.json` file downloads with `project` + `documents`.
8. Click "Remover" on the "Teste" project (after switching to it) — confirm it disappears from the select and the active project falls back to the remaining one.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\usuario\Documents\SitesUteis\docs\glossario"
git add app.js
git commit -m "feat: wire multi-project storage, switcher and import/export into app.js"
```

---

### Task 6: `styles.css` — project bar styling + cleanup of dead rules

**Files:**
- Modify: `styles.css`

**Interfaces:** none (pure presentation, no JS-visible interface).

- [ ] **Step 1: Add project bar styles**

Insert after the `/* ── Danger / delete button ── */` block (i.e. right before `/* ── FAB button ── */`):

```css
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

- [ ] **Step 2: Add the responsive rule for the project bar**

Old:
```css
@media (max-width: 640px) {
    .page-shell {
        padding: 18px 14px 60px;
    }
```
New:
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
```

- [ ] **Step 3: Remove now-dead rules for the removed local-badge and export-tab UI**

Delete this block (no longer used — Task 5's `createCard` never sets `.is-local` or a local badge any more):

```css
.local-badge {
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    background: rgba(217, 117, 50, 0.18);
    color: #8f4817;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.04em;
}

.doc-card.is-local {
    border-color: rgba(217, 117, 50, 0.22);
}
```

Delete this block (the export-JSON tab it styled was removed in Task 4):

```css
/* ── Export tab ───────────────────────────────────────────────────────────── */

.export-instruction {
    color: var(--muted);
    line-height: 1.65;
    margin: 0 0 16px;
    font-size: 0.95rem;
}

.export-instruction code {
    background: rgba(0, 0, 0, 0.06);
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 0.92rem;
}

.code-block-wrap {
    position: relative;
}

.copy-btn {
    position: absolute;
    top: 12px;
    right: 12px;
}

.code-block {
    display: block;
    padding: 16px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: #f4efe7;
    font-family: "IBM Plex Mono", "Courier New", monospace;
    font-size: 0.86rem;
    line-height: 1.55;
    overflow-x: auto;
    white-space: pre;
    margin: 0;
    color: var(--text);
}
```

- [ ] **Step 4: Also remove the `/* ── Tabs ── */` block (`.modal-tabs`, `.tab-btn`, `.tab-btn.is-active`, `.tab-content`)**

Delete:
```css
/* ── Tabs ─────────────────────────────────────────────────────────────────── */

.modal-tabs {
    display: flex;
    gap: 4px;
    padding: 16px 24px 0;
    border-bottom: 1px solid var(--line);
}

.tab-btn {
    appearance: none;
    border: 0;
    background: transparent;
    padding: 10px 16px;
    color: var(--muted);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 140ms ease, border-color 140ms ease;
}

.tab-btn.is-active {
    color: var(--primary);
    border-bottom-color: var(--primary);
}

.tab-content {
    padding: 24px;
    flex: 1;
    overflow-y: auto;
}
```

Replace it with just:
```css
.tab-content {
    padding: 24px;
    flex: 1;
    overflow-y: auto;
}
```

(`.tab-content` is still used by the remaining `#tab-form` element in `index.html`, so keep that one rule — only the tab-button styling goes away.)

- [ ] **Step 5: Reload the page and confirm styling looks right**

Run: reload `index.html` in the browser.

Expected: project bar renders as a rounded panel matching the existing visual style (same border/shadow as `.panel`), buttons use the existing button styles, no visual regression on the doc cards or the cadastro modal (which now shows only the form, no tab strip).

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\usuario\Documents\SitesUteis\docs\glossario"
git add styles.css
git commit -m "style: add project bar styles, remove dead export-tab and local-badge CSS"
```

---

### Task 7: Final manual verification pass + push

**Files:** none (verification only).

- [ ] **Step 1: Run both unit test files together**

Run:
```bash
node "C:\Users\usuario\Documents\SitesUteis\docs\glossario\tests\storage.test.js" && node "C:\Users\usuario\Documents\SitesUteis\docs\glossario\tests\importExport.test.js"
```
Expected: both files print their `ok - ...` lines and final `All ... tests passed.`, combined exit code 0.

- [ ] **Step 2: Clear localStorage and verify first-run migration end to end**

In the browser DevTools console (with `index.html` open), run:
```js
localStorage.clear(); location.reload();
```
Expected: after reload, "ClienteExemplo" is the only project, selected by default, showing the 2 migrated documents — matching the spec's "Primeira carga" verification item.

- [ ] **Step 3: Walk the full manual checklist from the design spec**

Confirm each item from `docs/superpowers/specs/2026-09-03-docs-catalog-design.md`'s "Testes / verificação manual" section:
- [ ] Criar projeto novo vazio, cadastrar doc nele, confirmar isolamento.
- [ ] Exportar projeto, limpar localStorage, importar — dados voltam idênticos (use "substituir" on import into the now-empty project).
- [ ] Importar arquivo com `id` de documento já existente localmente — merge não sobrescreve (confirm the `alert` reports the conflicting id), replace sobrescreve.
- [ ] Remover projeto — confirma que os dados somem do localStorage (check DevTools → Application → Local Storage: the `docscat_v1_docs_<id>` key is gone).

- [ ] **Step 4: Push everything to the remote**

```bash
cd "C:\Users\usuario\Documents\SitesUteis\docs\glossario"
git status
git push
```
Expected: `git status` shows a clean tree except for the gitignored `documents.js`; `git push` succeeds against `https://github.com/guilherme-fish-dev/docs-catalog`.

- [ ] **Step 5: Update the spec's status line**

In `docs/superpowers/specs/2026-09-03-docs-catalog-design.md`, change:
```
Status: Aprovado (aguardando plano de implementação)
```
to:
```
Status: Implementado (2026-09-03)
```
Then:
```bash
git add docs/superpowers/specs/2026-09-03-docs-catalog-design.md
git commit -m "docs: mark docs-catalog multi-project spec as implemented"
git push
```
