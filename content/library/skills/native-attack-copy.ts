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
    /** The unit keeps its own waiting/recognition visuals; this draws the actual supported native replay. */
    export function playNativeCopy(action: CombatAction, replay: NativeAttackProjection.Replay, move: string,
        multiplier: number, scene: string, recovery: number, textKey: string): void {
        const scenes = WorldFeedback.actionScenes(scene);
        WorldFeedback.text(action.world(), action.origin(), textKey, [], 24);
        NativeAttackProjection.play(action, replay, { move: move, multiplier: multiplier,
            show: (current, phase, at, projectile) => {
                const direction = current.targetPosition().minus(current.origin());
                const heading = direction.length() > .001 ? direction.unit() : current.direction();
                const data = { moment: phase === "contact" ? "native_contact" : phase === "launch" ? "native_flight" : phase === "hit" ? "native_hit" : "native_miss",
                    projectile: projectile || "", direction: [heading.x(), heading.y(), heading.z()] };
                if (phase === "contact" || phase === "launch") scenes.show(current, "projection", at, data);
                else WorldFeedback.emit(current.world(), scene, 1, at, data, 12);
            },
            done: current => scenes.finish(current, settled => settled.after(Math.max(1, Math.round(recovery)), end => end.finish()))
        });
    }
}
