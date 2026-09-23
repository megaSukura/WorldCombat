/**
 * 起风 / gust 的出手方式。
 *
 * 核心念头：**振翅扇出一记又短又快的压缩风弹，正中目标就把它沿风的方向推开**——对手要是正离地，
 *   这一记把它吹得更远、还往上托一点。它是飞系里最便宜、回得最快的远程一记，会小幅修向目标、几乎不落空。
 *
 * 三幕（提交前只播预告）：
 *   起（gather，提交前）：翅缘卷起一环气旋、气团朝翅尖收，只播预告。
 *   飞（flight，提交后）：风弹沿直线弹出、小幅追踪目标；飞过的路上拖着螺旋的气团。
 *   击（burst / dissipate）：命中活物结算一记 `blast` 特殊伤害，并沿背离施法者的方向把它推开
 *       `push` 格（离地目标 ×1.8 并上托）；打空或撞地就在落点散开。
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

    define({
        id: "gust",
        cooldownParameter: "recharge",
        name: "Gust",
        description: "振翅扇出一记短促的压缩风弹：命中的对手被沿风的方向推开，正离地的目标被吹得更远、还往上托一点。它便宜、回得快、会小幅追踪；推风式推得更远、威力更轻，削风式更重、推得更近。",
        uses: ["便宜、快速的远程消耗，一记接一记地扇", "把对手推离掩体、推下平台或推开队友", "对飞在空中的目标吹得更远"],
        kind: "enemy",
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
            const intensity = Math.max(0.5, Math.min(2.0, power / 34));
            const direction = aim(action);
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            const appearance: any = { tint: 0xDCE9F0 };
            if (target !== null) appearance.homing = { target: String(target.ref()), turn: 14, delay: 1, range: reach + 2 };

            sound(action, "cobblemon:move.gust.actor");
            WorldFeedback.emit(world, gustScene, 1, origin,
                { moment: "release", motes: motes, scale: scale, intensity: intensity, shove: shove ? 1 : 0 }, 16);

            const flight = LivingActions.projectile(action, {
                speed: speed, direction: direction, gravity: 0, range: reach + 3, radius: radius, lifetime: 160,
                appearance: appearance,
                impact: function (inner: CombatAction, hit: CombatImpact): void {
                    const scope = inner.world(), at = hit.position(), struck = hit.target();
                    if (hit.hitEntity() && struck !== null && scope.valid(struck) && !scope.friendly(struck)) {
                        if (!impact(inner, hit, "gust", power, { damage: damageSpec("gust", "blast"), flags: { wind: true } })) return;
                        const body = scope.observe(struck);
                        const airborne = body !== null && (!body.grounded()
                            || CombatStatus.has(scope, struck, "fly") || CombatStatus.has(scope, struck, "magnetrise"));
                        const distance = pushBase * (airborne ? 1.8 : 1);
                        if (scope.valid(struck)) {
                            const delta = at.minus(origin);
                            const flat = WorldCombat.point(delta.x(), 0, delta.z());
                            const heading = flat.length() < 0.01 ? WorldCombat.point(direction.x(), 0, direction.z()) : flat.unit();
                            scope.displace(struck, WorldCombat.point(heading.x() * distance, airborne ? 0.35 : 0, heading.z() * distance));
                        }
                        WorldFeedback.emit(scope, gustScene, 1, at,
                            { moment: "burst", target: String(struck.ref()), push: distance, motes: motes, scale: scale,
                                intensity: intensity, airborne: airborne ? 1 : 0, lift: airborne ? 12 : 0 }, 22);
                        sound(inner, "cobblemon:move.gust.target");
                        if (airborne) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), gustLiftText, [], 24);
                        return;
                    }
                    WorldFeedback.emit(scope, gustScene, 1, at,
                        { moment: "dissipate", motes: Math.round(motes * 0.5), scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.5, 0)), gustMissText, [], 18);
                }
            }, function (inner: CombatAction) { finish(inner); });
            WorldFeedback.keep(world, "gust:flight:" + action.id(), gustScene, 1, origin,
                { moment: "flight", projectile: flight, motes: motes, scale: scale, intensity: intensity }, 160);
        }
    });
}
