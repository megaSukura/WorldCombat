/**
 * 精神突进 / psychoboost 的出手方式。
 *
 * 核心念头：**把全部精神力压成一点、隔空内爆**——几圈念力环从四面收拢到目标身上猛地撞合、炸开；
 *   施法者的精神随之空掉，自身特攻掉 2 级，提交那一刻就付。回响式让这次内爆在片刻后于原爆点再响一次。
 *
 * 三幕（提交前只播预告）：
 *   起（gather）：施法者闭目把精神力往颅心收紧、身周光华内敛，只播预告，此时代价未结清。
 *   合（charge → implode）：提交后立刻付反作用力（自身特攻 −insightLoss，中与不中都照付）；
 *       `converge` 刻里几圈念力环从四面合拢到目标身上，撞合的一瞬在 `burstRadius` 内结算一次 `focus`。
 *   响（echo，仅回响式）：主爆后 `echoDelay` 刻，于**原爆点**再内爆一次，把 `echoRadius` 内的敌人按
 *       `echoShare` 的威力补一遍；目标若在回响前走出范围就只挨第一下。
 *
 * 与同族分开：飞叶风暴是旋转前进并留场的叶刃、过热是身前一张扇形热浪、流星群是从头顶砸下的陨石群；
 *   精神突进是唯一看不见弹道、念力环隔空收拢后内爆的那一记，基础威力也最高。
 *
 * 配置 `echo`（回响式）由 `resolve` 改时序、由公式改威力／保留／范围，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const psychoboostScene = "world_combat:move_psychoboost";
    const psychoboostEchoText = "world_combat.move.psychoboost.text.echo";

    /** 在一点内爆：把半径内的敌人各结算一次；返回命中数。 */
    function psychoboostImplode(current: CombatAction, at: CombatPoint, amount: number, rings: number,
        scale: number, intensity: number, radius: number): number {
        const scope = current.world();
        let hits = 0;
        WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, Math.max(0.3, radius), { below: 2.5, above: 3.5 }), function (enemy, facts) {
            if (!hurt(current, enemy, "psychoboost", amount, { damage: damageSpec("psychoboost", "focus") })) return;
            hits++;
            WorldFeedback.emit(scope, psychoboostScene, 1, facts.position(),
                { moment: "burst", target: String(enemy.ref()), rings: rings, scale: scale, intensity: intensity }, 22);
        });
        return hits;
    }

    define({
        id: "psychoboost",
        name: "Psycho Boost",
        description: "Crushes all of the user's psychic power into one remote implosion; the recoil harshly lowers the user's Sp. Atk.",
        uses: ["远距离用全族最重的一记特殊点杀", "用收拢的念力环预告一次隔空内爆", "回响式在原爆点补上第二响"],
        kind: "enemy",
        range: 12,
        maxRange: 16,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 42,
        maximumTicks: 260,
        style: "psychic",
        defaults: { echo: false, ai: { maxChase: 16, tough: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("psychoboost", "reach", pokemon) : 12, geometry: "line", style: "psychic",
                color: 0xC060E0, label: config && config.echo === true ? "精神突进·回响式" : "精神突进·瞬爆式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["psychoboost"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("psychoboost", "tempo", context)),
                recover: Math.round(p("psychoboost", "aftercast", context)),
                cooldown: Math.round(p("psychoboost", "recharge", context)),
                active: 0,
                range: p("psychoboost", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_psychoboost:gather", psychoboostScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", echo: config && config.echo === true ? 1 : 0,
                    rings: Math.round(p("psychoboost", "rings", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const echo = !!(config && config.echo);
            const power = p("psychoboost", "focus", action);
            const converge = Math.max(2, Math.round(p("psychoboost", "converge", action)));
            const burstRadius = p("psychoboost", "burstRadius", action);
            const rings = Math.max(3, Math.round(p("psychoboost", "rings", action)));
            const reach = p("psychoboost", "reach", action);
            const echoShare = Math.max(0, Math.min(0.8, p("psychoboost", "echoShare", action)));
            const echoDelay = Math.max(6, Math.round(p("psychoboost", "echoDelay", action)));
            const echoRadius = Math.max(0, p("psychoboost", "echoRadius", action));
            const insightLoss = Math.max(0, Math.round(p("psychoboost", "insightLoss", action)));
            const scale = Math.max(0.7, Math.min(1.9, burstRadius / 0.6));
            const intensity = Math.max(0.5, Math.min(2.4, power / 130));
            const target = action.target();
            const targetRef = target !== null ? String(target.ref()) : "";
            let settled = false;

            // 精神力压成一点：反作用力在提交那一刻付。
            NativeEffects.boost(world, actor, "spa", -insightLoss);
            WorldFeedback.emit(world, psychoboostScene, 1, origin,
                { moment: "gather", target: targetRef, rings: rings, scale: scale, intensity: intensity, echo: echo ? 1 : 0 }, 22);
            sound(action, "cobblemon:move.psychic.actor");
            WorldFeedback.keep(world, "psychoboost:charge:" + action.id(), psychoboostScene, 1, action.targetPosition(),
                { moment: "charge", target: targetRef, rings: rings, reach: reach, scale: scale, intensity: intensity }, converge + 14);

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }

            action.after(converge, function (current: CombatAction) {
                const scope = current.world();
                let at = current.targetPosition();
                const t = current.target();
                if (t !== null && scope.valid(t)) {
                    const body = scope.observe(t);
                    if (body !== null) at = body.position();
                }
                WorldFeedback.emit(scope, psychoboostScene, 1, at,
                    { moment: "implode", target: targetRef, rings: rings, scale: scale, intensity: intensity, echo: echo ? 1 : 0 }, 26);
                sound(current, "cobblemon:impact.psychic");
                psychoboostImplode(current, at, power, rings, scale, intensity, burstRadius);
                if (!echo) { finish(current); return; }
                const point = at;
                current.after(echoDelay, function (fresh: CombatAction) {
                    const stage = fresh.world();
                    WorldFeedback.emit(stage, psychoboostScene, 1, point,
                        { moment: "echo", rings: rings, radius: echoRadius, echoShare: Math.round(echoShare * 100),
                            scale: scale, intensity: intensity * 0.8 }, 26);
                    const extra = psychoboostImplode(fresh, point, power * echoShare, rings, scale, intensity * 0.75, echoRadius);
                    sound(fresh, "cobblemon:impact.psychic");
                    if (extra > 0)
                        WorldFeedback.text(stage, point.plus(WorldCombat.point(0, 1.25, 0)), psychoboostEchoText, [extra], 24);
                    finish(fresh);
                });
            });
        }
    });
}
