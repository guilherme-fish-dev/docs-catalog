var assert = require("assert");
var storageModule = require("../js/storage.js");
var createStorageApi = storageModule.createStorageApi;
var localBackup = require("../js/localBackup.js");
var buildFullSnapshot = localBackup.buildFullSnapshot;
var restoreFullSnapshot = localBackup.restoreFullSnapshot;
var isValidSnapshot = localBackup.isValidSnapshot;

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

run("buildFullSnapshot captures every project and its docs", function () {
    var api = createStorageApi(makeMockStorage());
    var p1 = api.createProject("Cliente X");
    var p2 = api.createProject("Cliente Y");
    api.saveDocs(p1.id, [{ id: "d1" }]);
    api.saveDocs(p2.id, [{ id: "d2" }, { id: "d3" }]);

    var snapshot = buildFullSnapshot(api);
    assert.strictEqual(snapshot.version, 1);
    assert.deepStrictEqual(snapshot.projects, [p1, p2]);
    assert.deepStrictEqual(snapshot.docsByProject, {
        "cliente-x": [{ id: "d1" }],
        "cliente-y": [{ id: "d2" }, { id: "d3" }]
    });
});

run("isValidSnapshot rejects malformed payloads", function () {
    assert.strictEqual(isValidSnapshot(null), false);
    assert.strictEqual(isValidSnapshot({}), false);
    assert.strictEqual(isValidSnapshot({ projects: [] }), false);
    assert.strictEqual(isValidSnapshot({ projects: [], docsByProject: {} }), true);
});

run("restoreFullSnapshot recreates missing projects and overwrites their docs", function () {
    var api = createStorageApi(makeMockStorage());
    var snapshot = {
        version: 1,
        projects: [{ id: "cliente-x", label: "Cliente X" }],
        docsByProject: { "cliente-x": [{ id: "d1" }, { id: "d2" }] }
    };
    var summary = restoreFullSnapshot(api, snapshot);
    assert.strictEqual(summary.projectsWritten, 1);
    assert.strictEqual(summary.docsWritten, 2);
    assert.deepStrictEqual(api.getDocs("cliente-x"), [{ id: "d1" }, { id: "d2" }]);
});

run("restoreFullSnapshot overwrites docs of a project that already exists locally", function () {
    var api = createStorageApi(makeMockStorage());
    api.createProject("Cliente X", "cliente-x");
    api.saveDocs("cliente-x", [{ id: "stale" }]);

    var snapshot = {
        version: 1,
        projects: [{ id: "cliente-x", label: "Cliente X" }],
        docsByProject: { "cliente-x": [{ id: "fresh" }] }
    };
    var summary = restoreFullSnapshot(api, snapshot);
    assert.strictEqual(summary.projectsWritten, 0);
    assert.deepStrictEqual(api.getDocs("cliente-x"), [{ id: "fresh" }]);
});

run("restoreFullSnapshot does not touch local projects absent from the snapshot", function () {
    var api = createStorageApi(makeMockStorage());
    api.createProject("So Local", "so-local");
    api.saveDocs("so-local", [{ id: "keep-me" }]);

    var snapshot = { version: 1, projects: [], docsByProject: {} };
    restoreFullSnapshot(api, snapshot);
    assert.deepStrictEqual(api.getDocs("so-local"), [{ id: "keep-me" }]);
});

run("restoreFullSnapshot throws on invalid snapshot", function () {
    var api = createStorageApi(makeMockStorage());
    assert.throws(function () { restoreFullSnapshot(api, { projects: [] }); });
    assert.throws(function () { restoreFullSnapshot(api, null); });
});

console.log("All localBackup tests passed.");
