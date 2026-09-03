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
    var p = api.createProject("Projeto Importado", "projeto-1");
    assert.strictEqual(p.id, "projeto-1");
    api.saveDocs("projeto-1", [{ id: "d1" }]);
    // creating again with same preferredId must not wipe existing docs
    api.createProject("Projeto Importado", "projeto-1");
    assert.deepStrictEqual(api.getDocs("projeto-1"), [{ id: "d1" }]);
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

run("ensureSeeded seeds projects and projeto-1 docs once, then is idempotent", function () {
    var api = createStorageApi(makeMockStorage());
    var seedProjects = [{ id: "projeto-1", label: "Projeto 1" }];
    var legacyDocs = [{ id: "doc-1", title: "Doc 1" }];

    api.ensureSeeded(seedProjects, legacyDocs);
    assert.deepStrictEqual(api.getProjects(), seedProjects);
    assert.deepStrictEqual(api.getDocs("projeto-1"), legacyDocs);
    assert.strictEqual(api.getActiveProjectId(), "projeto-1");

    // user empties the project's docs, then a reload must not re-seed over that edit
    api.saveDocs("projeto-1", []);
    api.ensureSeeded(seedProjects, legacyDocs);
    assert.deepStrictEqual(api.getDocs("projeto-1"), []);
});

console.log("All storage tests passed.");
