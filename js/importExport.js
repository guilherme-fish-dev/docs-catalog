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

    function isValidDoc(doc) {
        return !!doc && typeof doc.id === "string" && !!doc.id && typeof doc.title === "string" && Array.isArray(doc.tags);
    }

    function rejectionLabel(doc) {
        if (doc && typeof doc.id === "string" && doc.id) return doc.id;
        try {
            return JSON.stringify(doc).slice(0, 40);
        } catch (e) {
            return String(doc).slice(0, 40);
        }
    }

    function applyImport(existingDocs, payload, mode) {
        if (!payload || !payload.project || !Array.isArray(payload.documents)) {
            throw new Error("Arquivo de importacao invalido.");
        }
        var incoming = payload.documents;
        if (mode === "replace") {
            var docs = [];
            var rejectedReplace = [];
            incoming.forEach(function (doc) {
                if (isValidDoc(doc)) {
                    docs.push(doc);
                } else {
                    rejectedReplace.push(rejectionLabel(doc));
                }
            });
            return { docs: docs, conflicts: [], rejected: rejectedReplace };
        }
        if (mode !== "merge") {
            throw new Error("Modo de importacao invalido: " + mode);
        }
        var existingIds = {};
        existingDocs.forEach(function (d) { existingIds[d.id] = true; });
        var merged = existingDocs.slice();
        var conflicts = [];
        var rejected = [];
        incoming.forEach(function (doc) {
            if (!isValidDoc(doc)) {
                rejected.push(rejectionLabel(doc));
            } else if (existingIds[doc.id]) {
                conflicts.push(doc.id);
            } else {
                merged.push(doc);
                existingIds[doc.id] = true;
            }
        });
        return { docs: merged, conflicts: conflicts, rejected: rejected };
    }

    return { buildExportPayload: buildExportPayload, applyImport: applyImport };
});
