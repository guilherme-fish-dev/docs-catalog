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
