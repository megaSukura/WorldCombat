/** Script interpretation of native damage facts. Unknown types remain unclassified; packs may extend the registry. */
namespace DamageSemantics {
    export interface Facts { data: any; category: string; contact: boolean; attack: boolean; flags: { [name: string]: boolean }; }
    export var classification = new WorldContributions.Registry<Facts>();
    export interface Incoming { world: CombatWorld; source: CombatActor; target: CombatActor; data: any; }
    /** Native damage enrichment before managed incoming interceptors. It updates the existing hit;
     * contributors preserve native damageType, source/direct entities and the host settlement. */
    export var adaptations = new WorldContributions.Registry<Incoming>();
    var melee = ["minecraft:mob_attack", "minecraft:mob_attack_no_aggro", "minecraft:player_attack", "minecraft:sting", "minecraft:ram", "minecraft:mace_smash"];
    var physical = melee.concat(["minecraft:arrow", "minecraft:trident", "minecraft:mob_projectile", "minecraft:thrown",
        "minecraft:explosion", "minecraft:player_explosion", "minecraft:thorns", "minecraft:falling_block", "minecraft:falling_anvil", "minecraft:falling_stalactite"]);
    var special = ["minecraft:magic", "minecraft:indirect_magic", "minecraft:sonic_boom", "minecraft:dragon_breath",
        "minecraft:fireball", "minecraft:unattributed_fireball", "minecraft:wither_skull", "minecraft:lightning_bolt"];
    export function read(data: any): Facts {
        data = data || {};
        var tags: string[] = data.damageTags || [], type = String(data.damageType || "");
        var category = data.category === "physical" || data.category === "special" ? data.category : "";
        var authored = data.scripted === true || !!data.kind;
        if (!category && !authored) {
            if (special.indexOf(type) >= 0 || tags.indexOf("neoforge:is_magic") >= 0 || tags.indexOf("world_combat:damage/special") >= 0) category = "special";
            else if (physical.indexOf(type) >= 0 || tags.indexOf("neoforge:is_physical") >= 0 || tags.indexOf("world_combat:damage/physical") >= 0) category = "physical";
        }
        var contact = typeof data.contact === "boolean" ? data.contact : !authored && data.direct === true
            && data.sourceLiving === true && (melee.indexOf(type) >= 0 || tags.indexOf("world_combat:damage/contact") >= 0);
        var attack = !authored && data.sourceLiving === true && !!data.sourceActor
            && (contact || tags.indexOf("minecraft:is_projectile") >= 0 || type === "minecraft:sonic_boom"
                || type === "minecraft:indirect_magic" || tags.indexOf("world_combat:damage/attack") >= 0);
        var flags: { [name: string]: boolean } = {};
        Object.keys(data.flags || {}).forEach(key => flags[key] = data.flags[key]);
        if (flags.sound === undefined && (type === "minecraft:sonic_boom" || tags.indexOf("world_combat:damage/sound") >= 0)) flags.sound = true;
        return classification.apply({ data: data, category: category, contact: contact, attack: attack, flags: flags });
    }
    /** A native attack or an authored damaging move. Residual/indirect payloads remain separate
     * even when they inherit their original move's execution attribution. */
    export function directOffense(data: any): boolean {
        data = data || {};
        if (data.indirect === true || data.kind === "residual" || data.calculation && data.calculation.mode === "residual") return false;
        const facts = read(data);
        return facts.attack || data.kind === "move" && (facts.category === "physical" || facts.category === "special");
    }
    /** Publish the interpreted fields before shared incoming policies; source facts stay available alongside them. */
    export function normalize(data: any, world?: CombatWorld, source?: CombatActor, target?: CombatActor): any {
        var facts = read(data);
        if (facts.category) data.category = facts.category;
        else if (data.category === "physical" || data.category === "special") delete data.category;
        data.contact = facts.contact;
        data.flags = facts.flags;
        if (world && source && target && !data.nativeAdapted) {
            data.nativeAdapted = true;
            adaptations.apply({ world, source, target, data });
        }
        return data;
    }
    export interface RecentAttack { tick: number; type: string; elementType?: string; flags?: { [name: string]: boolean }; contact: boolean; target: string; amount: number; actual: number; category: string; tags: string[]; directType?: string; projectilePath?: CombatProjectilePathSegment[];
        /** Actual settled envelope and native direct-entity fact. Missing on older observations. */
        kind?: string; move?: string; directProjectile?: boolean;
    }
    const memory = "world_combat:native_attack_memory";
    const offenseMemory = "world_combat:resolved_offense_memory";
    /** Last successful native attack, including a player's melee/projectile attack; actor-scoped and finite. */
    export function recentAttack(world: CombatWorld, actor: CombatActor, maximumAge = 100): RecentAttack | null {
        return readMemory(world, actor, memory, maximumAge);
    }
    /** Last successful direct offense, native or scripted, with its actually resolved element/category.
     * This is a past hit observation, independent of attack-start/commitment and never a template guess. */
    export function recentOffense(world: CombatWorld, actor: CombatActor, maximumAge = 100): RecentAttack | null {
        return readMemory(world, actor, offenseMemory, maximumAge);
    }
    function readMemory(world: CombatWorld, actor: CombatActor, definition: string, maximumAge: number): RecentAttack | null {
        if (!world.valid(actor)) return null;
        const records = world.effects(actor, definition);
        if (!records.length) return null;
        const latest: RecentAttack = JSON.parse(String(records[records.length - 1].data()));
        return world.tick() - latest.tick <= maximumAge ? latest : null;
    }
    WorldCombat.effect(memory, 1, 1200, "actor", json => json, () => { throw new Error("Native attack memory cannot migrate"); });
    WorldCombat.effectHandler(memory, "start", () => {});
    WorldCombat.effectHandler(memory, "operation:world_combat:forget", effect => effect.end());
    WorldCombat.effect(offenseMemory, 1, 1200, "actor", json => json, () => { throw new Error("Attack observation cannot migrate"); });
    WorldCombat.effectHandler(offenseMemory, "start", () => {});
    WorldCombat.effectHandler(offenseMemory, "operation:world_combat:forget", effect => effect.end());
    WorldCombat.on("world_combat:native_attack_memory", "world_combat:damage_applied", "", event => {
        const world = event.world(), actor = event.actor(), target = event.target(), data = JSON.parse(String(event.data()));
        const facts = read(data);
        if (!(data.actual > 0) || !directOffense(data) || !target || !world.valid(actor) || String(actor.key()) === String(target.key())) return;
        const json = JSON.stringify({ tick: world.tick(), type: String(data.damageType || ""), elementType: String(data.type || ""), contact: facts.contact,
              target: String(target.ref()), amount: data.amount, actual: data.actual, category: facts.category, flags: facts.flags, tags: data.damageTags || [], directType: data.directType || "", projectilePath: data.projectilePath || [],
              kind: typeof data.kind === "string" ? data.kind : "native", move: typeof data.move === "string" ? data.move : "",
              directProjectile: typeof data.directProjectile === "boolean" ? data.directProjectile : undefined });
        const definitions = facts.attack ? [memory, offenseMemory] : [offenseMemory];
        definitions.forEach(definition => {
            world.effects(actor, definition).forEach(effect => world.operation(effect.id(), "world_combat:forget", "{}"));
            world.effect(definition, actor, json, 1200);
        });
    });
}
