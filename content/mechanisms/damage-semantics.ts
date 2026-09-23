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
}
