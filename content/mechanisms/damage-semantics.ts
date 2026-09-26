/** Script interpretation of native damage facts. Unknown types remain unclassified; packs may extend the registry. */
namespace DamageSemantics {
    export interface Facts { data: any; category: string; contact: boolean; attack: boolean; }
    export var classification = new WorldContributions.Registry<Facts>();
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
        return classification.apply({ data: data, category: category, contact: contact, attack: attack });
    }
    /** Publish the interpreted fields before shared incoming policies; source facts stay available alongside them. */
    export function normalize(data: any): any {
        var facts = read(data);
        if (facts.category) data.category = facts.category;
        else if (data.category === "physical" || data.category === "special") delete data.category;
        data.contact = facts.contact;
        return data;
    }
    export interface RecentAttack { tick: number; type: string; contact: boolean; target: string; amount: number; actual: number; category: string; tags: string[]; directType?: string; projectilePath?: CombatProjectilePathSegment[]; }
    const memory = "world_combat:native_attack_memory";
    /** Last successful native attack, including a player's melee/projectile attack; actor-scoped and finite. */
    export function recentAttack(world: CombatWorld, actor: CombatActor, maximumAge = 100): RecentAttack | null {
        if (!world.valid(actor)) return null;
        const records = world.effects(actor, memory);
        if (!records.length) return null;
        const latest: RecentAttack = JSON.parse(String(records[records.length - 1].data()));
        return world.tick() - latest.tick <= maximumAge ? latest : null;
    }
    WorldCombat.effect(memory, 1, 1200, "actor", json => json, () => { throw new Error("Native attack memory cannot migrate"); });
    WorldCombat.effectHandler(memory, "start", () => {});
    WorldCombat.effectHandler(memory, "operation:world_combat:forget", effect => effect.end());
    WorldCombat.on("world_combat:native_attack_memory", "world_combat:damage_applied", "", event => {
        const world = event.world(), actor = event.actor(), target = event.target(), data = JSON.parse(String(event.data()));
        const facts = read(data);
        if (!(data.actual > 0) || !facts.attack || !target || !world.valid(actor) || String(actor.key()) === String(target.key())) return;
        world.effects(actor, memory).forEach(effect => world.operation(effect.id(), "world_combat:forget", "{}"));
        world.effect(memory, actor, JSON.stringify({ tick: world.tick(), type: String(data.damageType), contact: facts.contact,
            target: String(target.ref()), amount: data.amount, actual: data.actual, category: facts.category, tags: data.damageTags || [], directType: data.directType || "", projectilePath: data.projectilePath || [] }), 1200);
    });
}
