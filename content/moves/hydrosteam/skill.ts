/**
 * 水蒸气 / hydrosteam —— 注册与动作。
 *
 * 核心念头：把体内的水烧开，从身前喷出一条向外张开的滚烫蒸汽扇面；被罩住的敌人各挨一次烫、被顶开一点、
 *   身上的冰冻被化开，还被熏得湿透。烈日下蒸汽更烫（×1.5）、张得更开、白汽更浓。它是一次性的方向喷吐：
 *   没有蒸汽领域，也没有延迟爆炸；墙后的目标不会被扇面打到。
 *
 * 两幕：
 *   起（boil，提交前）：体内水沸、口鼻与身侧翻起白汽，只播预告；日照越强热纹越厚。
 *   喷（burst）：提交后朝瞄准方向（点或朝向）张出 `reach` 长、`angle` 宽的扇面（WorldGeometry.sector，
 *       判定与表现共用同一组顶点），最多罩住 `maxTargets` 个非友方，各自结算 steam、化开冰冻、
 *       挂上湿透身份并被顶开 `push`；始终先解掉自己身上的冰冻（原生 defrost）。空喷也能解自己的冻。
 *
 * 与同族分开：热水抛出的沸水会烫伤并留下烫池；水蒸气是一条向前张开、专化冰冻、且只随强日照变强的扇面。
 */
namespace PokemonSkills {
    /** 蒸汽扇面顶点：origin 为心、朝 direction 张开 angleDegrees、半径 reach；判定与表现共用。 */
    function hydrosteamFan(origin: CombatPoint, direction: CombatPoint, reach: number, angleDegrees: number): CombatPoint[] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const half = Math.max(0, Math.min(180, angleDegrees)) / 2 * Math.PI / 180;
        const base = Math.atan2(heading.z(), heading.x());
        const steps = Math.max(3, Math.round(angleDegrees / 12) + 1);
        const vertices: CombatPoint[] = [origin];
        for (let index = 0; index <= steps; index++) {
            const angle = base - half + (2 * half) * (index / steps);
            vertices.push(origin.plus(WorldCombat.point(Math.cos(angle) * reach, 0, Math.sin(angle) * reach)));
        }
        return vertices;
    }
    function hydrosteamPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: hydrosteamId,
        cooldownParameter: "recharge",
        name: "水蒸气",
        description: "把水烧滚，从身前喷出一条向外张开的蒸汽扇面：范围内敌人受到特殊伤害、被顶开、被熏得湿透，身上的冰冻也被化开。强日照下这一喷更烫，也不会像普通水招那样减弱；朝任意方向都能喷，墙后的目标打不到。",
        uses: ["在烈日下打出一记增强的水击", "一次罩住身前一排敌人", "化开目标身上的冰冻", "空喷化开自己身上的冰冻"],
        kind: "aim",
        range: 8,
        maxRange: 15,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 26,
        style: "steam",
        defaults: { bellow: false, ai: { maxChase: 13, avoidFrozen: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(hydrosteamId, "reach", pokemon) : 8, geometry: "cone", style: "steam", color: 0xE8F0F4,
                label: config && config.bellow === true ? "闷蒸水蒸气" : "喷射水蒸气" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[hydrosteamId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(hydrosteamId, "boil", context)),
                recover: Math.round(p(hydrosteamId, "settle", context)),
                cooldown: Math.round(p(hydrosteamId, "recharge", context)),
                active: 0,
                range: p(hydrosteamId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const reach = p(hydrosteamId, "reach", action);
            const vapor = Math.max(10, Math.round(p(hydrosteamId, "vapor", action)));
            const sunlit = hydrosteamSunlit(action.sense(), action.actor());
            action.present("hydrosteam:boil", hydrosteamScene, 1, action.origin(),
                JSON.stringify({ moment: "boil", reach: reach, vapor: vapor,
                    heat: Math.round(vapor * 0.35) + (sunlit ? 14 : 0), sunlight: sunlit ? 1 : 0,
                    bellow: config && config.bellow === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const delta = action.targetPosition().minus(origin);
            const direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            const reach = Math.max(4, p(hydrosteamId, "reach", action));
            const angle = Math.max(20, Math.min(100, p(hydrosteamId, "angle", action)));
            const power = p(hydrosteamId, "steam", action);
            const soakTicks = Math.max(60, Math.round(p(hydrosteamId, "soakTicks", action)));
            const push = p(hydrosteamId, "push", action);
            const vapor = Math.max(10, Math.round(p(hydrosteamId, "vapor", action)));
            const maxTargets = Math.max(1, Math.round(p(hydrosteamId, "maxTargets", action)));
            const sunlit = hydrosteamSunlit(world, actor);
            const scale = reach / hydrosteamReference;
            const vertices = hydrosteamPath(hydrosteamFan(origin, direction, reach, angle));
            let hits = 0, thawed = 0;

            // 原生 defrost：烧开这炉蒸汽的一刻先解掉自己身上的冰冻（空喷也一样）。
            CombatStatus.cure(world, actor, "frozen");
            sound(action, "cobblemon:move.hydropump.actor");

            const region = WorldGeometry.sector(origin, direction, reach, angle, { below: 2, above: 3 });
            WorldGeometry.selectEnemies(world, region, function (victim, facts) {
                if (hits >= maxTargets) return;
                // 墙后无伤：从身前到目标之间必须有通视线，被实墙挡住的不结算。
                if (!world.clear(origin, facts.position())) return;
                const wasFrozen = CombatStatus.has(world, victim, "frozen");
                if (!hurt(action, victim, hydrosteamId, power, { damage: damageSpec(hydrosteamId, "steam") })) return;
                hits++;
                if (wasFrozen && CombatStatus.cure(world, victim, "frozen")) {
                    thawed++;
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.25, 0)), hydrosteamThawText, [], 24);
                }
                CombatStatus.apply(world, victim, "soaked", hydrosteamSoaked, soakTicks, 0, { secondary: true, unique: true });
                const away = facts.position().minus(origin);
                if (world.valid(victim) && away.length() > 0.2)
                    world.displace(victim, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                WorldFeedback.emit(world, hydrosteamScene, 1, facts.position(),
                    { moment: "scald", target: String(victim.ref()), thawed: wasFrozen ? 1 : 0, push: push,
                        scale: scale, vapor: vapor, sunlight: sunlit ? 1 : 0, intensity: sunlit ? 1.6 : 1 }, 24);
                world.sound("cobblemon:impact.water", facts.position(), 14, "{}");
            });

            WorldFeedback.emit(world, hydrosteamScene, 1, origin,
                { moment: "burst", path: vertices, reach: reach, angle: angle, scale: scale, vapor: vapor,
                    hot: sunlit ? Math.round(vapor * 1.2) : 0,
                    hits: hits, thawed: thawed, sunlight: sunlit ? 1 : 0 }, 36);
            if (sunlit) WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.35, 0)), hydrosteamSunText, [], 28);
            else if (hits > 0) WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.35, 0)), hydrosteamHitText, [hits], 28);
            world.sound("minecraft:block.fire.extinguish", origin, 16, "{}");
            done(action);
        }
    });
}
