/**
 * 起风 / gust 的出手方式。
 *
 * 核心念头：**振翅扇出一记又短又快的压缩风弹，正中目标就把它沿风的方向推开**——对手要是正离地，
 *   这一记把它吹得更远、还往上托一点。它是飞系里最便宜、回得最快的远程一记，会小幅修向目标、几乎不落空。
 *
 * 三幕（提交前只播预告）：
 *   起（gather，提交前）：翅缘卷起一环气旋、气团朝翅尖收，只播预告。
 *   飞（flight，提交后）：风弹沿瞄准方向弹出、小幅追踪目标；飞过的路上拖着螺旋的气团。
 *   击（burst / dissipate）：命中活物结算一记 `blast` 特殊伤害，并沿**风实际吹到的方向**把它推开
 *       `push` 格（离地目标 ×1.8 并上托）；打空或撞地就在落点散开。
 *
 * 选取 `kind: "aim"`：方向、世界点或任意阵营实体都能扇，无敌也能空放；命中权限仍由命中层判断。
 *   目标为 null 时不做追踪，沿提交朝向直飞并对落点散开，不为空放提前收招。
 *
 * 与同族分开：空气斩是一道薄月牙直线切开、空气利刃是张开一整片扇面、暴风是一堵会走的宽风墙；起风是一发
 *   即散、专门用来推人的小风团，玩家凭「一团风把人推着走」认出它。
 *
 * 配置 `shove`（推风式）由公式改推力/威力/半径、由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const gustScene = "world_combat:move_gust";
    const gustLiftText = "world_combat.move.gust.text.lift";
    const gustMissText = "world_combat.move.gust.text.miss";

    /** 风弹接触那一刻的真实风向：优先用捕获的投射物轨迹末段，其次施法者→接触点，最后退回瞄准朝向。 */
    function gustImpactHeading(hit: CombatImpact, origin: CombatPoint, at: CombatPoint, fallback: CombatPoint): CombatPoint {
        const path = JSON.parse(hit.projectilePath() || "[]");
        if (Array.isArray(path) && path.length > 0) {
            const last = path[path.length - 1];
            if (last && Array.isArray(last.from) && Array.isArray(last.to)) {
                const delta = WorldCombat.point(last.to[0] - last.from[0], 0, last.to[2] - last.from[2]);
                if (delta.length() > 0.01) return delta.unit();
            }
        }
        const flown = WorldCombat.point(at.x() - origin.x(), 0, at.z() - origin.z());
        if (flown.length() > 0.01) return flown.unit();
        const flat = WorldCombat.point(fallback.x(), 0, fallback.z());
        return flat.length() > 0.01 ? flat.unit() : WorldCombat.point(0, 0, 1);
    }

    define({
        id: "gust",
        cooldownParameter: "recharge",
        name: "Gust",
        description: "振翅扇出一记短促的压缩风弹：飞向瞄准的方向或实体，命中的对手被沿风实际吹到的方向推开，正离地的目标被吹得更远、还往上托一点。可以朝空地空放；它便宜、回得快、对实体小幅追踪；推风式推得更远、威力更轻，削风式更重、推得更近。",
        uses: ["便宜、快速的远程消耗，一记接一记地扇", "把对手推离掩体、推下平台或推开队友", "对飞在空中的目标吹得更远"],
        kind: "aim",
        range: 9,
        maxRange: 13,
        prepare: 5,
        active: 0,
        recover: 6,
        cooldown: 14,
        style: "gust",
        maximumTicks: 220,
        defaults: { shove: false, ai: { maxChase: 13, flyers: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("gust", "reach", pokemon), geometry: "line", style: "air", color: 0xDCE9F0,
                label: config && config.shove === true ? "推风" : "削风" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["gust"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("gust", "tempo", context)),
                recover: Math.round(p("gust", "aftercast", context)),
                cooldown: Math.round(p("gust", "recharge", context)),
                active: 0,
                range: p("gust", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:gust:" + action.id(), gustScene, 1, action.origin(), JSON.stringify({
                moment: "gather", shove: config && config.shove === true ? 1 : 0, scale: scale,
                motes: Math.round(p("gust", "motes", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const target = action.target();
            const power = p("gust", "blast", action);
            const speed = Math.max(0.5, p("gust", "velocity", action));
            const radius = Math.max(0.2, p("gust", "radius", action));
            const reach = Math.max(4, p("gust", "reach", action));
            const pushBase = Math.max(0, p("gust", "push", action));
            const motes = Math.max(6, Math.round(p("gust", "motes", action)));
            const shove = !!(config && config.shove);
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.55));
            // trail 模式忽略 rate；风纹密度接有效的 amount，数量由风团量派生但保持个位数。
            const density = Math.max(1, Math.min(4, Math.round(motes / 7)));
            const intensity = Math.max(0.5, Math.min(2.0, power / 34));
            const scenes = WorldFeedback.actionScenes(gustScene);
            // 口前起点与原生弹出生处统一：同一个实际点既画放出，也交给 projectile 当起点与瞄准基准。
            const body = world.observe(action.actor());
            const launch = origin.plus(WorldCombat.point(0, body === null ? 0.8 : body.height() * 0.6, 0));
            const wanted = target !== null ? action.targetPosition().minus(launch) : WorldCombat.point(0, 0, 0);
            const direction = wanted.length() < 0.01 ? action.direction() : wanted.unit();
            let settled = false, struck = false, flight = "";

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            const appearance: any = { tint: 0xDCE9F0 };
            if (target !== null) appearance.homing = { target: String(target.ref()), turn: 14, delay: 1, range: reach };

            sound(action, "cobblemon:move.gust.actor");
            WorldFeedback.emit(world, gustScene, 1, launch,
                { moment: "release", motes: motes, density: density, scale: scale, intensity: intensity, shove: shove ? 1 : 0 }, 16, "gust:release");

            flight = LivingActions.projectile(action, {
                speed: speed, direction: direction, origin: launch, gravity: 0, range: reach, radius: radius, lifetime: 160,
                appearance: appearance,
                impact: function (inner: CombatAction, hit: CombatImpact): void {
                    struck = true;
                    const scope = inner.world(), at = hit.position(), struckTarget = hit.target();
                    scenes.stop(inner, "flight");
                    if (hit.hitEntity() && struckTarget !== null && scope.valid(struckTarget) && !scope.friendly(struckTarget)) {
                        if (!impact(inner, hit, "gust", power, { damage: damageSpec("gust", "blast"), flags: { wind: true } })) return;
                        const before = scope.observe(struckTarget);
                        const airborne = before !== null && (!before.grounded()
                            || CombatStatus.has(scope, struckTarget, "fly") || CombatStatus.has(scope, struckTarget, "magnetrise"));
                        const heading = gustImpactHeading(hit, launch, at, direction);
                        const distance = pushBase * (airborne ? 1.8 : 1);
                        const lift = airborne ? 0.35 : 0;
                        // 敌方推动走受击位移：原生抗击退/事件生效，推不动就不算被吹走。
                        const moved = scope.hitDisplace(struckTarget, WorldCombat.point(heading.x() * distance, lift, heading.z() * distance));
                        // 托举只按实际向上的位移表现：被墙卡住的纯水平推动不会有升高，真正被抬起才亮。
                        const after = scope.valid(struckTarget) ? scope.observe(struckTarget) : null;
                        const climbed = before !== null && after !== null ? after.position().y() - before.position().y() : 0;
                        const lifted = airborne && moved > 0.05 && climbed > 0.02;
                        WorldFeedback.emit(scope, gustScene, 1, at,
                            { moment: "burst", target: String(struckTarget.ref()), push: Math.round(moved * 100) / 100, motes: motes, density: density,
                                scale: scale, intensity: intensity, airborne: airborne ? 1 : 0, lift: lifted ? 12 : 0,
                                direction: [heading.x(), heading.y(), heading.z()] }, 22);
                        sound(inner, "cobblemon:move.gust.target");
                        if (lifted) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), gustLiftText, [], 24);
                        return;
                    }
                    WorldFeedback.emit(scope, gustScene, 1, at,
                        { moment: "dissipate", motes: Math.round(motes * 0.5), density: density, scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.5, 0)), gustMissText, [], 18);
                }
            }, function (inner: CombatAction) {
                // 自然飞尽：用 projectilePosition 的真实末点散风，不用满射程点或发射原点假造终点。
                scenes.stop(inner, "flight");
                if (!struck) {
                    const end = inner.world().projectilePosition(flight);
                    if (end !== null)
                        WorldFeedback.emit(inner.world(), gustScene, 1, end,
                            { moment: "dissipate", motes: Math.round(motes * 0.5), density: density, scale: scale }, 18);
                }
                finish(inner);
            });
            scenes.show(action, "flight", launch,
                { moment: "flight", projectile: flight, motes: motes, density: density, scale: scale, intensity: intensity });
        }
    });
}
