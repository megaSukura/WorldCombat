/**
 * 鳞片噪音 / clangingscales 的出手方式。本族「拆甲换力」的环身声爆型。
 *
 * 核心念头：**擦身成钟**——把全身鳞片绷紧摩擦，一圈声波从身体炸开，震伤身周所有敌人并把它们沿离中心方向
 *   推开；响声过后鳞片松了，自身防御下降。它不看地面、没有飞行物，声压就是它的形状。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：绷紧身体、鳞片竖起、边缘泛起共鸣的光，空气开始嗡鸣；起手可被打断，此时代价未结清。
 *   响（burst → hit）：提交后一圈声波（`ringRadius`）从身体炸开；圈内每个非友方按到中心的距离衰减后各挨一次
 *       `clang` 特殊伤害，并被沿离中心方向震退一个按**该目标自身**体重与数据求出的 `shock`（近处推得更远、
 *       重目标推不动）。声波可达性按共享 `sound` 属性与真实通视/高度复核，不凭圆柱穿过厚墙。
 *   松（loose）：鳞片松开，自身防御 −`guardLoss`，浮字提示；无命中同样要付。
 *       回响式（配置 echo）先在身上亮一圈短促预告，隔 `echoDelay` 再于当时身体真实新位置荡出 `echoShare`
 *       的二段声波（半径为主震的 `echoScale`），预告与第二响在同一回调里收掉。
 *
 * 与同族分开：蛮力是近身单体最重、鳞射是远距多段提速、火焰鞭是剥对手甲；
 *   鳞片噪音是**唯一环身范围**的招式，代价同样是自身的防御等级。与爆音波分开：爆音波是普通属性、无自降防；
 *   鳞片噪音是龙属性、必然自降防，并有可选的第二圈回响。
 *
 * 配置 `echo` 由公式改削防级与回响参数，由本文件改第二圈结算；提交后才触碰世界。
 * 选取与目标：自身范围，无选敌也可用、也照付降防成本。
 */
namespace PokemonSkills {
    const clangingscalesScene = "world_combat:move_clangingscales";
    const clangingscalesLooseText = "world_combat.move.clangingscales.text.loose";
    const clangingscalesHitText = "world_combat.move.clangingscales.text.hit";
    const clangingscalesMissText = "world_combat.move.clangingscales.text.miss";
    /** 与判定和网格一致的高度带。 */
    const clangingscalesBelow = 3.5;
    const clangingscalesAbove = 4.0;

    define({
        id: "clangingscales",
        cooldownParameter: "recharge",
        name: "Clanging Scales",
        description: "绷紧全身鳞片摩擦，一圈声波从身体炸开：圈内每个敌人挨一次特殊伤害，并按各自的数据与体重沿离中心方向被震退；响声过后自身防御下降 1 级（无命中也要付）。回响式先在身上亮一圈预告，再于当时身体的新位置荡出第二圈，代价是多降一级防御、出手更慢。",
        uses: ["被围住时一记环身巨响震开一圈敌人", "对贴身的追击者造成范围特殊伤害并震退", "回响式在主震后再补一圈，覆盖走出去的人"],
        kind: "self",
        range: 4.6,
        maxRange: 7.4,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 44,
        maximumTicks: 300,
        style: "sound",
        defaults: { echo: false, ai: { maxChase: 9, minFoes: 2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("clangingscales", "ringRadius", pokemon) : 4.6, geometry: "area", style: "sound",
                color: 0x9B7BE8, label: config && config.echo === true ? "鳞片噪音·回响式" : "鳞片噪音·单响式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["clangingscales"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("clangingscales", "tempo", context)),
                recover: Math.round(p("clangingscales", "aftercast", context)),
                cooldown: Math.round(p("clangingscales", "recharge", context)),
                active: 0,
                range: p("clangingscales", "ringRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_clangingscales:windup", clangingscalesScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", echo: config && config.echo === true ? 1 : 0,
                    radius: Math.round(p("clangingscales", "ringRadius", action) * 10) / 10 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(3.0, p("clangingscales", "ringRadius", action));
            const power = p("clangingscales", "clang", action);
            const guardLoss = Math.max(0, Math.round(p("clangingscales", "guardLoss", action)));
            const echo = !!(config && config.echo);
            const echoDelay = Math.max(0, Math.round(p("clangingscales", "echoDelay", action)));
            const echoShare = p("clangingscales", "echoShare", action);
            const echoScale = p("clangingscales", "echoScale", action);
            const scale = radius / 4.6;
            const intensity = Math.max(0.6, Math.min(2.4, power / 110));
            const rings = Math.round(6 + power * 0.05);
            const actorRef = String(actor.ref());
            const scenes = WorldFeedback.actionScenes(clangingscalesScene);

            sound(action, "minecraft:entity.warden.sonic_boom");
            WorldFeedback.emit(world, clangingscalesScene, 1, centre,
                { moment: "burst", radius: radius, scale: scale, rings: rings, intensity: intensity,
                    echo: echo ? 1 : 0, flow: Math.round(60 + radius * 24) }, 30);

            /** 一圈声波结算：先按真实距离/高度与共享通视复核，再对每个目标求各自的 shock；返回命中数。 */
            function sweep(current: CombatAction, origin: CombatPoint, reach: number, strength: number, isEcho: boolean): number {
                const scope = current.world();
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(origin, 0, reach, { below: clangingscalesBelow, above: clangingscalesAbove }),
                    function (enemy, facts) {
                        if (String(enemy.ref()) === actorRef) return;
                        const delta = facts.position().minus(origin);
                        const distance = delta.length();
                        if (distance > reach) return;
                        if (delta.y() < -clangingscalesBelow || delta.y() > clangingscalesAbove) return;
                        // 声波可达性：按共享墙体契约复核通视，不凭圆柱给厚墙后的目标伤害。
                        if (!scope.clear(origin, facts.position())) return;
                        const ratio = reach <= 0 ? 0 : Math.min(1, distance / reach);
                        const falloff = 1 - 0.35 * ratio;
                        if (!hurt(current, enemy, "clangingscales", strength * falloff,
                            { damage: damageSpec("clangingscales", "clang"), sound: true })) return;
                        hits++;
                        if (scope.valid(enemy)) {
                            // 震退按真实目标求值：物攻/身高给冲量，该目标自身体重抵消。
                            const shock = Math.max(0.2, p("clangingscales", "shock", withTarget(factContext(current), enemy)));
                            const away = facts.position().minus(origin);
                            if (away.length() > 0.05) scope.hitDisplace(enemy, away.unit().scale(shock * falloff));
                        }
                        WorldFeedback.emit(scope, clangingscalesScene, 1, facts.position(),
                            { moment: "hit", target: String(enemy.ref()), intensity: intensity, scale: scale,
                                rings: rings, echo: isEcho ? 1 : 0, marks: Math.round(10 + strength * 0.16) }, 24);
                    });
                return hits;
            }

            const hits = sweep(action, centre, radius, power, false);
            NativeEffects.boost(world, actor, "def", -guardLoss);
            WorldFeedback.emit(world, clangingscalesScene, 1, centre,
                { moment: "loose", guardLoss: guardLoss, intensity: intensity, scale: scale,
                    shed: Math.round(8 + guardLoss * 6 + power * 0.05) }, 22);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)), clangingscalesLooseText, [guardLoss], 30);
            if (hits > 0) {
                sound(action, "cobblemon:impact.dragon");
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.7, 0)), clangingscalesHitText, [hits], 28);
            } else {
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.7, 0)), clangingscalesMissText, [], 24);
            }

            if (echo && echoScale > 0) {
                // 预告圈附着当前身体；第二响在等待结束时的真实新位置出环，二者在同一回调里同步收放。
                scenes.show(action, "ahead", centre,
                    { moment: "ahead", radius: Math.max(2.0, radius * echoScale), intensity: intensity * 0.7, echo: 1 });
                action.after(echoDelay, function (next: CombatAction) {
                    const scope = next.world();
                    const after = scope.observe(actor);
                    const at = after !== null ? after.position() : centre;
                    const second = Math.max(2.0, radius * echoScale);
                    const secondScale = second / 4.6;
                    scenes.stop(next, "ahead");
                    sound(next, "minecraft:entity.warden.sonic_boom");
                    WorldFeedback.emit(scope, clangingscalesScene, 1, at,
                        { moment: "echo", radius: second, scale: secondScale, rings: rings,
                            intensity: intensity * 0.7, flow: Math.round(40 + second * 18) }, 26);
                    sweep(next, at, second, power * echoShare, true);
                    scenes.finish(next, done);
                });
                return;
            }
            done(action);
        }
    });
}
