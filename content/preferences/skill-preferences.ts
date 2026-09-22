/** Per-skill defaults and explicit overrides. Gameplay fields and their meaning belong to each definition. */
namespace SkillPreferences {
    export interface ObjectValue { [key: string]: any; }
    export type Individual = string | null;
    export type Layer = "global" | "individual";
    export interface Definition {
        version: number;
        defaults: ObjectValue;
        /** Receives a detached complete value; return the validated, normalized complete configuration. */
        normalize(value: ObjectValue): ObjectValue;
        /** Resolves an explicit patch against a complete base; arrays replace in the default merge. */
        merge?(base: ObjectValue, patch: ObjectValue, layer: Layer): ObjectValue;
        /** Migrate only the explicit old patch to this version, preserving inheritance. */
        migrate?(fromVersion: number, patch: ObjectValue, layer: Layer): ObjectValue;
    }
    export interface Storage {
        read(skill: string, individual: Individual): string | null;
        write(skill: string, individual: Individual, json: string | null): void;
    }
    export interface Inspection {
        version: number; defaults: ObjectValue; global: ObjectValue;
        overrides: ObjectValue; effective: ObjectValue;
    }
    interface Entry { id: string; definition: Definition; }
    interface Loaded { present: boolean; patch: ObjectValue; }
    function plain(value: any): boolean {
        if (value === null || typeof value !== "object" || Object.prototype.toString.call(value) !== "[object Object]") return false;
        var prototype = Object.getPrototypeOf(value);
        return prototype === null || Object.getPrototypeOf(prototype) === null;
    }
    function safeKey(key: string): void {
        if (key === "__proto__" || key === "prototype" || key === "constructor")
            throw new Error("Unsafe preference property: " + key);
    }
    function own(value: ObjectValue, key: string): boolean { return Object.prototype.hasOwnProperty.call(value, key); }
    /** Clone JSON values without invoking getters, toJSON or inherited properties. */
    function copy(value: any, parents: any[] = []): any {
        if (value === null || typeof value === "string" || typeof value === "boolean") return value;
        if (typeof value === "number") {
            if (!isFinite(value)) throw new Error("Preferences require finite numbers");
            return value;
        }
        if (!Array.isArray(value) && !plain(value)) throw new Error("Preferences require plain JSON values");
        if (parents.indexOf(value) >= 0) throw new Error("Cyclic preference value");
        if (parents.length >= 128) throw new Error("Preference value is too deeply nested");
        var chain = parents.concat([value]);
        if (Array.isArray(value)) {
            var array: any[] = [];
            for (var i = 0; i < value.length; i++) {
                var item = Object.getOwnPropertyDescriptor(value, String(i));
                if (!item || item.get || item.set) throw new Error("Preference arrays require explicit JSON elements");
                array.push(copy(item.value, chain));
            }
            Object.keys(value).forEach(function (key) {
                safeKey(key);
                if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length)
                    throw new Error("Preference arrays cannot carry named properties");
            });
            return array;
        }
        var result: ObjectValue = {};
        Object.keys(value).forEach(function (key) {
            safeKey(key);
            var property = Object.getOwnPropertyDescriptor(value, key)!;
            if (property.get || property.set) throw new Error("Preference values cannot contain accessors");
            result[key] = copy(property.value, chain);
        });
        return result;
    }
    function object(value: any): ObjectValue {
        if (!plain(value)) throw new Error("A skill preference definition or patch must be an object");
        return copy(value);
    }
    /** Merge explicit fields; null is a value and a nested object preserves untouched inherited fields. */
    function overlay(base: ObjectValue, patch: ObjectValue): ObjectValue {
        var result = object(base);
        Object.keys(patch).forEach(function (key) {
            safeKey(key);
            result[key] = plain(patch[key]) && plain(result[key]) ? overlay(result[key], patch[key]) : copy(patch[key]);
        });
        return result;
    }
    function scope(individual: Individual): Layer {
        if (individual !== null && (typeof individual !== "string" || !individual))
            throw new Error("A preference individual must be a stable nonempty id or null for this skill's global layer");
        return individual === null ? "global" : "individual";
    }
    function normalized(definition: Definition, value: ObjectValue): ObjectValue {
        return object(definition.normalize(object(value)));
    }
    function resolved(definition: Definition, base: ObjectValue, loaded: Loaded, layer: Layer): ObjectValue {
        if (!loaded.present) return object(base);
        var merged = definition.merge ? definition.merge(object(base), object(loaded.patch), layer) : overlay(base, loaded.patch);
        return normalized(definition, object(merged));
    }
    function removePath(value: ObjectValue, path: string[], index: number): boolean {
        var key = path[index];
        if (!own(value, key)) return false;
        if (index === path.length - 1) { delete value[key]; return true; }
        else if (plain(value[key])) {
            var changed = removePath(value[key], path, index + 1);
            if (changed && !Object.keys(value[key]).length) delete value[key];
            return changed;
        }
        return false;
    }
    export class Registry {
        private definitions: Entry[] = [];
        /** A skill can assemble its independently authored preference sections before play begins. */
        extendDefaults(id: string, patch: ObjectValue): ObjectValue {
            var definition = this.definition(id);
            definition.defaults = normalized(definition, overlay(definition.defaults, patch));
            return object(definition.defaults);
        }
        define(id: string, definition: Definition): void {
            if (typeof id !== "string" || !id) throw new Error("A skill preference definition needs an id");
            if (this.definitions.some(function (entry) { return entry.id === id; })) throw new Error("Duplicate skill preference definition: " + id);
            if (!definition || !isFinite(definition.version) || definition.version < 1 || Math.floor(definition.version) !== definition.version)
                throw new Error("A skill preference version must be a positive integer");
            if (typeof definition.normalize !== "function" || definition.merge !== undefined && typeof definition.merge !== "function"
                || definition.migrate !== undefined && typeof definition.migrate !== "function") throw new Error("Invalid skill preference callbacks");
            var stored: Definition = { version: definition.version, defaults: object(definition.defaults),
                normalize: definition.normalize, merge: definition.merge, migrate: definition.migrate };
            stored.defaults = normalized(stored, stored.defaults);
            this.definitions.push({ id: id, definition: stored });
        }
        private definition(id: string): Definition {
            for (var i = 0; i < this.definitions.length; i++) if (this.definitions[i].id === id) return this.definitions[i].definition;
            throw new Error("Unknown skill preference definition: " + id);
        }
        private load(id: string, individual: Individual, storage: Storage, definition: Definition): Loaded {
            var layer = scope(individual), text = storage.read(id, individual);
            if (text === null) return { present: false, patch: {} };
            var stored = object(JSON.parse(text));
            if (typeof stored.version !== "number" || !isFinite(stored.version) || stored.version < 1 || Math.floor(stored.version) !== stored.version)
                throw new Error("Invalid stored preference version: " + id);
            if (stored.version > definition.version) throw new Error("Stored preferences require a newer skill version: " + id);
            var patch = object(stored.patch);
            if (stored.version < definition.version) {
                if (!definition.migrate) throw new Error("Skill preferences require a patch migration: " + id);
                patch = object(definition.migrate(stored.version, patch, layer));
            }
            return { present: true, patch: patch };
        }
        resolve(id: string, individual: Individual, storage: Storage): ObjectValue {
            return this.inspect(id, individual, storage).effective;
        }
        /** Read-only: a migrated patch is saved in the new format on the next update or replace. */
        overrides(id: string, individual: Individual, storage: Storage): ObjectValue {
            return this.load(id, individual, storage, this.definition(id)).patch;
        }
        inspect(id: string, individual: Individual, storage: Storage): Inspection {
            scope(individual);
            var definition = this.definition(id), globalPatch = this.load(id, null, storage, definition);
            var global = resolved(definition, definition.defaults, globalPatch, "global");
            var selected = individual === null ? globalPatch : this.load(id, individual, storage, definition);
            var effective = individual === null ? object(global) : resolved(definition, global, selected, "individual");
            return { version: definition.version, defaults: object(definition.defaults), global: object(global),
                overrides: object(selected.patch), effective: object(effective) };
        }
        /** Edits only explicit fields in this layer, leaving future changes to inherited fields visible. */
        update(id: string, individual: Individual, patch: ObjectValue, storage: Storage): ObjectValue {
            var definition = this.definition(id), incoming = object(patch);
            var existing = this.load(id, individual, storage, definition);
            return this.save(id, individual, overlay(existing.patch, incoming), storage, definition);
        }
        /** Replace a layer's explicit patch, useful for an editor that tracks which fields were overridden. */
        replace(id: string, individual: Individual, patch: ObjectValue, storage: Storage): ObjectValue {
            return this.save(id, individual, object(patch), storage, this.definition(id));
        }
        /** Omit path to clear this layer. A field-name path restores inheritance for that field. */
        clear(id: string, individual: Individual, storage: Storage): ObjectValue;
        clear(id: string, individual: Individual, path: string[], storage: Storage): ObjectValue;
        clear(id: string, individual: Individual, pathOrStorage: string[] | Storage, storage?: Storage): ObjectValue {
            if (storage !== undefined && !Array.isArray(pathOrStorage)) throw new Error("A preference field path must be an array");
            var path = Array.isArray(pathOrStorage) ? pathOrStorage : undefined;
            var target = storage || pathOrStorage as Storage;
            var definition = this.definition(id), patch: ObjectValue = {};
            if (path !== undefined) {
                if (!path.length) throw new Error("A preference field path must contain at least one key");
                path.forEach(function (key) { if (typeof key !== "string") throw new Error("Preference paths contain field names"); safeKey(key); });
                patch = this.load(id, individual, target, definition).patch;
                removePath(patch, path, 0);
            }
            return this.save(id, individual, patch, target, definition);
        }
        private save(id: string, individual: Individual, patch: ObjectValue, storage: Storage, definition: Definition): ObjectValue {
            var layer = scope(individual), present = Object.keys(patch).length > 0;
            var base = individual === null ? definition.defaults : resolved(definition, definition.defaults, this.load(id, null, storage, definition), "global");
            var effective = resolved(definition, base, { present: present, patch: patch }, layer);
            storage.write(id, individual, present ? JSON.stringify({ version: definition.version, patch: patch }) : null);
            return object(effective);
        }
    }
}
