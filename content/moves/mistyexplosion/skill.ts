/**
 * 薄雾炸裂 / mistyexplosion 的出手方式。
 *
 * 核心念头：把身体当场放成**一朵铺开的薄雾**——起手粉雾在脚边收拢、身体发亮；提交后雾环贴着地面向外炸开，
 *   圈内所有非友方挨一次 `bloom` 并被迷雾夺去视线，施法者随之倒下。这一发不是火药：不炸坑、只铺开一次，
 *   炸裂后雾只作一小段淡去的视效，**不再额外挂全敌减速**，也不留可经营的持续危险区。
 *   若脚下本就在薄雾上（薄雾场地或别处的雾场规则覆盖），这一爆整体乘上 `terrainBoost`（原生 ×1.5）。
 *
 * 三幕：
 *   起（swell，提交前）：粉雾向脚边收拢、身体发亮，只播预告（可免费打断，打断则不倒下）。
 *   爆（bloom → hit）：提交后雾环向外炸开；圈内每个非友方挨一次 `bloom`，且只有在伤害真的落地后才被致盲。
 *   散（mist）：原地只留一小段淡去的雾视效；使用者已经倒下，真源失效后不再继续跑任何过程。
 *
 * 提交即结清 PP 与冷却；收招为 0，倒下即动作结束。
 */
namespace PokemonSkills {
    function mistyexplosionAreaPoint(area: WorldEffects.Area): CombatPoint {
        return WorldCombat.point(area.position[0], area.position[1], area.position[2]);
    }

    /** 脚下是否已有薄雾：共享身份（薄雾场地施加的雾身份）或薄雾场地的雾场规则覆盖到脚下。 */
    function mistyexplosionInMist(world: CombatWorld, actor: CombatActor, point: CombatPoint): boolean {
        if (CombatStatus.has(world, actor, "mistyterrain")) return true;
        const areas = WorldEffects.areas(world, mistyexplosionTerrain);
        for (let j = 0; j < areas.length; j++) {
            if (mistyexplosionAreaPoint(areas[j]).minus(point).length() <= areas[j].radius + 0.5) return true;
        }
        return false;
    }

    define({
        id: mistyexplosionId,
        cooldownParameter: "recharge",
        name: "薄雾炸裂",
        description: "把身体当场放成一片铺开的薄雾：雾环贴地向外炸开，对周围所有非友方造成特殊伤害并夺去他们的视线，施法者随之陷入濒死；炸裂后雾只作一小段淡去的视效，不再拖慢任何目标。站在薄雾场地上施放时威力更高。",
        uses: ["被围住时用一条命换一圈致盲", "在薄雾上打出更重的一爆", "用雾环替队友清开身边一圈"],
        kind: "self",
        range: 4.4,
        maxRange: 7.2,
        prepare: 14,
        active: 0,
        recover: 0,
        cooldown: 95,
        style: "fairy",
        defaults: { denseMist: false, ai: { maxChase: 6, minFoes: 2, cornered: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(mistyexplosionId, "blastRadius", pokemon), geometry: "area", style: "fairy",
                color: 0xF0A8D0, label: config && config.denseMist === true ? "浓雾式" : "薄爆式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[mistyexplosionId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(6, Math.round(p(mistyexplosionId, "tempo", context))),
                recover: 0,
                cooldown: Math.max(50, Math.round(p(mistyexplosionId, "recharge", context))),
                active: skills[mistyexplosionId].active,
                range: p(mistyexplosionId, "blastRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("world_combat:move_mistyexplosion:swell", mistyexplosionScene, 1, action.origin(), JSON.stringify({
                moment: "swell", radius: p(mistyexplosionId, "blastRadius", action),
                scale: p(mistyexplosionId, "blastRadius", action) / 4.4,
                dense: config && config.denseMist === true ? 1 : 0,
                full: body === null || body.maxHealth() <= 0 ? 1 : body.health() / body.maxHealth()
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const radius = Math.max(3.0, p(mistyexplosionId, "blastRadius", action));
            const boost = Math.max(1, p(mistyexplosionId, "terrainBoost", action));
            const boosted = mistyexplosionInMist(world, self, centre);
            const power = p(mistyexplosionId, "bloom", action) * (boosted ? boost : 1);
            const blind = Math.max(30, Math.round(p(mistyexplosionId, "blindTicks", action)));
            const mistRadius = Math.max(2.2, p(mistyexplosionId, "mistRadius", action));
            const mistTicks = Math.max(20, Math.round(p(mistyexplosionId, "mistTicks", action)));
            const burst = Math.round(p(mistyexplosionId, "burst", action));
            const cap = Math.max(1, Math.round(p(mistyexplosionId, "maxTargets", action)));
            const scale = radius / 4.4;
            let hits = 0;

            sound(action, "minecraft:entity.generic.explode");
            WorldFeedback.emit(world, mistyexplosionScene, 1, centre,
                { moment: "bloom", radius: radius, scale: scale, count: burst,
                    gold: boosted ? Math.round(burst * 0.6) : 0,
                    intensity: Math.max(0.7, Math.min(2.6, power / 120)) }, 38);

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: radius * 0.8, above: radius * 0.8 }),
                function (enemy, facts) {
                    if (hits >= cap) return;
                    // 伤害被拒绝就不算命中：不致盲、不播命中表现。
                    if (!hurt(action, enemy, mistyexplosionId, power, { damage: damageSpec(mistyexplosionId, "bloom") })) return;
                    hits++;
                    if (world.valid(enemy)) MobEffects.apply(world, enemy, "minecraft:blindness", blind, 0);
                    WorldFeedback.emit(world, mistyexplosionScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), count: 12, scale: scale }, 24);
                });

            // 残雾只是短视效：不再挂全敌减速，也不留可经营的持续危险区。
            WorldFeedback.emit(world, mistyexplosionScene, 1, centre,
                { moment: "mist", radius: mistRadius, scale: mistRadius / 3.6, count: Math.round(30 + mistRadius * 8) }, mistTicks);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.2, 0)),
                hits > 0 ? mistyexplosionHitText : mistyexplosionMissText, hits > 0 ? [hits] : [], 30);

            // 原生 selfdestruct: "always"——有没有炸到，使用者都用完即陷入濒死。放在最后，倒下即结束。
            const last = world.observe(self);
            if (last !== null) world.health(self, -last.health(), "world_combat:mistyexplosion_cost");
            done(action);
        }
    });
}
