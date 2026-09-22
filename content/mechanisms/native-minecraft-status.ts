/**
 * Association and policy over two native stores. Minecraft owns the loaded entity's status clock (the effect
 * carrying a `world_combat:status/<name>` tag, whichever unit produced it); Cobblemon's single native status
 * slot mirrors it so the party UI, native items and abilities keep seeing the status.
 */
namespace NativeMinecraftStatus {
    var storage = "world_combat:native-minecraft-status";
    interface Link { entity: string; mirror: string; native: string; nativeKey: string; effect: string; effectId: string; owned: boolean; suppressed: boolean; }
    interface Mirror { name: string; natives: string[]; nativeOf(effect: CombatMobEffect): string; nameOf(native: string): string; }
    function simple(name: string): Mirror {
        return { name: name, natives: ["cobblemon:" + name], nativeOf: function () { return name; }, nameOf: function () { return name; } };
    }
    /** One entry per shared major status; poison covers both native strengths through the effect amplifier. */
    export var mirrors: Mirror[] = [
        { name: "poison", natives: ["cobblemon:poison", "cobblemon:poisonbadly"],
            nativeOf: function (effect) { return effect.amplifier() > 0 ? "poisonbadly" : "poison"; },
            nameOf: function (native) { return native === "cobblemon:poisonbadly" ? "toxic" : "poison"; } },
        simple("burn"), simple("paralysis"), simple("sleep"), simple("frozen")
    ];
    var reconciling: { [actor: string]: boolean } = {};
    function mirrorOf(native: string): Mirror | null {
        for (var i = 0; i < mirrors.length; i++) if (mirrors[i].natives.indexOf(String(native)) >= 0) return mirrors[i];
        return null;
    }
    function mirrorNamed(name: string): Mirror | null {
        for (var i = 0; i < mirrors.length; i++) if (mirrors[i].name === name) return mirrors[i];
        return null;
    }
    /**
     * Only the shared default effect of a status mirrors into the native slot. A unit's own tagged variant keeps the
     * identity for consumers while its author decides what, if anything, the Pokemon layer is (for example a separate
     * `CombatStatus.inflict(..., "burn")` roll).
     */
    function effectOf(world: CombatWorld, actor: CombatActor, mirror: Mirror): CombatMobEffect | null {
        if (!world.valid(actor)) return null;
        var effect = world.mobEffect(actor, CombatStatus.majors[mirror.name].effect);
        return effect !== null && effect.tagged(CombatStatus.tag(mirror.name)) ? effect : null;
    }
    // Captures across the beginning/end of one entity tick differ by one duration tick.
    // All other vanilla fields, hidden effect stacks and NeoForge cures must remain identical.
    function equivalent(a: any, b: any, field?: string): boolean {
        if (a === b) return true;
        if (field === "duration" && typeof a === "number" && typeof b === "number") return a >= 0 && b >= 0 && Math.abs(a - b) <= 1;
        if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
        var keys = Object.keys(a); if (keys.length !== Object.keys(b).length) return false;
        return keys.every(function (key) { return Object.prototype.hasOwnProperty.call(b, key) && equivalent(a[key], b[key], key); });
    }
    function matches(a: string, b: string): boolean {
        try { return equivalent(JSON.parse(a), JSON.parse(b)); } catch (_) { return false; }
    }
    function save(world: CombatWorld, actor: CombatActor, old: string | null, value: Link | null): void {
        if (old !== null && value !== null && equivalent(JSON.parse(old), value)) return;
        var next = value === null ? null : JSON.stringify(value);
        if (old !== next && !CobblemonCombat.compareData(world, actor, storage, old, next)) throw new Error("Status association changed during reconciliation");
    }
    function remember(world: CombatWorld, actor: CombatActor, old: string | null, mirror: Mirror, pokemon: CombatPokemon, effect: CombatMobEffect | null,
        owned: boolean, suppressed: boolean): void {
        save(world, actor, old, { entity: String(actor.ref()), mirror: mirror.name, native: String(pokemon.status()), nativeKey: String(pokemon.statusKey()),
            effect: effect === null ? "" : String(effect.key()), effectId: effect === null ? "" : String(effect.id()), owned: owned, suppressed: suppressed });
    }
    var inherent: { [name: string]: string[] } = { burn: ["fire"], poison: ["poison", "steel"], toxic: ["poison", "steel"], paralysis: ["electric"], frozen: ["ice"], sleep: [] };
    function immune(world: CombatWorld, actor: CombatActor, pokemon: CombatPokemon, state: NativeEffects.State, name: string): boolean {
        var ability = NativeEffects.ability(pokemon, state), types = NativeEffects.types(pokemon, state);
        var typed = (inherent[name] || []).some(function (type) { return types.indexOf(type) >= 0; }) && !NativeEffects.typeImmunityBroken(world, actor, state);
        return typed || NativeAbilities.flag(ability, "statusImmune") || NativeAbilities.has(ability, "statusImmunities", NativeEffects.nativeName(name));
    }
    export function reconcile(world: CombatWorld, actor: CombatActor): void {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor) || reconciling[String(actor.ref())]) return;
        reconciling[String(actor.ref())] = true;
        try {
            var stored = CobblemonCombat.data(world, actor, storage), old = stored === null ? null : String(stored);
            var link: Link | null = old === null ? null : JSON.parse(old);
            var pokemon = CobblemonCombat.pokemon(actor), nativeMirror = mirrorOf(String(pokemon.status()));
            // The native slot decides which status is being mirrored; after a native cure the remembered mirror settles first.
            var mirror = nativeMirror || (link && link.mirror ? mirrorNamed(link.mirror) : null);
            if (mirror === null) for (var i = 0; i < mirrors.length && mirror === null; i++) if (effectOf(world, actor, mirrors[i]) !== null) mirror = mirrors[i];
            if (mirror === null) { save(world, actor, old, null); return; }
            var effect = effectOf(world, actor, mirror), native = nativeMirror === mirror;
            var owned = !!(effect && link && link.owned && matches(link.effect, String(effect.key())));
            if (!native) {
                if (!effect) { save(world, actor, old, null); return; }
                // A cure/replacement of the linked native status removes only the effect we authored.
                if (link && link.mirror === mirror.name && mirrorOf(link.native) === mirror) {
                    if (owned && world.removeMobEffect(actor, String(effect.id()), String(effect.key()))) { save(world, actor, old, null); return; }
                    remember(world, actor, old, mirror, pokemon, effect, false, true); return;
                }
                // Preserve a foreign effect after a native cure. A later replacement can become a fresh exposure.
                if (link && link.suppressed && matches(link.effect, String(effect.key()))) return;
                // The native slot holds one status: while another occupies it, this effect remains the status on its own.
                if (String(pokemon.status())) return;
                // Native compare-and-write happens before any Minecraft mutation; failed native writes leave the original effect intact.
                // A Pokemon immune by type or ability keeps the foreign effect without a native mirror.
                var seconds = effect.duration() < 0 ? 86400 : Math.max(1, Math.min(86400, Math.ceil(effect.duration() / 20)));
                if (!NativeEffects.statusAllowed(world, actor, mirror.nativeOf(effect), false, true)) return;
                if (!NativeEffects.writeStatus(world, actor, mirror.nativeOf(effect), seconds)) return;
                // This exact first exposure becomes the paired status. Subsequent external upgrades lose this ownership.
                remember(world, actor, old, mirror, CobblemonCombat.pokemon(actor), effect, true, false); return;
            }
            if (!effect) {
                // Same loaded association disappearing means milk, /effect clear or natural expiry. A new native container/entity is a new exposure.
                if (link && link.effect && link.entity === String(actor.ref()) && link.nativeKey === String(pokemon.statusKey())) {
                    if (CobblemonCombat.status(world, actor, "", 0, String(pokemon.statusKey()))) save(world, actor, old, null);
                    return;
                }
                var duration = Math.max(1, pokemon.statusSeconds()) * 20, name = mirror.nameOf(String(pokemon.status()));
                var definition = CombatStatus.majors[name], amplifier = definition.amplifier;
                // Recall/re-entry can reconstruct the foreign strength, while the native timer accounts for time in the party.
                if (link && link.effect && link.mirror === mirror.name) {
                    var previous = JSON.parse(link.effect);
                    if (typeof previous.amplifier === "number") amplifier = Math.max(amplifier, previous.amplifier);
                    if (previous.duration === -1) duration = -1;
                }
                world.marker(actor, definition.effect, duration === -1 ? -1 : Math.min(1728000, duration), amplifier);
                effect = effectOf(world, actor, mirror);
                if (effect) remember(world, actor, old, mirror, pokemon, effect, true, false);
                return;
            }
            // Minecraft owns the loaded duration. Refresh native seconds only for a meaningful external extension.
            var remaining = effect.duration() < 0 ? 86400 : Math.max(1, Math.ceil(effect.duration() / 20));
            if (Math.abs(remaining - pokemon.statusSeconds()) > 1)
                CobblemonCombat.statusSeconds(world, actor, Math.min(86400, remaining), String(pokemon.statusKey()));
            remember(world, actor, old, mirror, pokemon, effect, owned, false);
        } finally { delete reconciling[String(actor.ref())]; }
    }
    /** The vanilla poison tick is the poison damage; native immunity and Poison Heal act on that clock. */
    export function application(event: CombatWorldEvent): void {
        var actor = event.actor(); if (String(actor.domain()) !== "cobblemon") return;
        var world = event.world(), data = JSON.parse(String(event.data())), effect = world.mobEffect(actor, String(data.id));
        if (effect === null) return;
        var names = CombatStatus.names(effect), name = names.indexOf("toxic") >= 0 ? "toxic" : names.indexOf("poison") >= 0 ? "poison" : "";
        if (!name) return;
        var pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(world, actor), ability = NativeEffects.ability(pokemon, state);
        if (immune(world, actor, pokemon, state, name) || NativeAbilities.flag(ability, "indirectImmune")) { event.reject("native-status-immune"); return; }
        if (NativeAbilities.flag(ability, "poisonTickRecovery")) {
            event.reject("native-status-converted");
            // One Minecraft health unit per actual poison application. No second timer or native proportional pulse.
            world.health(actor, 1, "world_combat:poison-heal");
        }
    }
    export function install(): void {
        mirrors.forEach(function (mirror) {
            mirror.natives.forEach(function (native) {
                NativeEffects.statusClock(native.replace("cobblemon:", ""), function (world, actor) { return effectOf(world, actor, mirror) !== null; });
            });
        });
        // Shared burn damage respects Pokemon immunity and ability policy through the same pulse.
        CombatStatus.pulse.define({ id: "cobblemon_world_combat:status-pulse", apply: function (context) {
            if (String(context.actor.domain()) !== "cobblemon" || !context.world.valid(context.actor)) return;
            var pokemon = CobblemonCombat.pokemon(context.actor), state = NativeEffects.read(context.world, context.actor);
            if (immune(context.world, context.actor, pokemon, state, context.name) || NativeAbilities.flag(NativeEffects.ability(pokemon, state), "indirectImmune")) { context.amount = 0; return; }
            var exposure = { status: context.name, amount: context.amount };
            NativeAbilities.apply(context.world, context.actor, "statusPulse", exposure, state);
            context.amount = exposure.amount;
        } });
        // A status landing through the shared route mirrors in the same tick.
        CombatStatus.applied.define({ id: "cobblemon_world_combat:status-mirror", apply: function (context) { reconcile(context.world, context.actor); } });
        CombatStatus.cured.define({ id: "cobblemon_world_combat:status-mirror", apply: function (context) { reconcile(context.world, context.actor); } });
        // The mirror reconciles on every edge that can move either side: the Pokemon's own facts (native status slot),
        // Minecraft effects arriving or leaving, and the individual effect appearing at bind time.
        function edge(event: CombatWorldEvent): void { reconcile(event.world(), event.actor()); }
        WorldCombat.on("world_combat:native-minecraft-status/bound", "world_combat:actor_bound", "cobblemon_world_combat:bound", edge);
        WorldCombat.on("world_combat:native-minecraft-status/changed", "world_combat:actor_changed", "", edge);
        WorldCombat.on("world_combat:native-minecraft-status/added", "world_combat:mob_effect_added", "", edge);
        WorldCombat.on("world_combat:native-minecraft-status/removed", "world_combat:mob_effect_removed", "", edge);
        WorldCombat.on("world_combat:native-minecraft-application", "world_combat:mob_effect_tick", "", application);
    }
}
if (typeof CobblemonCombat !== "undefined") NativeMinecraftStatus.install();
