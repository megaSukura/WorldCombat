/**
 * 热风 / heatwave 的出手方式。
 *
 * 核心念头：把一口气在胸腹间焐热，再朝前整片吹出去——一道扇形的热浪贴着地面向前推，掠过的敌人一起挨烧、
 *   被风沿离身方向推离原位，并可能被点着。热风没有本体、不留残迹，它的形状就是那片被推开的扇形。
 *
 * 自由瞄准（kind: "aim"）：释放的一刻固定住身体点与准线方向，之后无论准心怎么转，这道热风都沿原方向继续推；
 *   空放照走，墙后没有热伤。前缘按 sweepTicks 一格格外推：每一格只结算刚扫到的那条有厚度的前带，
 *   已经经过的后方不再把后来走进的人补扫进来，每人整道热风只结算一次。
 *
 * 三幕：
 *   起（inhale，提交前）：嗓子与胸前透出热光、周围空气微微发亮，只播预告。
 *   吹（wave → hit，提交后）：固定原点的扇形前带从身前向外一格格推去，新进入前带的敌人各结算一次 gust 伤害、
 *      按 igniteChance 掷灼伤，并被 push 沿离身方向推走；画面按服务端同一组前缘顶点铺开。
 *   散（dissipate）：热浪推到最后，余热与尘慢慢散。
 *
 * 与同族分开：热水是抛出的沸水加水洼、热沙大地是一把烫沙、炼狱是一根必灼的火柱；只有热风是一条没有本体、
 *   只为把人和站位一起推开的扇面。配置 gale 由 resolve 改时序、由公式改威力／张角／推力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const heatwaveScene = "world_combat:move_heatwave";
    const heatwaveHitText = "world_combat.move.heatwave.text.hit";

    function heatwaveVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 前缘带轮廓：内弧与外弧围成一条有厚度的扇环，表现与判定读同一个水平圆心角。 */
    function heatwaveBand(origin: CombatPoint, direction: CombatPoint, inner: number, outer: number, degrees: number, steps: number): number[][] {
        const half = degrees * Math.PI / 360, base = Math.atan2(direction.z(), direction.x());
        const vertices: number[][] = [];
        let i: number;
        for (i = 0; i <= steps; i++) {
            const angle = base - half + 2 * half * i / steps;
            vertices.push(heatwaveVertex(origin.plus(WorldCombat.point(Math.cos(angle) * inner, 0, Math.sin(angle) * inner))));
        }
        for (i = steps; i >= 0; i--) {
            const angle = base - half + 2 * half * i / steps;
            vertices.push(heatwaveVertex(origin.plus(WorldCombat.point(Math.cos(angle) * outer, 0, Math.sin(angle) * outer))));
        }
        return vertices;
    }

    define({
        id: "heatwave",
        cooldownParameter: "recharge",
        name: "Heat Wave",
        description: "把一口气在胸腹间焐热、朝前整片吹出去：一道扇形热浪贴着地面向前推，掠过的敌人一起挨烧、被风沿离身方向推离原位，并可能被点着。释放后方向就固定，热风只向前推进、不跟着准心转，身后不再补扫；烈日下更烈、雨天更淡，热风吹完不留残迹。",
        uses: ["一次灼到身前扇形里的几个敌人", "把冲上来的人整片推离原位", "在烈日下把热风推到最烈", "制造一道能读出范围、向前推进的扇形压制"],
        kind: "aim",
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
            const scenes = WorldFeedback.actionScenes(heatwaveScene);
            const world = action.world();
            const actor = action.actor();
            const actorRef = String(actor.ref());
            const power = p("heatwave", "gust", action);
            const reach = Math.max(5, p("heatwave", "reach", action));
            const angle = Math.max(60, Math.min(200, p("heatwave", "angle", action)));
            const chance = Math.max(0.02, Math.min(0.5, p("heatwave", "igniteChance", action)));
            const steps = Math.max(3, Math.round(p("heatwave", "sweepTicks", action)));
            const embers = Math.max(8, Math.round(p("heatwave", "embers", action)));
            const cap = 8;
            const scale = reach / 9.5;
            const intensity = Math.max(0.6, Math.min(2.4, power / 95));
            const thickness = Math.max(0.6, reach / steps);
            // 释放的一刻固定身体点与准线方向，之后不跟准心、不追目标。
            const origin = action.origin();
            const direction = aim(action);
            const hitRefs: { [ref: string]: boolean } = {};
            let step = 0, total = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const at = origin.plus(direction.scale(reach));
                WorldFeedback.emit(scope, heatwaveScene, 1, at, { moment: "dissipate", scale: scale, intensity: intensity }, 26);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), heatwaveHitText, [total], 24);
                sound(current, "minecraft:entity.breeze.wind_burst");
                scenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const prev = reach * step / steps;
                const outer = reach * (step + 1) / steps;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, direction, outer, angle, { below: 2, above: 3 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === actorRef || hitRefs[ref] || total >= cap) return;
                    const delta = facts.position().minus(origin);
                    const distance = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                    // 只结算这一格刚推到的前带；已经经过的后方不再补扫。
                    if (distance < prev - thickness) return;
                    if (current.trace(origin, facts.position(), 0.3, true).blocked()) return;
                    hitRefs[ref] = true;
                    const already = CombatStatus.has(scope, enemy, "burn");
                    if (!hurt(current, enemy, "heatwave", power,
                        { damage: damageSpec("heatwave", "gust"), status: "burn", chance: chance, flags: { wind: true } })) return;
                    total++;
                    const push = p("heatwave", "push", withTarget(factContext(current), enemy));
                    const away = facts.position().minus(origin);
                    if (scope.valid(enemy) && away.length() > 0.05)
                        scope.hitDisplace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                    WorldFeedback.emit(scope, heatwaveScene, 1, facts.position(),
                        { moment: "hit", target: ref, count: Math.round(8 + power * 0.18), scale: scale, intensity: intensity }, 22);
                    if (!already && CombatStatus.has(scope, enemy, "burn"))
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), "world_combat.move.heatwave.text.burn", [], 26);
                });
                scenes.show(current, "wave", origin,
                    { moment: "wave", path: heatwaveBand(origin, direction, Math.max(0, prev - thickness), outer, angle, 6),
                        reach: outer, angle: angle, direction: [direction.x(), direction.y(), direction.z()],
                        embers: embers, scale: scale, intensity: intensity, progress: (step + 1) / steps });
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
