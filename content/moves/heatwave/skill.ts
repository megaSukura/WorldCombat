/**
 * 热风 / heatwave 的出手方式。
 *
 * 核心念头：把一口气在胸腹间焐热，再朝前整片吹出去——一道扇形的热浪沿身前水平面向前推，掠过的敌人一起挨烧、
 *   被风沿离身方向推离原位，并可能被点着。热风没有本体、不留残迹，它的形状就是那片被推开的扇形。
 *
 * 自由瞄准（kind: "aim"）：释放的一刻固定住身体点与准线方向，之后无论准心怎么转，这道热风都沿原方向继续推；
 *   空放照走，墙后没有热伤。前缘按 sweepTicks 一格格外推：每一格只结算刚扫到的那条有厚度的前带，
 *   已经经过的后方不再把后来走进的人补扫进来，每人整道热风只结算一次。
 *
 * 三幕：
 *   起（inhale，提交前）：嗓子与胸前透出热光、周围空气微微发亮，只播预告。
 *   吹（wave → hit，提交后）：固定原点的扇形前带从身前向外一格格推去。每一格按实际张角采样若干射线，
 *      每条射线用真实墙面截短，围成这一格**被墙截短的有厚度扇带**；判定与画面读同一组端点，并肩高的方块
 *      不再让画面越过墙。新进入前带的敌人各结算一次 gust 伤害、按 igniteChance 掷灼伤，并被 push 沿离身
 *      方向推走（离身水平分量为零时不硬推）。
 *   散（dissipate）：热浪推到最后，余热与尘慢慢散。
 *
 * 与同族分开：热水是抛出的沸水加水洼、热沙大地是一把烫沙、炼狱是一根必灼的火柱；只有热风是一条没有本体、
 *   只为把人和站位一起推开的扇面。配置 gale 由 resolve 改时序、由公式改威力／张角／推力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const heatwaveScene = "world_combat:move_heatwave";
    /** 前缘的稀疏稳定线由自定义场景绘制，与判定共用同一组截断端点。 */
    const heatwaveFrontScene = "world_combat:move_heatwave_front";
    const heatwaveHitText = "world_combat.move.heatwave.text.hit";

    /**
     * 这一格被墙截短的扇带轮廓：按当前张角采样，每条射线用真实墙面截到可达距离，再围成内弧加外弧的环带。
     * 判定与画面共用同一组顶点。
     */
    function heatwaveBand(world: CombatWorld, origin: CombatPoint, base: number, half: number, inner: number, outer: number, samples: number): CombatPoint[] {
        const rim: CombatPoint[] = [], innerRim: CombatPoint[] = [];
        for (let i = 0; i <= samples; i++) {
            const angle = -half + 2 * half * i / samples;
            const heading = WorldCombat.point(Math.sin(base + angle), 0, Math.cos(base + angle));
            const wall = WorldGeometry.blockHit(world, origin, origin.plus(heading.scale(outer)));
            const limit = wall === null ? outer : Math.max(0.1, wall.position().minus(origin).length());
            innerRim.push(origin.plus(heading.scale(Math.min(inner, limit))));
            rim.push(origin.plus(heading.scale(limit)));
        }
        return innerRim.concat(rim.reverse());
    }

    function heatwaveNumbers(points: CombatPoint[]): number[][] {
        const values: number[][] = [];
        for (let i = 0; i < points.length; i++) values.push([points[i].x(), points[i].y(), points[i].z()]);
        return values;
    }

    define({
        id: "heatwave",
        cooldownParameter: "recharge",
        name: "Heat Wave",
        description: "把一口气在胸腹间焐热、朝前整片吹出去：一道扇形热浪沿身前水平面向前推，掠过的敌人一起挨烧、被风沿离身方向推离原位，并可能被点着。释放后方向就固定，热风只向前推进、不跟着准心转，身后不再补扫；实心墙把这一格的有效扇面截短，墙后不会越过墙受热；烈日下更烈、雨天更淡，热风吹完不留残迹。",
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
            const front = WorldFeedback.actionScenes(heatwaveFrontScene);
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
            const samples = Math.max(4, Math.round(angle / 18));
            // 释放的一刻固定身体点与准线方向，之后不跟准心、不追目标。
            const origin = action.origin();
            const direction = WorldGeometry.flatUnit(aim(action), action.direction());
            const base = Math.atan2(direction.x(), direction.z());
            const half = angle * Math.PI / 360;
            const band = { below: 2, above: 3 };
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
                front.stop(current);
                scenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const prev = reach * step / steps;
                const outer = reach * (step + 1) / steps;
                const path = heatwaveBand(scope, origin, base, half, Math.max(0, prev - thickness), outer, samples);
                // 判定与画面共用同一条被墙截短的扇带。
                WorldGeometry.selectEnemies(scope, WorldGeometry.polygon(path, band), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === actorRef || hitRefs[ref] || total >= cap) return;
                    const already = CombatStatus.has(scope, enemy, "burn");
                    if (!hurt(current, enemy, "heatwave", power,
                        { damage: damageSpec("heatwave", "gust"), status: "burn", chance: chance, flags: { wind: true } })) return;
                    hitRefs[ref] = true;
                    total++;
                    const push = p("heatwave", "push", withTarget(factContext(current), enemy));
                    const away = facts.position().minus(origin);
                    const horizontal = WorldCombat.point(away.x(), 0, away.z());
                    // 离身水平分量为零（正上/正下）时不硬推，避免零向量取单位。
                    if (scope.valid(enemy) && horizontal.length() > 0.05)
                        scope.hitDisplace(enemy, horizontal.unit().scale(push));
                    WorldFeedback.emit(scope, heatwaveScene, 1, facts.position(),
                        { moment: "hit", target: ref, count: Math.round(8 + power * 0.18), scale: scale, intensity: intensity }, 22);
                    if (!already && CombatStatus.has(scope, enemy, "burn"))
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), "world_combat.move.heatwave.text.burn", [], 26);
                });
                const numbers = heatwaveNumbers(path);
                scenes.show(current, "wave", origin,
                    { moment: "wave", path: numbers, reach: outer, angle: angle, direction: [direction.x(), direction.y(), direction.z()],
                        embers: embers, scale: scale, intensity: intensity, progress: (step + 1) / steps });
                // 前缘稳定线：外弧的顶点单独上传，与波带同源。
                front.show(current, "front", origin,
                    { moment: "front", edge: numbers.slice(numbers.length / 2), origin: [origin.x(), origin.y(), origin.z()],
                        direction: [direction.x(), direction.y(), direction.z()],
                        progress: (step + 1) / steps, intensity: intensity, embers: embers });
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
