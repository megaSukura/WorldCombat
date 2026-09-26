/**
 * 地裂 / fissure 的出手方式。
 *
 * 核心念头：把震荡压进土里，一道裂缝沿地表直窜到对手脚下张口——站在这块地上的人被吞下去。
 *   它隔得远、打得准，但只认站在地上的目标；张口前的那段预告就是对手走开的窗口。
 *
 * 两幕：
 *   起（windup，提交前）：蹲身、脚下起屑，只播预告，可被打断。
 *   裂（mark → break / miss，提交后）：锁定目标脚下的地面，画出一道从施法者到落点的裂缝线，
 *       预告 `mark` 刻后张口；仍然站在坑里、且站在地上的目标被 `fissureExecute` 一次结清，
 *       随后沿这条路把自然地表撕开一道真裂缝（world.terrain 租约，replace 盖住、linger 活过招式）。
 *
 * 反制：走开落点、跳起来（离地免疫）、或换成飞行属性；打断起手也让这一记白费。
 */
namespace PokemonSkills {
    define({
        requiresGround: true,
        id: fissureId,
        cooldownParameter: "recharge",
        name: "Fissure",
        description: "把震荡压进土里，一道裂缝沿地表直窜到对手脚下张口——站在那块地上的人被一次结清（一击必杀）。它隔得远，但只认站在地上、且属性上吃得到地面系的目标；张口前的预告就是对手走开的窗口。",
        uses: ["从远处点掉一个站在地上的高价值目标", "逼对手离开脚下的位置或跳起来", "在地面留下裂缝，标出这块地不再安全"],
        kind: "aim",
        range: 7,
        maxRange: 11,
        prepare: 16,
        active: 0,
        recover: 10,
        cooldown: 96,
        style: "quake",
        defaults: { deep: false, ai: { maxChase: 10, executionAbove: 0.2 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[fissureId], detail: { values: config } };
            return { radius: pokemon ? p(fissureId, "sink", context) : fissureReference, geometry: "area", style: "quake",
                color: 0x8D6E3A, label: config && config.deep === true ? "地裂·深裂" : "地裂·速裂" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[fissureId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(fissureId, "tempo", context)),
                recover: Math.round(p(fissureId, "aftercast", context)),
                cooldown: Math.round(p(fissureId, "recharge", context)),
                active: 0,
                range: p(fissureId, "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null) return "";
            if (!world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (!body.grounded()) return "target-airborne";
            const line = body.position().minus(action.origin());
            if (line.length() > action.range() + 0.5) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_fissure:windup", fissureScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: config && config.deep === true,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const origin = action.origin(), direction = aim(action);
            const body = target !== null && world.valid(target) ? world.observe(target) : null;
            const at = body !== null ? body.position() : action.targetPosition();
            const targetRef = target === null ? "" : String(target.ref());
            const sink = Math.max(1.2, p(fissureId, "sink", action));
            const mark = Math.max(8, Math.round(p(fissureId, "mark", action)));
            const spall = Math.max(8, Math.round(p(fissureId, "spall", action)));
            const ticks = Math.max(100, Math.round(p(fissureId, "rentTicks", action)));
            const cells = Math.max(16, Math.round(p(fissureId, "rentCells", action)));
            const scale = sink / fissureReference;
            const span = at.minus(origin).length();
            const flow = span < 0.05 ? WorldCombat.point(0, 1, 0) : at.minus(origin).unit();

            WorldFeedback.emit(world, fissureScene, 1, at,
                { moment: "mark", target: targetRef, path: [String(actor.ref()), [at.x(), at.y(), at.z()]],
                    direction: [flow.x(), flow.y(), flow.z()], span: span, radius: sink, spall: spall, scale: scale }, mark + 24);
            sound(action, "minecraft:block.deepslate.break");

            action.releaseTarget();
            action.after(mark, function (current: CombatAction) {
                const scope = current.world();
                let victim: CombatActor | null = null, nearest = Infinity, airborne = false;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, sink, { below: 2, above: 2 }), function (enemy, facts) {
                    if (!facts.grounded()) { airborne = true; return; }
                    const distance = facts.position().minus(at).length();
                    if (distance < nearest && scope.clear(origin, facts.position())) { victim = enemy; nearest = distance; }
                });
                const result = victim === null ? "miss" : fissureExecute(current, victim);
                const placed = fissureRent(scope, current.origin(), at, sink, ticks, cells);
                if (result === "kill") {
                    WorldFeedback.emit(scope, fissureScene, 1, at,
                        { moment: "break", target: targetRef, radius: sink, cells: placed, spall: spall, scale: scale }, 30);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), fissureBreakText, [], 28);
                    scope.sound("cobblemon:impact.ground", at, 16, "{}");
                } else {
                    WorldFeedback.emit(scope, fissureScene, 1, at, { moment: "miss", radius: sink, scale: scale }, 22);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.8, 0)), result === "resisted" ? "world_combat.move.fissure.text.resisted" : airborne ? fissureAirText : fissureMissText, [], 22);
                    scope.sound("minecraft:block.gravel.break", at, 12, "{}");
                }
                WorldFeedback.emit(scope, fissureScene, 1, at, { moment: "rent", radius: sink, cells: placed, scale: scale }, 34);
                done(current);
            });
        }
    });
}
