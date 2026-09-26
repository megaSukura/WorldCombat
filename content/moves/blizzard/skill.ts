/**
 * 暴风雪 / blizzard 的出手方式。
 *
 * 核心念头：指定一块地方召唤一片驻留的风雪，一阵一阵地扑打整片范围——圈里的敌人每阵被冻伤一次、被风
 *   往外推，并有概率被冻住；同一目标在风暴里待得越久，后续阵次的伤害越低。范围就在画面上，走出去就安全。
 *
 * 三幕：
 *   起（windup，提交前）：云层在落点上空聚拢、寒风先至的预告。
 *   扑（storm → rake ×rakes → impact）：提交后在落点成立风暴，按 rakeInterval 扑打 rakes 阵；每阵把
 *       范围内所有敌人各结算一次 gust 伤害（对同一目标的后续阵次逐次衰减）、按 push 往外推、按 freezeChance
 *       掷冰冻；风雪的密度随阵次递减，末阵平息。
 *   息（settle）：风雪停后在原地短暂平息，不改变地表。
 *
 * 天气（对应原生雪天必中）：下雨或雷暴时范围更大、每阵更重、冰冻概率更高；晴天收小变轻，能不能打到由
 *   站位决定，而不是掷命中。配置 howl（呼啸式）：范围更大、阵数更多、推得更远，但每阵更轻、起手与冷却更久。
 */
namespace PokemonSkills {
    const blizzardScene = "world_combat:move_blizzard";
    const blizzardHitText = "world_combat.move.blizzard.text.hit";
    const blizzardMissText = "world_combat.move.blizzard.text.miss";

    define({
        id: "blizzard",
        cooldownParameter: "recharge",
        name: "Blizzard",
        description: "在一块地方召唤驻留的风雪，一阵阵扑打整片范围：圈里的敌人每阵挨一次冻伤、被风往外推，并有概率被冻住而无法行动；同一目标在风暴里待得越久，每阵伤害越低，风雪本身也一阵弱过一阵。走出去就安全。下雨天更猛。",
        uses: ["封锁一块场地，逼敌人离开或硬吃", "一次覆盖挤在一起的一队敌人", "在雨天把范围和冰冻概率都推高"],
        kind: "point",
        range: 12,
        maxRange: 16,
        prepare: 16,
        active: 60,
        recover: 12,
        cooldown: 70,
        style: "storm",
        defaults: { howl: false, ai: { maxChase: 14, cluster: true, clusterRadius: 4 } },
        fields: [flag("howl", "呼啸式")],
        indicator: function (config, pokemon) {
            return { radius: p("blizzard", "radius", pokemon), geometry: "area", style: "storm", color: 0xBFE9FF,
                label: config && config.howl === true ? "暴风雪·呼啸" : "暴风雪·集中" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["blizzard"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const rakes = Math.max(1, Math.round(p("blizzard", "rakes", context)));
            const interval = Math.max(4, Math.round(p("blizzard", "rakeInterval", context)));
            return {
                prepare: Math.round(p("blizzard", "tempo", context)),
                recover: Math.round(p("blizzard", "aftercast", context)),
                cooldown: Math.round(p("blizzard", "recharge", context)),
                active: rakes * interval + 12,
                range: p("blizzard", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("blizzard:gather", blizzardScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "gather", howl: config && config.howl === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const centre = action.targetPosition();
            const env = WorldEnvironment.read(world, centre);
            const storm = !!env && typeof env.rain === "number" && env.rain > 0.2;
            const gust = p("blizzard", "gust", action);
            const rakes = Math.max(1, Math.round(p("blizzard", "rakes", action)));
            const interval = Math.max(4, Math.round(p("blizzard", "rakeInterval", action)));
            const radius = Math.max(1.5, p("blizzard", "radius", action));
            const push = p("blizzard", "push", action);
            const freezeChance = Math.max(0, Math.min(1, p("blizzard", "freezeChance", action)));
            const stormTicks = rakes * interval + 12;
            const scale = radius / 4.2;
            const intensity = Math.max(0.6, Math.min(2.4, gust * rakes / 90));
            const baseRate = Math.round(60 + gust * 4 + rakes * 6);
            const impactCount = Math.round(14 + gust * 0.8);
            const hit: { [ref: string]: number } = {};
            const scenes = WorldFeedback.actionScenes(blizzardScene, 1);
            let settled = false, unique = 0;

            function settle(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, function (next) {
                    const scope = next.world();
                    WorldFeedback.emit(scope, blizzardScene, 1, centre,
                        { moment: "settle", radius: radius, scale: scale, storm: storm ? 1 : 0 }, 30);
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.4, 0)),
                        unique > 0 ? blizzardHitText : blizzardMissText, unique > 0 ? [unique] : [], 28);
                    sound(next, "minecraft:entity.breeze.wind_burst");
                    done(next);
                });
            }

            function rake(current: CombatAction, index: number): void {
                if (index >= rakes) { settle(current); return; }
                const scope = current.world();
                // 同一片固定风暴：随阵次推进更新，密度按阵次递减，末阵前已很弱。
                scenes.show(current, "storm", centre,
                    { moment: "storm", radius: radius, scale: scale, intensity: intensity, stormTicks: stormTicks,
                        rate: Math.max(18, Math.round(baseRate * Math.pow(0.85, index))) });
                const region = WorldGeometry.ring(centre, 0, radius, { below: 2.5, above: 4 });
                WorldGeometry.selectEnemies(scope, region, function (victim, facts) {
                    const ref = String(victim.ref());
                    const ordinal = hit[ref] || 0;
                    const falloff = Math.max(0.5, Math.pow(0.85, ordinal));
                    if (!hurt(current, victim, "blizzard", gust * falloff,
                        { damage: damageSpec("blizzard", "gust"), status: "frozen", chance: freezeChance, flags: { wind: true } })) return;
                    if (!ordinal) unique++;
                    hit[ref] = ordinal + 1;
                    const away = facts.position().minus(centre);
                    const heading = away.length() < 0.05 ? WorldCombat.point(0, 0, 0) : away.unit();
                    if (scope.valid(victim)) scope.hitDisplace(victim, heading.scale(push).plus(WorldCombat.point(0, 0.12, 0)));
                    WorldFeedback.emit(scope, blizzardScene, 1, facts.position(),
                        { moment: "impact", target: ref, intensity: intensity, scale: scale, rake: index + 1, ordinal: ordinal + 1,
                            impactCount: impactCount }, 24);
                });
                current.after(interval, function (next) { rake(next, index + 1); });
            }

            sound(action, "minecraft:entity.breeze.whirl");
            rake(action, 0);
        }
    });
}
