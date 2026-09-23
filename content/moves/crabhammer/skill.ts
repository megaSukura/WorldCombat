/**
 * 蟹钳锤 / crabhammer 的出手方式。
 *
 * 核心念头：把大钳子高举过顶、聚起水光，然后垂直砸下——这一下是本组最重的单发；砸地的同时地面荡开一圈水浪，
 *   把落点附近的其他敌人一并掀开。裂甲档位下砸中还会敲裂目标的架势（物防 −1 级）。前摇很长、看得见，可以被打断。
 *
 * 两幕：
 *   起（hoist，提交前）：举钳、水光在钳口聚起，只播预告（本组最长前摇，可被打断）。
 *   砸（slam → crack / shock / miss）：提交后一记下砸结算正面目标（slam）；命中若为裂甲档则敲裂其物防并浮字；
 *       同时地面水环罩住 shockRadius 内其他敌人，各吃一记 shock 并按 shove 被掀开。谁都没砸到就只留水花。
 *
 * 与同族分开：水流尾是一片向前压的弧形水墙；浊流是脚下铺开的泥；蟹钳锤是唯一「高举过顶的一次垂直重砸 + 地面水环」。
 */
namespace PokemonSkills {
    define({
        id: crabhammerId,
        cooldownParameter: "recharge",
        name: "Crabhammer",
        description: "把大钳子高举过顶、聚起水光，然后垂直砸下：正面目标吃最重的一记单发，落点同时荡开一圈地面水浪，把附近其他敌人一并掀开。裂甲式下砸中还会敲裂目标的物防，代价是更慢更轻；重锤式只追求砸得更狠。",
        uses: ["用一记高举过顶的重砸打出高额单发", "砸地激起一圈水浪把旁人掀开", "裂甲档位下敲裂目标的物防"],
        kind: "enemy",
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
            return { radius: pokemon ? p(crabhammerId, "shockRadius", pokemon) : 2.2, geometry: "circle", style: "hammer",
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
            var reach = Math.max(1.8, action.range());
            var slam = p(crabhammerId, "slam", action);
            var shock = p(crabhammerId, "shock", action);
            var radius = Math.max(1.2, p(crabhammerId, "shockRadius", action));
            var shove = p(crabhammerId, "shove", action);
            var splash = Math.max(8, Math.round(p(crabhammerId, "splash", action)));
            var crack = Math.max(0, Math.round(p(crabhammerId, "crackStages", action)));
            var scale = Math.max(0.6, Math.min(2.2, radius / 2.2));
            var intensity = Math.max(0.6, Math.min(2.2, slam / 100));
            var target = action.target();
            var at = action.targetPosition();
            var targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            if (targetBody !== null) at = targetBody.position();
            var struck = 0, directRef = "";

            if (target !== null && targetBody !== null && targetBody.position().minus(centre).length() <= reach + 0.7) {
                if (hurt(action, target, crabhammerId, slam, { damage: damageSpec(crabhammerId, "slam"), contact: true })) {
                    struck++;
                    directRef = String(target.ref());
                    var now = world.observe(target);
                    var point = now === null ? at : now.position();
                    WorldFeedback.emit(world, crabhammerScene, 1, point,
                        { moment: "slam", target: directRef, splash: splash, scale: scale, intensity: intensity }, 24);
                    world.sound("cobblemon:impact.water", point, 15, "{}");
                    var away = point.minus(centre);
                    if (world.valid(target) && away.length() >= 0.05) world.displace(target, away.unit().scale(shove));
                    if (crack > 0 && world.valid(target)) {
                        NativeEffects.boost(world, target, "def", -crack);
                        WorldFeedback.emit(world, crabhammerScene, 1, point,
                            { moment: "crack", target: directRef, stages: crack, scale: scale }, 24);
                        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), crabhammerCrackText, [crack], 26);
                        world.sound("minecraft:block.deepslate.break", point, 14, "{}");
                    }
                }
            }

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(at, 0, radius, { below: 2, above: 3 }), function (enemy, facts) {
                if (String(enemy.ref()) === directRef) return;
                if (!hurt(action, enemy, crabhammerId, shock, { damage: damageSpec(crabhammerId, "shock") })) return;
                struck++;
                var point = facts.position();
                WorldFeedback.emit(world, crabhammerScene, 1, point,
                    { moment: "shock", target: String(enemy.ref()), splash: splash, scale: scale,
                        intensity: Math.max(0.4, Math.min(2.0, shock / 40)) }, 22);
                var away = point.minus(at);
                if (world.valid(enemy) && away.length() >= 0.05) world.displace(enemy, away.unit().scale(shove));
            });

            WorldFeedback.emit(world, crabhammerScene, 1, at,
                { moment: "shock", splash: splash, radius: radius, scale: scale, intensity: intensity }, 26);
            sound(action, "minecraft:block.anvil.land");
            if (struck === 0) {
                WorldFeedback.emit(world, crabhammerScene, 1, at, { moment: "miss", splash: splash, scale: scale }, 22);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.9, 0)), crabhammerMissText, [], 24);
            }
            done(action);
        }
    });
}
