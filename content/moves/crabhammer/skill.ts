/**
 * 蟹钳锤 / crabhammer 的出手方式。
 *
 * 核心念头：把大钳子高举过顶、聚起水光，然后沿面前一道垂直短弧从高到低压下。真实首个实体或地表的接触点决定落点；
 *   砸中的那一下是本组最重的单发，接触处再朝出手方向压出一片低短扇水花，把前方聚堆的旁人一并掀开。裂甲档位下
 *   这一砸还把目标的架势敲裂（物防 −1 级）。前摇很长、看得见，可以被打断。
 *
 * 两幕：
 *   起（hoist，提交前）：举钳、水光在钳口聚起，只播预告（本组最长前摇，可被打断）。
 *   砸（press → slam / crack / shock / miss）：提交后锁定出手方向，钳子沿真实弧线逐刻 trace 压下；
 *       先碰到实体就砸实并结算 slam（裂甲档再敲裂物防并浮字），先碰到方块就在撞点出水；都没碰到就在弧末端散水。
 *       接触处朝出手方向压出 shockRadius 的低短扇水花，排除主目标，墙会遮断。
 *
 * 与同族分开：水流尾是一片向前压的弧形水墙；浊流是脚下铺开的泥；蟹钳锤是唯一「高举过顶的一次垂直重砸 + 前扇水花」。
 */
namespace PokemonSkills {
    define({
        id: crabhammerId,
        cooldownParameter: "recharge",
        name: "Crabhammer",
        description: "把大钳子高举过顶、聚起水光，然后沿面前一道垂直短弧从高到低压下：真实首个实体或地表接触点决定落点，正面目标吃最重的一记单发，接触处再朝出手方向压出一片低短扇水花，把前方聚堆的旁人一并掀开；后方与墙后的人溅不到。裂甲式下砸中还会敲裂目标的物防，代价是更慢更轻；重锤式只追求砸得更狠。",
        uses: ["用一记高举过顶的重砸打出高额单发", "砸地激起一片前扇水浪把旁人掀开", "裂甲档位下敲裂目标的物防"],
        kind: "aim",
        range: 2.6,
        maxRange: 3.4,
        prepare: 16,
        active: 0,
        recover: 11,
        cooldown: 46,
        style: "hammer",
        defaults: { crack: false, ai: { maxChase: 6, crack: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(crabhammerId, "shockRadius", pokemon) : 2.2, geometry: "line", style: "hammer",
                color: 0x1F8FA8, label: config && config.crack === true ? "裂甲式" : "重锤式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[crabhammerId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(crabhammerId, "windupTicks", context)),
                recover: Math.round(p(crabhammerId, "aftercast", context)),
                cooldown: Math.round(p(crabhammerId, "recharge", context)),
                active: 0,
                range: p(crabhammerId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present(crabhammerScene + ":hoist", crabhammerScene, 1, action.origin(),
                JSON.stringify({ moment: "hoist", windup: prepare, crack: config && config.crack ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world();
            var actor = action.actor();
            var body = world.observe(actor);
            var centre = body === null ? action.origin() : body.position();
            var height = body === null ? 1.4 : body.height();
            var reach = Math.max(1.8, action.range());
            var heading = WorldGeometry.flatUnit(aim(action), WorldCombat.point(0, 0, 1));
            var slam = p(crabhammerId, "slam", action);
            var shock = p(crabhammerId, "shock", action);
            var radius = Math.max(1.2, p(crabhammerId, "shockRadius", action));
            var shove = p(crabhammerId, "shove", action);
            var splash = Math.max(8, Math.round(p(crabhammerId, "splash", action)));
            var crack = Math.max(0, Math.round(p(crabhammerId, "crackStages", action)));
            var sweepTicks = Math.max(3, Math.round(p(crabhammerId, "sweep", action)));
            var gauge = Math.max(0.3, Math.min(0.8, reach * 0.22));
            var span = 90;
            var scale = Math.max(0.6, Math.min(2.2, radius / 2.2));
            var intensity = Math.max(0.6, Math.min(2.2, slam / 100));
            var topHeight = height * 0.9 + reach * 0.5;
            var scenes = WorldFeedback.actionScenes(crabhammerScene);
            var forward = WorldCombat.point(heading.x(), 0, heading.z());
            var directRef = "", struck = 0;

            /** 弧上一点：越往后越向前、越低。 */
            function tipAt(t: number): CombatPoint {
                var distance = reach * (0.3 + 0.7 * t);
                return WorldCombat.point(centre.x() + heading.x() * distance,
                    centre.y() + topHeight * Math.pow(1 - t, 1.4) + 0.15,
                    centre.z() + heading.z() * distance);
            }

            /** 接触处朝出手方向的低短扇水花：排除主目标、墙遮断、每人只结算一次。 */
            function shockFan(current: CombatAction, originPoint: CombatPoint): void {
                var scope = current.world();
                WorldFeedback.emit(scope, crabhammerScene, 1, originPoint,
                    { moment: "shock", direction: [forward.x(), forward.y(), forward.z()], radius: radius, span: span,
                        splash: splash, scale: scale, intensity: Math.max(0.4, Math.min(2.0, shock / 40)) }, 24);
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(originPoint, forward, radius, span, { below: 1.6, above: 2.4 }),
                    function (enemy, facts) {
                        if (directRef !== "" && String(enemy.ref()) === directRef) return;
                        var point = facts.position();
                        if (!scope.clear(originPoint, point)) return;
                        if (!hurt(current, enemy, crabhammerId, shock, { damage: damageSpec(crabhammerId, "shock") })) return;
                        struck++;
                        WorldFeedback.emit(scope, crabhammerScene, 1, point,
                            { moment: "shock", target: String(enemy.ref()), direction: [forward.x(), forward.y(), forward.z()],
                                splash: splash, scale: scale, intensity: Math.max(0.4, Math.min(2.0, shock / 40)) }, 22);
                        var away = point.minus(originPoint);
                        if (scope.valid(enemy) && away.length() >= 0.05) scope.hitDisplace(enemy, away.unit().scale(shove));
                    });
            }

            /** 一次接触落地：实体吃 slam（可选裂甲），方块在表面出水；两者都在接触点压出前扇水花。 */
            function land(current: CombatAction, contact: CombatImpact | null, arcEnd: CombatPoint): void {
                var scope = current.world();
                var point = arcEnd, face = "";
                if (contact !== null && contact.hitEntity()) {
                    var victim = contact.target();
                    if (victim !== null && (String(victim.ref()) === String(actor.ref()) || scope.friendly(victim))) victim = null;
                    if (victim !== null && hurt(current, victim, crabhammerId, slam, { damage: damageSpec(crabhammerId, "slam"), contact: true })) {
                        directRef = String(victim.ref());
                        struck++;
                        var now = scope.observe(victim);
                        point = now === null ? contact.position() : now.position();
                        WorldFeedback.emit(scope, crabhammerScene, 1, point,
                            { moment: "slam", target: directRef, splash: splash, direction: [forward.x(), forward.y(), forward.z()],
                                scale: scale, intensity: intensity }, 24);
                        scope.sound("cobblemon:impact.water", point, 15, "{}");
                        var away = point.minus(centre);
                        if (scope.valid(victim) && away.length() >= 0.05) scope.displace(victim, away.unit().scale(shove));
                        if (crack > 0 && scope.valid(victim)) {
                            NativeEffects.boost(scope, victim, "def", -crack);
                            WorldFeedback.emit(scope, crabhammerScene, 1, point, { moment: "crack", target: directRef, stages: crack, scale: scale }, 24);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), crabhammerCrackText, [crack], 26);
                            scope.sound("minecraft:block.deepslate.break", point, 14, "{}");
                        }
                    }
                } else if (contact !== null && contact.blocked()) {
                    var cell = contact.blockPosition();
                    point = cell === null ? contact.position() : cell;
                    face = contact.blockFace();
                    WorldFeedback.emit(scope, crabhammerScene, 1, point,
                        { moment: "slam", splash: splash, face: face, direction: [forward.x(), forward.y(), forward.z()],
                            scale: scale, intensity: intensity }, 24);
                    scope.sound("minecraft:block.anvil.land", point, 15, "{}");
                }
                shockFan(current, point);
                if (struck === 0) {
                    WorldFeedback.emit(scope, crabhammerScene, 1, point, { moment: "miss", splash: splash, face: face, scale: scale }, 22);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), crabhammerMissText, [], 24);
                }
                scenes.stop(current, "press");
                scenes.finish(current, done);
            }

            /** 沿真实垂直弧逐刻 trace 压下：首个实体或方块接触就落地，否则到弧末端落地。 */
            function press(current: CombatAction, tick: number, from: CombatPoint): void {
                var progress = sweepTicks <= 1 ? 1 : (tick + 1) / sweepTicks;
                var tip = tipAt(progress);
                scenes.show(current, "press", tip,
                    { moment: "press", path: [[from.x(), from.y(), from.z()], [tip.x(), tip.y(), tip.z()]],
                        direction: [forward.x(), forward.y(), forward.z()], scale: scale, intensity: intensity });
                var contact = current.trace(from, tip, gauge, true);
                if (contact.hitEntity() || contact.blocked()) { land(current, contact, tip); return; }
                if (tick + 1 >= sweepTicks) { land(current, null, tip); return; }
                current.after(1, function (next: CombatAction) { press(next, tick + 1, tip); });
            }

            sound(action, "minecraft:block.anvil.land");
            press(action, 0, tipAt(0));
        }
    });
}
