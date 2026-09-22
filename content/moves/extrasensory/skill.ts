/**
 * 神通力 / extrasensory —— 注册与动作。
 *
 * 核心念头：先「看见」看不见的力量该出现的地方，在那里留下一道极淡的幻影；片刻之后，看不见的力从四面
 *   收拢，把那一小块地上的敌人一齐攥住——对手只读得到幻影，能在合拢前离开那块地就躲开了。
 *
 * 三幕：
 *   起（mark，提交前）：选定点上浮起将散未散的念力幻影，只播预告；可被打断。
 *   伏（delay，提交后）：幻影在原地停留 `delay` 刻，力量在周围悄悄聚拢（看不见），对手读到的是同一道幻影。
 *   攥（snap → hit / miss）：延迟到点，力量合拢 `crushRadius` 一圈；圈内每个非友方各结算一次 `crush` 特殊伤害，
 *       并按 `flinchChance` 掷一次畏缩；圈内没人则原地空攥。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `premonition`（伏击式）由 resolve 改时序、由公式改延迟/半径/威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    function extrasensoryFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, extrasensoryFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        id: extrasensoryId,
        name: "Extrasensory",
        description: "The user attacks with an odd, unseeable power. This may also make the target flinch.",
        uses: ["预判对手会跑到哪里，把看不见的力留在那个点上", "把沉睡或被困住的目标按在原地攥住", "把一小片挤在一起的敌人一起攥住"],
        kind: "point",
        range: 10,
        maxRange: 15,
        prepare: 9,
        active: 0,
        recover: 7,
        cooldown: 25,
        style: "psychic",
        defaults: { premonition: false, ai: { maxChase: 13 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(extrasensoryId, "radius", pokemon), geometry: "area", style: "psychic", color: 0xC6A9F0,
                label: config && config.premonition === true ? "伏击神通力" : "神通力" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[extrasensoryId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(extrasensoryId, "tempo", context)),
                recover: Math.round(p(extrasensoryId, "aftercast", context)),
                cooldown: Math.round(p(extrasensoryId, "recharge", context)),
                active: 0,
                range: p(extrasensoryId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const radius = p(extrasensoryId, "radius", action);
            const motes = Math.max(10, Math.round(p(extrasensoryId, "motes", action)));
            const scale = Math.max(0.6, Math.min(2.0, radius / extrasensoryReference));
            action.present("extrasensory:mark", extrasensoryScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "mark", radius: radius, motes: motes, scale: scale,
                    delay: Math.round(p(extrasensoryId, "delay", action)), premonition: config && config.premonition === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const point = action.targetPosition();
            const power = p(extrasensoryId, "crush", action);
            const radius = p(extrasensoryId, "radius", action);
            const delay = Math.max(4, Math.round(p(extrasensoryId, "delay", action)));
            const chance = p(extrasensoryId, "flinchChance", action);
            const flinchTicks = Math.round(p(extrasensoryId, "flinchTicks", action));
            const motes = Math.max(10, Math.round(p(extrasensoryId, "motes", action)));
            const scale = Math.max(0.6, Math.min(2.0, radius / extrasensoryReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 85));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            // 重发同一 key：把起手幻影换成合拢前仍在的同一道幻影（点击者读的是它）。
            action.present("extrasensory:mark", extrasensoryScene, 1, point,
                JSON.stringify({ moment: "mark", radius: radius, motes: motes, scale: scale, delay: delay }));
            sound(action, "minecraft:entity.illusioner.cast_spell");

            action.after(delay, function (current: CombatAction) {
                const scope = current.world();
                current.present("extrasensory:mark", extrasensoryScene, 1, point,
                    JSON.stringify({ moment: "snap", radius: radius, motes: motes, scale: scale, intensity: intensity }));
                WorldFeedback.emit(scope, extrasensoryScene, 1, point,
                    { moment: "snap", radius: radius, motes: motes, scale: scale, intensity: intensity }, 26);
                sound(current, "cobblemon:impact.psychic");
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, radius, { below: 2.2, above: 2.6 }), function (enemy, facts) {
                    if (String(enemy.ref()) === String(actor.ref())) return;
                    if (!hurt(current, enemy, extrasensoryId, power, { damage: damageSpec(extrasensoryId, "crush") })) return;
                    hits++;
                    WorldFeedback.emit(scope, extrasensoryScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), radius: radius, motes: motes, scale: scale, intensity: intensity }, 22);
                    if (scope.random() < chance && extrasensoryFlinch(scope, enemy, flinchTicks)) {
                        WorldFeedback.emit(scope, extrasensoryScene, 1, facts.position(), { moment: "flinch", target: String(enemy.ref()) }, 20);
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.35, 0)), extrasensoryFlinchText, [], 20);
                    }
                });
                if (hits === 0) {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), extrasensoryMissText, [], 20);
                    WorldFeedback.emit(scope, extrasensoryScene, 1, point, { moment: "miss", radius: radius, scale: scale }, 18);
                } else {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), extrasensoryHitText, [hits], 22);
                }
                finish(current);
            });
        }
    });

}
