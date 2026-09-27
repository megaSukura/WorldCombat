/**
 * 精神突进 / psychoboost 的出手方式。
 *
 * 核心念头：**把全部精神力压成一点、隔空内爆**——几圈念力环从四面收拢到锁定的那一点猛地撞合、炸开；
 *   合拢期间术者要保持通视原点，视线被遮断就在遮挡前散环、不在远端爆。施法者的精神随之空掉，自身特攻掉 2 级。
 *
 * 三幕（提交前只播预告）：
 *   起（gather）：施法者闭目把精神力往颅心收紧、身周光华内敛，只播预告，此时代价未结清。
 *   合（charge → implode / disperse）：提交后立刻付反作用力（自身特攻 −insightLoss，中与不中都照付）并锁定一点；
 *       `converge` 刻里几圈念力环从四面合拢到该点，撞合的一瞬在 `burstRadius` 内结算一次 `focus`。
 *       合拢结束时若术者到锁定点的视线被遮断，念环在遮挡处散开、不结算伤害。
 *   收（finish）：一次内爆（或散环）后收势。
 *
 * 与同族分开：飞叶风暴是旋转前进并沿路旋切的叶刃、过热是身前一张扇形热浪、流星群是从头顶砸下的陨石群；
 *   精神突进是唯一看不见弹道、念力环隔空收拢后只内爆一次的那一记，基础威力也最高。
 *
 * 选取：`kind: "aim"`——中性点或实体位置都能放，提交后锁定不动；空点也能凝爆。
 *
 * 配置 `hold`（凝聚式）由公式改时序与威力，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const psychoboostScene = "world_combat:move_psychoboost";
    const psychoboostDisperseText = "world_combat.move.psychoboost.text.disperse";

    /** 在锁定点的小球内爆：真被球罩到的敌人各结算一次，按出手时的攻击快照打出第一发；返回命中数。 */
    function psychoboostImplode(current: CombatAction, at: CombatPoint, amount: number, rings: number,
        scale: number, intensity: number, radius: number, attack: PokemonDamage.AttackSnapshot): number {
        const scope = current.world();
        let hits = 0;
        WorldGeometry.selectBodies(scope, WorldGeometry.bodySphere(at, Math.max(0.3, radius)), function (enemy, facts) {
            if (facts.friendly() || facts.health() <= 0) return;
            if (!hurt(current, enemy, "psychoboost", amount,
                { damage: damageSpec("psychoboost", "focus"), attackSnapshot: attack })) return;
            hits++;
            WorldFeedback.emit(scope, psychoboostScene, 1, facts.position(),
                { moment: "burst", target: String(enemy.ref()), rings: rings, scale: scale, intensity: intensity }, 22);
        });
        return hits;
    }

    define({
        id: "psychoboost",
        cooldownParameter: "recharge",
        name: "Psycho Boost",
        description: "把全部精神力压成一点，让几圈念力环隔空收拢到锁定点上内爆，是全族威力最高的一记；合拢期间要保持通视，视线被遮断就在遮挡前散环、不在远端爆。施法后自身特攻大幅下降。凝聚式收得更久、单次更重，但总威力预算并不更高。",
        uses: ["远距离用全族最重的一记特殊点杀", "用收拢的念力环预告一次隔空内爆，逼对手遮挡或走位", "对视野开阔处的慢速目标最有效"],
        kind: "aim",
        range: 12,
        maxRange: 16,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 42,
        maximumTicks: 260,
        style: "psychic",
        defaults: { hold: false, ai: { maxChase: 16, tough: true, channel: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("psychoboost", "reach", pokemon) : 12, geometry: "line", style: "psychic",
                color: 0xC060E0, label: config && config.hold === true ? "精神突进·凝聚式" : "精神突进·瞬爆式" };
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
                JSON.stringify({ moment: "gather", hold: config && config.hold === true ? 1 : 0,
                    rings: Math.round(p("psychoboost", "rings", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const hold = !!(config && config.hold);
            const power = p("psychoboost", "focus", action);
            const converge = Math.max(2, Math.round(p("psychoboost", "converge", action)));
            const burstRadius = p("psychoboost", "burstRadius", action);
            const rings = Math.max(3, Math.round(p("psychoboost", "rings", action)));
            const reach = p("psychoboost", "reach", action);
            const insightLoss = Math.max(0, Math.round(p("psychoboost", "insightLoss", action)));
            const scale = Math.max(0.7, Math.min(1.9, burstRadius / 0.6));
            const intensity = Math.max(0.5, Math.min(2.4, power / 130));
            const scenes = WorldFeedback.actionScenes(psychoboostScene);
            const locked = action.targetPosition();
            const selected = action.target();
            const targetRef = selected !== null ? String(selected.ref()) : "";
            // 本发攻击快照：在耗竭前读，第一发内爆用的是降级前的特攻；之后每一次才真实读取降级后的阶段。
            const attack = PokemonDamage.snapshotAttack(world, actor, "spa");
            let settled = false;

            // 精神力压成一点：反作用力在提交那一刻付，中与不中都一样。
            NativeEffects.boost(world, actor, "spa", -insightLoss);
            WorldFeedback.emit(world, psychoboostScene, 1, origin,
                { moment: "gather", target: targetRef, rings: rings, scale: scale, intensity: intensity, hold: hold ? 1 : 0 }, 22);
            sound(action, "cobblemon:move.psychic.actor");
            scenes.show(action, "charge", locked,
                { moment: "charge", target: targetRef, rings: rings, reach: reach, burst: burstRadius, intensity: intensity });

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }

            function implode(current: CombatAction): void {
                const scope = current.world();
                scenes.stop(current, "charge");
                WorldFeedback.emit(scope, psychoboostScene, 1, locked,
                    { moment: "implode", target: targetRef, rings: rings, burst: burstRadius, intensity: intensity, hold: hold ? 1 : 0 }, 26);
                sound(current, "cobblemon:impact.psychic");
                psychoboostImplode(current, locked, power, rings, scale, intensity, burstRadius, attack);
                finish(current);
            }

            // 合拢期间短频率保持通视：视线被挡就在实际遮挡处散环，不在远端爆；走完整段才撞合。
            function guard(current: CombatAction, elapsed: number): void {
                const scope = current.world();
                const body = scope.observe(actor);
                const from = body !== null ? body.position() : origin;
                const wall = WorldGeometry.blockHit(scope, from, locked);
                if (wall !== null) {
                    scenes.stop(current, "charge");
                    const stop = wall.position();
                    WorldFeedback.emit(scope, psychoboostScene, 1, stop,
                        { moment: "disperse", rings: rings, burst: burstRadius, intensity: intensity }, 24);
                    WorldFeedback.text(scope, stop.plus(WorldCombat.point(0, 1.1, 0)), psychoboostDisperseText, [], 22);
                    finish(current);
                    return;
                }
                if (elapsed >= converge) { implode(current); return; }
                current.after(1, function (next: CombatAction) { guard(next, elapsed + 1); });
            }
            guard(action, 0);
        }
    });
}
