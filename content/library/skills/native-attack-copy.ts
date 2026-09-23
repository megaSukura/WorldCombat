/** Content translation for learning a native attack as an existing move. Unknown damage kinds have no substitute. */
namespace PokemonSkills {
    /** Role Play and Doodle choose one characteristic relative to a neutral native body's reference values. */
    export function copiedNativeTrait(world: CombatWorld, actor: CombatActor): CombatCopies.Values {
        const values = CombatCopies.read(world, actor), reference: CombatCopies.Values = {};
        reference[CombatCopies.attack] = 2; reference[CombatCopies.speed] = 0.2;
        reference[CombatCopies.defence[0]] = 4; reference[CombatCopies.defence[1]] = 2; reference[CombatCopies.defence[2]] = 0.2;
        let chosen = "", score = 0;
        Object.keys(values).forEach(id => { const ratio = values[id] / reference[id]; if (ratio > score) { chosen = id; score = ratio; } });
        const result: CombatCopies.Values = {}; if (chosen) result[chosen] = values[chosen]; return result;
    }
    export function copiedNativeMove(world: CombatWorld, target: CombatActor, maxAge = 1200): string {
        const attack = DamageSemantics.recentAttack(world, target, maxAge); if (!attack) return "";
        const moves: { [type: string]: string } = {
            "minecraft:mob_attack": "tackle", "minecraft:mob_attack_no_aggro": "tackle", "minecraft:player_attack": "tackle",
            "minecraft:sting": "poisonsting", "minecraft:ram": "headbutt", "minecraft:mace_smash": "slam",
            "minecraft:arrow": "furyattack", "minecraft:trident": "hornattack", "minecraft:fireball": "ember",
            "minecraft:unattributed_fireball": "ember", "minecraft:sonic_boom": "sonicboom", "minecraft:indirect_magic": "psybeam"
        };
        const id = moves[attack.type]; return id && skills[id] ? id : "";
    }
}
