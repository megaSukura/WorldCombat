/**
 * 电光束 / electroshot —— 出手方式。
 *
 * 核心念头：把四周的电抽进身体（特攻 +1），再射出一束会追着目标走的高压电矛；下雨时电直接从雨里取，抬手即发。
 *
 * 两幕（雨天只有第二幕）：
 *   起（gather，提交前）：电沿着地面与身体四周爬升、卷成一道矛尖；只播预告，可被打断（打断不花 PP）。
 *   击（shot → travel → burst / fizzle）：提交后先结算特攻 +1，再射出一束高速电矛；
 *       它会朝目标修正（homing，转向强度由 `homing` 决定），命中处结算 `lance` 并补一道纯视觉的闪电闪光；
 *       打空只留一下散开的电弧。
 *
 * 与同族分开：日光束是晴天里的宽光带、日光刃是贴身斩、流星光束一定蓄且走弧；
 *   电光束是唯一「雨天即时、单体追踪」的那个——它的价值在晴天要站定聚电、雨天立刻抬手打出去。
 */
namespace PokemonSkills {
    const electroshotScene = "world_combat:move_electroshot";
    const electroshotRainText = "world_combat.move.electroshot.text.rain";
    const electroshotBoostText = "world_combat.move.electroshot.text.boost";
    const electroshotHitText = "world_combat.move.electroshot.text.hit";
    const electroshotMissText = "world_combat.move.electroshot.text.miss";

    define({
        id: "electroshot",
        name: "电光束",
        description: "站定把电从四周抽进身体、特攻提升，再射出一束会追着目标走的高压电矛。下雨时直接从雨里取电、当场发射。晴天要站定聚电，雨天立刻抬手打出去。",
        uses: ["雨天里的即时高压点射", "追着走位也甩不掉的一束", "先攒一级特攻再出手"],
        kind: "enemy",
        range: 15,
        maxRange: 24,
        prepare: 26,
        active: 0,
        recover: 8,
        cooldown: 46,
        style: "electro",
        stationary: true,
        defaults: { chase: false, ai: { maxChase: 22, minRange: 4, rainFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("electroshot", "reach", pokemon), geometry: "line", style: "electro", color: 0xFFE84D,
                label: config && config.chase ? "电光束·追踪" : "电光束·直射" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["electroshot"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const chase = !!(config && config.chase);
            return {
                prepare: Math.round(p("electroshot", "charge", context)),
                recover: Math.round(p("electroshot", "recover", context)),
                cooldown: Math.round(p("electroshot", "cooldown", context)) + (chase ? 3 : 0),
                active: skills["electroshot"].active,
                range: p("electroshot", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const arcs = Math.max(10, Math.round(p("electroshot", "arcs", action)));
            const instant = p("electroshot", "charge", action) <= 0 ? 1 : 0;
            action.present("electroshot:gather", electroshotScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, arcs: arcs, rain: instant, chase: config && config.chase ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const power = p("electroshot", "lance", action);
            const speed = p("electroshot", "velocity", action);
            const radius = p("electroshot", "radius", action);
            const turn = p("electroshot", "homing", action);
            const arcs = Math.max(10, Math.round(p("electroshot", "arcs", action)));
            const stages = Math.max(1, Math.round(p("electroshot", "boost", action)));
            const scale = Math.max(0.6, Math.min(2.2, power / 130));
            const intensity = Math.max(0.6, Math.min(2.6, power / 130));
            const target = action.target();
            let settled = false;

            // 聚电完成：特攻提升落在共享能力等级上，命中与否都保留。
            NativeEffects.boost(world, actor, "spa", stages);
            const body = world.observe(actor);
            if (body !== null) {
                WorldFeedback.emit(world, electroshotScene, 1, body.position(), { moment: "shot", target: String(actor.ref()), arcs: arcs, scale: scale }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), electroshotBoostText, [stages], 26);
            }
            if (p("electroshot", "charge", action) <= 0 && body !== null)
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.8, 0)), electroshotRainText, [], 24);
            sound(action, "cobblemon:move.thunderbolt.actor");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/orb/energyorb", tint: 0xFFE84D, glow: true,
                scale: Math.max(0.9, Math.min(1.8, radius / 0.26))
            };
            if (target !== null && world.valid(target))
                appearance.homing = { target: String(target.ref()), turn: turn, delay: 1, range: action.range() + 6 };

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: Math.max(30, Math.round(action.range() / Math.max(0.2, speed) + 30)),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        impact(current, hit, "electroshot", power, { damage: damageSpec("electroshot", "lance") });
                        scope.lightning(point, true);
                        WorldFeedback.emit(scope, electroshotScene, 1, point,
                            { moment: "burst", target: String(victim.ref()), arcs: arcs, scale: scale, intensity: intensity }, 26);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), electroshotHitText, [], 24);
                        sound(current, "minecraft:item.trident.thunder");
                        sound(current, "cobblemon:move.thunderbolt.target");
                    } else {
                        WorldFeedback.emit(scope, electroshotScene, 1, point, { moment: "fizzle", point: [point.x(), point.y(), point.z()], arcs: arcs, scale: scale }, 20);
                    }
                }
            }, function (current: CombatAction) { finish(current); });

            WorldFeedback.keep(world, "electroshot:travel:" + action.id(), electroshotScene, 1, origin,
                { moment: "travel", projectile: flight, arcs: arcs, scale: scale, intensity: intensity }, 90);
        }
    });
}
