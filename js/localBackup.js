(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DocsCatalogLocalBackup = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    // Constroi um snapshot completo (todos os projetos + documentos) a partir
    // da storageApi. Puro: nao toca em File System Access nem em DOM, so em
    // dados ja lidos do storageApi, pra poder ser testado com node.
    function buildFullSnapshot(storageApi) {
        var projects = storageApi.getProjects();
        var docsByProject = {};
        projects.forEach(function (p) {
            docsByProject[p.id] = storageApi.getDocs(p.id);
        });
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            projects: projects,
            docsByProject: docsByProject
        };
    }

    function isValidSnapshot(snapshot) {
        return !!snapshot
            && Array.isArray(snapshot.projects)
            && !!snapshot.docsByProject
            && typeof snapshot.docsByProject === "object";
    }

    // Aplica um snapshot de volta na storageApi: cria projetos que faltarem e
    // sobrescreve os documentos de cada projeto presente no snapshot. Nao mexe
    // em projetos locais que nao estao no snapshot. Retorna um resumo do que
    // foi escrito, ou lanca erro se o snapshot tiver formato invalido.
    function restoreFullSnapshot(storageApi, snapshot) {
        if (!isValidSnapshot(snapshot)) {
            throw new Error("Arquivo de backup invalido.");
        }
        var existingProjects = storageApi.getProjects();
        var existingIds = {};
        existingProjects.forEach(function (p) { existingIds[p.id] = true; });

        var projectsWritten = 0;
        var docsWritten = 0;

        snapshot.projects.forEach(function (p) {
            if (!p || typeof p.id !== "string" || !p.id) return;
            if (!existingIds[p.id]) {
                storageApi.createProject(p.label || p.id, p.id);
                existingIds[p.id] = true;
                projectsWritten += 1;
            }
            var docs = Array.isArray(snapshot.docsByProject[p.id]) ? snapshot.docsByProject[p.id] : [];
            storageApi.saveDocs(p.id, docs);
            docsWritten += docs.length;
        });

        return { projectsWritten: projectsWritten, docsWritten: docsWritten };
    }

    return {
        buildFullSnapshot: buildFullSnapshot,
        restoreFullSnapshot: restoreFullSnapshot,
        isValidSnapshot: isValidSnapshot
    };
});
