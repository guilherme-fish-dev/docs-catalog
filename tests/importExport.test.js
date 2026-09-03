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
        { project: { id: "p1", label: "P1" }, documents: [{ id: "new", title: "New", tags: [] }] },
        "replace"
    );
    assert.deepStrictEqual(result, { docs: [{ id: "new", title: "New", tags: [] }], conflicts: [], rejected: [] });
});

run("applyImport merge adds new docs and reports id conflicts without overwriting", function () {
    var existing = [{ id: "d1", title: "Existing", tags: [] }];
    var incoming = {
        project: { id: "p1", label: "P1" },
        documents: [
            { id: "d1", title: "From file", tags: [] },
            { id: "d2", title: "New", tags: [] }
        ]
    };
    var result = applyImport(existing, incoming, "merge");
    assert.deepStrictEqual(result.docs, [
        { id: "d1", title: "Existing", tags: [] },
        { id: "d2", title: "New", tags: [] }
    ]);
    assert.deepStrictEqual(result.conflicts, ["d1"]);
    assert.deepStrictEqual(result.rejected, []);
});

run("applyImport replace rejects invalid docs (missing tags) and excludes them from docs", function () {
    var incoming = {
        project: { id: "p1", label: "P1" },
        documents: [
            { id: "valid", title: "Valid", tags: ["a"] },
            { id: "invalid-no-tags", title: "No tags" }
        ]
    };
    var result = applyImport([], incoming, "replace");
    assert.deepStrictEqual(result.docs, [{ id: "valid", title: "Valid", tags: ["a"] }]);
    assert.deepStrictEqual(result.rejected, ["invalid-no-tags"]);
});

run("applyImport merge rejects invalid docs (missing tags) and excludes them from docs", function () {
    var existing = [];
    var incoming = {
        project: { id: "p1", label: "P1" },
        documents: [
            { id: "valid", title: "Valid", tags: ["a"] },
            { id: "invalid-no-tags", title: "No tags" }
        ]
    };
    var result = applyImport(existing, incoming, "merge");
    assert.deepStrictEqual(result.docs, [{ id: "valid", title: "Valid", tags: ["a"] }]);
    assert.deepStrictEqual(result.conflicts, []);
    assert.deepStrictEqual(result.rejected, ["invalid-no-tags"]);
});

run("applyImport merge treats a duplicate id within the same payload as a conflict", function () {
    var existing = [];
    var incoming = {
        project: { id: "p1", label: "P1" },
        documents: [
            { id: "dup", title: "First", tags: [] },
            { id: "dup", title: "Second", tags: [] }
        ]
    };
    var result = applyImport(existing, incoming, "merge");
    assert.deepStrictEqual(result.docs, [{ id: "dup", title: "First", tags: [] }]);
    assert.deepStrictEqual(result.conflicts, ["dup"]);
    assert.deepStrictEqual(result.rejected, []);
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
