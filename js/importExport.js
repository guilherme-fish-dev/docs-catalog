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
