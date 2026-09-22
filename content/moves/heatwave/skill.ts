/**
 * 热风 / heatwave 的出手方式。
 *
 * 核心念头：把一口气在胸腹间焐热，再朝前整片吹出去——一道扇形的热浪贴着地面向前推，掠过的敌人一起挨烧、
 *   被风沿离身方向推离原位，并可能被点着。热风没有本体、不留残迹，它的形状就是那片被推开的扇形。
 *
 * 三幕：
 *   起（inhale，提交前）：嗓子与胸前透出热光、周围空气微微发亮，只播预告。
 *   吹（wave → hit，提交后）：扇形热浪从身前向外一格格推去，新进入扇面的敌人各结算一次 gust 伤害、按
 *       igniteChance 掷灼伤，并被 push 沿离身方向推走；画面按服务端同一组扇面顶点铺开。
 *   散（dissipate）：热浪推到最后，余热与尘慢慢散。
 *
 * 与同族分开：热水是抛出的沸水加水洼、热沙大地是一把烫沙、炼狱是一根必灼的火柱；只有热风是一条没有本体、
 *   只为把人和站位一起推开的扇面。配置 gale 由 resolve 改时序、由公式改威力／张角／推力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const heatwaveScene = "world_combat:move_heatwave";
    const heatwaveHitText = "world_combat.move.heatwave.text.hit";

    function heatwaveVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 扇面轮廓：身前的顶点 + 沿弧排开的外缘点；表现与判定读同一个水平圆心角。 */
    function heatwaveFan(origin: CombatPoint, direction: CombatPoint, length: number, degrees: number, steps: number): number[][] {
        const half = degrees * Math.PI / 360, base = Math.atan2(direction.z(), direction.x());
        const vertices: number[][] = [heatwaveVertex(origin)];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + 2 * half * i / steps;
            vertices.push(heatwaveVertex(origin.plus(WorldCombat.point(Math.cos(angle) * length, 0, Math.sin(angle) * length))));
        }
        return vertices;
    }

    define({
        id: "heatwave",
        name: "Heat Wave",
        description: "The user attacks by exhaling hot breath on opposing Pokemon. This may also leave them with a burn.",
        uses: ["一次灼到身前扇形里的几个敌人", "把冲上来的人整片推离原位", "在烈日下把热风推到最烈", "制造一道能读出范围的扇形压制"],
        kind: "enemy",
        range: 9.5,
        maxRange: 14,
        prepare: 9,
        active: 0,
        recover: 6,
        cooldown: 24,
        style: "heatwave",
        defaults: { gale: false, ai: { maxChase: 12, preferClusters: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("heatwave", "reach", pokemon), geometry: "line", style: "heatwave",
                color: 0xFF9A40, label: config && config.gale === true ? "疾风热风" : "灼热热风" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["heatwave"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("heatwave", "inhale", context)),
                recover: Math.round(p("heatwave", "exhale", context)),
                cooldown: Math.round(p("heatwave", "recharge", context)),
                active: skills["heatwave"].active,
                range: p("heatwave", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("heatwave:inhale", heatwaveScene, 1, action.origin(),
                JSON.stringify({ moment: "inhale", gale: config && config.gale === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const power = p("heatwave", "gust", action);
            const reach = Math.max(5, p("heatwave", "reach", action));
            const angle = Math.max(60, Math.min(200, p("heatwave", "angle", action)));
            const push = p("heatwave", "push", action);
            const chance = Math.max(0.02, Math.min(0.5, p("heatwave", "igniteChance", action)));
            const steps = Math.max(3, Math.round(p("heatwave", "sweepTicks", action)));
            const embers = Math.max(8, Math.round(p("heatwave", "embers", action)));
            const cap = 8;
            const scale = reach / 9.5;
            const intensity = Math.max(0.6, Math.min(2.4, power / 95));
            const hitRefs: { [ref: string]: boolean } = {};
            let step = 0, total = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(actor);
                const at = body !== null ? body.position() : current.origin();
                WorldFeedback.emit(scope, heatwaveScene, 1, at, { moment: "dissipate", scale: scale, intensity: intensity }, 26);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), heatwaveHitText, [total], 24);
                sound(current, "minecraft:entity.breeze.wind_burst");
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                const origin = body !== null ? body.position() : current.origin();
                let direction = aim(current);
                const target = current.target();
                if (target !== null && scope.valid(target)) {
                    const watched = scope.observe(target);
                    if (watched !== null) {
                        const delta = watched.position().minus(origin);
                        if (delta.length() > 0.01) direction = delta.unit();
                    }
                }
                const outer = reach * (step + 1) / steps;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, direction, outer, angle, { below: 2, above: 3 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(actor.ref()) || hitRefs[ref] || total >= cap) return;
                    hitRefs[ref] = true;
                    const already = CombatStatus.has(scope, enemy, "burn");
                    if (!hurt(current, enemy, "heatwave", power,
                        { damage: damageSpec("heatwave", "gust"), status: "burn", chance: chance, flags: { wind: true } })) return;
                    total++;
                    const away = facts.position().minus(origin);
                    if (scope.valid(enemy) && away.length() > 0.05)
                        scope.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                    WorldFeedback.emit(scope, heatwaveScene, 1, facts.position(),
                        { moment: "hit", target: ref, count: Math.round(8 + power * 0.18), scale: scale, intensity: intensity }, 22);
                    if (!already && CombatStatus.has(scope, enemy, "burn"))
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), "world_combat.move.heatwave.text.burn", [], 26);
                });
                const fan = heatwaveFan(origin, direction, outer, angle, 6);
                WorldFeedback.keep(scope, "heatwave:wave:" + String(actor.ref()), heatwaveScene, 1, origin,
                    { moment: "wave", path: fan, reach: outer, angle: angle, direction: [direction.x(), direction.y(), direction.z()],
                        embers: embers, scale: scale, intensity: intensity, progress: (step + 1) / steps }, 8);
                current.face(origin.plus(direction), 18, 18);
                step++;
                if (step >= steps) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "cobblemon:move.gust.actor");
            advance(action);
        }
    });
}
