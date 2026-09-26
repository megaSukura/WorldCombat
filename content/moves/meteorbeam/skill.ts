/**
 * 流星光束 / meteorbeam —— 出手方式。
 *
 * 核心念头：把天上的碎星拉下来收进身体（特攻抬一级），再朝瞄准的点或实体快照抛出一颗走抛物线的陨石；
 *           它越过掩体落下，真实首碰处炸开一圈、把落点半径内的敌人溅射并顶开。它一定走两幕，没有天气捷径。
 *
 * 两幕：
 *   起（gather，提交前）：星点从高空落向施法者、在脚边溅开；只播预告，可被打断（打断不花 PP，也不给特攻）。
 *   击（throw → flight → burst / miss）：提交后先结算特攻提升，再用 `LivingActions.ballistic` 抛出陨石；
 *       命中活物或落地即碎裂：正面命中的目标吃 `meteor`，落点 `blast` 半径内的其他敌人吃 `splash` 并被顶开；
 *       落点只留一记短促的碎石与尘，不改变地面方块。
 *
 * 掩体：陨石走抛物线，只有真实弧线真的越过掩体才会砸到后面的人；直线视线被挡不再是判据。
 *
 * 与同族分开：日光束是晴天里的即时贯穿、日光刃是贴身横斩、电光束是雨天里的即时电矛；
 *   流星光束是唯一「一定蓄、一定走弧」的那个——特攻提升是它的签名收益，抛物线与落点碎石是它的形状。
 */
namespace PokemonSkills {
    const meteorbeamScene = "world_combat:move_meteorbeam";
    const meteorbeamBoostText = "world_combat.move.meteorbeam.text.boost";
    const meteorbeamShatterText = "world_combat.move.meteorbeam.text.shatter";
    const meteorbeamMissText = "world_combat.move.meteorbeam.text.miss";

    define({
        id: "meteorbeam",
        name: "流星光束",
        description: "站定把碎星收进身体、特攻提升，再朝瞄准的点或目标抛出一颗走抛物线的陨石；它越过掩体落下，正面命中的目标吃重击，落点一圈被溅射并顶开，落地只溅起一记短促碎屑。它一定走这两幕。",
        uses: ["越过掩体砸到后面的人", "先给自己抬一级特攻再出手", "把落点一圈一起砸开"],
        kind: "aim",
        range: 14,
        maxRange: 22,
        prepare: 30,
        active: 60,
        recover: 10,
        cooldown: 52,
        style: "meteor",
        stationary: true,
        defaults: { deep: false, ai: { maxChase: 20, minRange: 4 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("meteorbeam", "blast", pokemon), geometry: "area", style: "meteor", color: 0x9A8A72,
                label: config && config.deep ? "深空流星光束" : "流星光束" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["meteorbeam"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const deep = !!(config && config.deep);
            return {
                prepare: Math.round(p("meteorbeam", "charge", context)),
                recover: Math.round(p("meteorbeam", "recover", context)),
                cooldown: Math.round(p("meteorbeam", "cooldown", context)) + (deep ? 5 : 0),
                active: skills["meteorbeam"].active,
                range: skills["meteorbeam"].range
            };
        },
        windup: function (action, config, prepare) {
            const stars = Math.max(8, Math.round(p("meteorbeam", "starlight", action)));
            action.present("meteorbeam:gather", meteorbeamScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, starlight: stars, deep: config && config.deep ? 1 : 0, target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const point = action.targetPosition();
            const power = p("meteorbeam", "meteor", action);
            const splash = p("meteorbeam", "splash", action);
            const speed = p("meteorbeam", "velocity", action);
            const blast = p("meteorbeam", "blast", action);
            const stone = p("meteorbeam", "stone", action);
            const blowback = p("meteorbeam", "blowback", action);
            const stars = Math.max(8, Math.round(p("meteorbeam", "starlight", action)));
            const stages = Math.max(1, Math.round(p("meteorbeam", "boost", action)));
            const gravity = 0.05;
            const scale = blast / 1.9;
            const intensity = Math.max(0.6, Math.min(2.6, power / 120));
            let settled = false, landing: CombatPoint | null = null, victim: CombatActor | null = null;

            // 聚星完成：特攻提升落在共享能力等级上，命中与否都保留。
            NativeEffects.boost(world, actor, "spa", stages);
            const body = world.observe(actor);
            if (body !== null) {
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), meteorbeamBoostText, [stages], 28);
                WorldFeedback.emit(world, meteorbeamScene, 1, body.position(), { moment: "boost", target: String(actor.ref()), starlight: stars, scale: scale }, 24);
            }
            sound(action, "minecraft:entity.ender_dragon.shoot");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (landing === null) {
                    const miss = current.targetPosition();
                    WorldFeedback.emit(scope, meteorbeamScene, 1, miss, { moment: "miss", point: [miss.x(), miss.y(), miss.z()], scale: scale, starlight: stars }, 20);
                    WorldFeedback.text(scope, miss.plus(WorldCombat.point(0, 1.0, 0)), meteorbeamMissText, [], 24);
                    done(current);
                    return;
                }
                const at = landing;
                const direct = victim !== null && scope.valid(victim) ? victim : null;
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, blast, { below: 2, above: 4 }), function (enemy, facts) {
                    const isDirect = direct !== null && String(enemy.ref()) === String(direct.ref());
                    const blow = isDirect ? power : splash;
                    if (!hurt(current, enemy, "meteorbeam", blow, { damage: damageSpec("meteorbeam", isDirect ? "meteor" : "splash") })) return;
                    hits++;
                    const outward = facts.position().minus(at);
                    if (outward.length() >= 0.05 && scope.valid(enemy)) scope.hitDisplace(enemy, outward.unit().scale(blowback));
                    WorldFeedback.emit(scope, meteorbeamScene, 1, facts.position(),
                        { moment: "burst", target: String(enemy.ref()), starlight: stars, scale: scale, direct: isDirect ? 1 : 0,
                            intensity: Math.max(0.6, Math.min(2.6, blow / 120)) }, 26);
                });
                // 落点只留一记短促的碎石与尘；地面方块不被改写。
                WorldFeedback.emit(scope, meteorbeamScene, 1, at,
                    { moment: "debris", point: [at.x(), at.y(), at.z()], scale: scale, starlight: stars, blast: blast,
                        hits: hits, debris: Math.max(6, 8 + hits), stones: Math.max(3, 4 + hits), intensity: intensity }, 30);
                sound(current, "minecraft:entity.generic.explode");
                sound(current, "cobblemon:impact.rock");
                if (hits > 0) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), meteorbeamShatterText, [hits], 28);
                else WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), meteorbeamMissText, [], 24);
                done(current);
            }

            const launch = LivingActions.ballistic(origin, point, speed, gravity) || aim(action);
            const flight = action.projectile(origin, launch.scale(speed), gravity, stone, action.range() + 4, 160,
                function (current, hit) {
                    if (landing === null) { landing = hit.position(); victim = hit.hitEntity() ? hit.target() : null; }
                    finish(current);
                },
                function (current) { finish(current); },
                JSON.stringify({ sprite: "cobblemon:particle/moves/meteor", scale: Math.max(0.9, stone * 2.4), glow: true, spin: true }));
            WorldFeedback.emit(world, meteorbeamScene, 1, origin,
                { moment: "flight", projectile: flight, scale: scale, starlight: stars, intensity: intensity, blast: blast,
                    direction: [point.minus(origin).x(), point.minus(origin).y(), point.minus(origin).z()] }, 160);
        }
    });
}
