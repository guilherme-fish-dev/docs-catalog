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
            .replace(/[̀-ͯ]/g, "")
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
                    var seedDocs = p.id === "quintoandar" && legacySeedDocs ? legacySeedDocs : [];
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
