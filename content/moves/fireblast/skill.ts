/**
 * 大字爆炎 / fireblast 的出手方式。
 *
 * 核心念头：在空中烧出一个「大」字——先写一横，再顺两撇、两捺把字补全，三笔依次点亮；字成形的一瞬，
 * 每一笔自己爆亮。原生的 85 命中在这里是「这一笔写得正不正」：字心相对瞄准点会在字的平面里偏一点，偏远了
 * 就只擦到边。危险处是**三笔本身**，笔画之间的空隙可以站人；刻印式让同一字形投到地上继续按笔画闷烧。
 *
 * 四幕：
 *   起（stoke，提交前）：喉间聚起写好这个字的火，只播预告。
 *   书（bar → left → right，提交后）：三笔依次在字心处点亮，各留一条与伤害带同厚的火焰笔迹。
 *   崩（flare → hit）：字成形后每一笔沿真实笔迹爆亮；命中判定取三笔具有 radius 厚度的真实段并集，每敌一次，
 *       不再有字外整圆扣血。
 *   印（mark，仅刻印式）：余烬把同一字形贴到真实地表，之后只有笔画带烫人、字间空隙可站，到 markTicks 散去。
 *
 * 自由瞄准：kind 为 aim，字心起手锁定（不追目标脚位），墙会遮断来源到字心并把笔画截短；实体只是选点。
 *
 * 与同族分开：火花是一粒点、喷射火焰是一道会变长的火舌、神圣之火是一次俯冲；只有大字爆炎会写出一整幅
 * 可辨认的字。配置 `inscribe` 由 resolve 改时序、由公式改威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const fireblastScene = "world_combat:move_fireblast";
    const fireblastBurnText = "world_combat.move.fireblast.text.burn";
    const fireblastHitText = "world_combat.move.fireblast.text.hit";
    const fireblastMissText = "world_combat.move.fireblast.text.miss";
    const fireblastMarkRule = "world_combat:fireblast/mark";

    function fireblastVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }
    function fireblastPoint(value: number[]): CombatPoint { return WorldCombat.point(value[0], value[1], value[2]); }

    /** 余字随寿命逐步暗下：鲜橙 → 暗烬。 */
    function fireblastEmber(fade: number): number {
        const lo = [0x3A, 0x14, 0x0A], hi = [0xFF, 0x6A, 0x24];
        const r = Math.round(lo[0] + (hi[0] - lo[0]) * fade), g = Math.round(lo[1] + (hi[1] - lo[1]) * fade);
        const b = Math.round(lo[2] + (hi[2] - lo[2]) * fade);
        return (r << 16) | (g << 8) | b;
    }

    /** 一个「大」字的三笔：上横、左撇、右捺；轴可选空中的竖直（up）或地上的前进方向。 */
    function fireblastGlyph(centre: CombatPoint, side: CombatPoint, axis: CombatPoint, size: number): { bar: CombatPoint[]; left: CombatPoint[]; right: CombatPoint[] } {
        const s = size * 0.7;
        function at(sx: number, ay: number): CombatPoint { return centre.plus(side.scale(sx * s)).plus(axis.scale(ay * s)); }
        return {
            bar: [at(-0.9, 0.55), at(0.9, 0.55)],
            left: [at(0, 0.55), at(-0.75, -0.75)],
            right: [at(0, 0.55), at(0.75, -0.75)]
        };
    }

    /** 沿一条地面的字笔采样：每个采样点落到真实地表，笔画跨墙时截短。 */
    function fireblastGroundPath(world: CombatWorld, from: CombatPoint, to: CombatPoint): number[][] {
        const samples = WorldGeometry.along(from, to, 0.5);
        const points: number[][] = [];
        let last: CombatPoint | null = null;
        for (let i = 0; i < samples.length; i++) {
            let at = WorldGeometry.ground(world, samples[i], 6);
            if (last !== null) {
                const lift = Math.max(last.y(), at.y()) + 0.2;
                const clip = world.clipBlocks(WorldCombat.point(last.x(), lift, last.z()), WorldCombat.point(at.x(), lift, at.z()));
                if (clip !== null && clip.blocked()) at = WorldCombat.point(clip.position().x(), at.y(), clip.position().z());
            }
            points.push(fireblastVertex(at));
            last = at;
        }
        return points;
    }

    // 地面字痕：写字人留下的持续火，挂在它自己的场地效果上。只有身体碰到某一条真实笔画带才挨烫，
    // 字间空隙保持安全；表现随效果自然结束一起收。
    WorldEffects.fieldRule(fireblastMarkRule, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            const body = world.observe(actor);
            if (body === null) return;
            const min = body.boundsMin(), max = body.boundsMax();
            const thickness = Number(field.data.thickness) || 0.4;
            const segments: number[][][] = field.data.segments || [];
            let onStroke = false;
            for (let i = 0; i < segments.length && !onStroke; i++)
                if (WorldGeometry.bodySegment(fireblastPoint(segments[i][0]), fireblastPoint(segments[i][1]), thickness).intersects(min, max))
                    onStroke = true;
            if (!onStroke) return;
            const ref = String(actor.ref()), next = field.data.next || (field.data.next = {});
            if (world.tick() < (next[ref] || 0)) return;
            next[ref] = world.tick() + (Number(field.data.markPulse) || 12);
            if (!hurt(world, actor, "fireblast", Number(field.data.mark) || 0, { damage: damageSpec("fireblast", "mark") })) return;
            if (!world.valid(actor)) return;
            field.data.pulses = (field.data.pulses || 0) + 1;
            WorldFeedback.emit(world, fireblastScene, 1, body.position(),
                { moment: "markhit", target: ref, glyph: field.data.glyph, intensity: field.data.markIntensity }, 16);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            if (typeof field.id !== "number" || field.id <= 0) return;
            const total = Math.max(1, Number(field.data.markTicks) || 1);
            const remaining = typeof field.remaining === "number" ? field.remaining : total;
            const fade = Math.max(0, Math.min(1, remaining / total)), color = fireblastEmber(fade);
            const paths: number[][][] = field.data.paths || [];
            for (let i = 0; i < paths.length; i++) if (paths[i].length >= 2)
                WorldFeedback.onEffect(world, field.id, "fireblast:mark:" + i, fireblastScene, 1, fireblastPoint(paths[i][0]),
                    { moment: "mark", path: paths[i], thickness: field.data.thickness, color: color, fade: fade, intensity: field.data.markIntensity });
            if (paths.length) WorldFeedback.onEffect(world, field.id, "fireblast:markground", fireblastScene, 1, fireblastPoint(paths[0][0]),
                { moment: "markground", markRadius: field.data.cover, markTicks: total, color: color, intensity: field.data.markIntensity });
        }
    }, { identity: WorldEffects.hazard("fireblast"), tags: [WorldEffects.categories.hazard], lineOfSight: false });

    define({
        id: "fireblast",
        cooldownParameter: "recharge",
        name: "Fire Blast",
        description: "在空中烧出一个「大」字：一横、一撇、一捺依次点亮，字成形时每一笔自己爆亮，危险处是三笔本身、笔画之间的空隙可以站人；被笔画烧到会受伤并可能点燃。刻印式把同一字形贴到真实地表，之后只有发烫的笔画带会持续烫站在上面的人。可自由瞄准任意点提前封路，字心起手锁定，墙会遮断来源并截短笔画。",
        uses: ["在空中写下一个大字，用三笔的真实范围烧中目标", "用刻印式把字贴在地上，封住一条走位或必经的缺口", "在远处一记高威力特殊火点杀"],
        kind: "aim",
        range: 13,
        maxRange: 18,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 44,
        style: "inferno",
        defaults: { inscribe: false, ai: { maxChase: 17, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("fireblast", "glyph", pokemon), geometry: "area", style: "inferno",
                color: 0xFF6A24, label: config && config.inscribe === true ? "刻印大字爆炎" : "爆燃大字爆炎" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["fireblast"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("fireblast", "tempo", context)),
                recover: Math.round(p("fireblast", "aftercast", context)),
                cooldown: Math.round(p("fireblast", "recharge", context)),
                active: 0,
                range: skills["fireblast"].range
            };
        },
        windup: function (action, config, prepare) {
            action.present("fireblast:stoke", fireblastScene, 1, action.origin(),
                JSON.stringify({ moment: "stoke", inscribe: config && config.inscribe === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const actorRef = String(actor.ref());
            const inscribe = !!(config && config.inscribe);
            const scenes = WorldFeedback.actionScenes(fireblastScene);
            const power = p("fireblast", "blast", action);
            const markPower = p("fireblast", "mark", action);
            const glyph = p("fireblast", "glyph", action);
            const thickness = p("fireblast", "radius", action);
            const scatter = p("fireblast", "scatter", action);
            const gap = Math.max(2, Math.round(p("fireblast", "strokeGap", action)));
            const burnChance = Math.max(0.01, Math.min(0.5, p("fireblast", "burnChance", action)));
            const sparks = Math.max(12, Math.round(p("fireblast", "sparks", action)));
            const markThickness = p("fireblast", "markRadius", action);
            const markTicks = Math.max(40, Math.round(p("fireblast", "markTicks", action)));
            const markPulse = Math.max(4, Math.round(p("fireblast", "markPulse", action)));
            const cap = Math.max(1, Math.round(p("fireblast", "maxTargets", action)));
            const intensity = Math.max(0.6, Math.min(2.6, power / 110));
            const markIntensity = Math.max(0.4, Math.min(1.8, markPower / 16));
            const origin = action.origin();
            // 字心起手锁定：只读一次瞄准点，之后不追目标脚位。
            let centre = action.targetPosition();
            const toCentre = centre.minus(origin);
            if (toCentre.length() > 0.01) {
                // 墙遮断来源到字心：到达点被实墙挡住时，字就写在墙的这一侧。
                const arrival = world.clipBlocks(origin.plus(WorldCombat.point(0, 0.4, 0)), centre);
                if (arrival !== null && arrival.blocked()) centre = arrival.position().minus(toCentre.unit().scale(0.35));
            }
            const flat = WorldCombat.point(centre.x() - origin.x(), 0, centre.z() - origin.z());
            const heading = flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const up = WorldCombat.point(0, 1, 0);
            // 写偏在字所在的平面里发生：字心仍在瞄准的竖直平面上，偏远了只会落进笔画空隙或擦到边。
            const angle = world.random() * Math.PI * 2, offset = world.random() * scatter;
            centre = centre.plus(side.scale(Math.cos(angle) * offset)).plus(up.scale(Math.sin(angle) * offset));
            const air = fireblastGlyph(centre, side, up, glyph);
            const strokes = [air.bar, air.left, air.right];
            const moments = ["bar", "left", "right"];
            let index = 0, total = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, fireblastScene, 1, centre, { moment: "fade", glyph: glyph, intensity: intensity }, 26);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.4, 0)),
                    total > 0 ? fireblastHitText : fireblastMissText, total > 0 ? [total] : [], 28);
                scenes.finish(current, done);
            }

            /** 真实方块把一条笔截短；未知接触保持原笔。 */
            function clipStroke(scope: CombatWorld, segment: CombatPoint[]): CombatPoint[] {
                const hit = scope.clipBlocks(segment[0], segment[1]);
                return hit !== null && hit.blocked() ? [segment[0], hit.position()] : segment;
            }

            function paint(current: CombatAction): void {
                if (index >= strokes.length) { erupt(current); return; }
                const scope = current.world();
                const stroke = clipStroke(scope, strokes[index]);
                scenes.show(current, moments[index], stroke[0],
                    { moment: moments[index], path: [fireblastVertex(stroke[0]), fireblastVertex(stroke[1])],
                        direction: [heading.x(), heading.y(), heading.z()], glyph: glyph, thickness: thickness, intensity: intensity });
                sound(current, "cobblemon:move.fireblast.actor");
                index++;
                current.after(gap, function (next: CombatAction) { paint(next); });
            }

            function erupt(current: CombatAction): void {
                const scope = current.world();
                // 合字：每一笔沿真实笔迹爆亮（与伤害带同厚），另在字心起一撮火星与烟，不铺整圆。
                const segments = strokes.map(function (stroke: CombatPoint[]) { return clipStroke(scope, stroke); });
                segments.forEach(function (segment: CombatPoint[]) {
                    WorldFeedback.emit(scope, fireblastScene, 1, segment[0],
                        { moment: "flare", path: [fireblastVertex(segment[0]), fireblastVertex(segment[1])],
                            thickness: thickness, sparks: Math.max(8, Math.round(sparks / 3)), intensity: intensity }, 20);
                });
                WorldFeedback.emit(scope, fireblastScene, 1, centre,
                    { moment: "erupt", sparks: sparks, glyph: glyph, thickness: thickness, intensity: intensity }, 30);
                sound(current, "minecraft:entity.generic.explode");
                sound(current, "cobblemon:impact.fire");
                // 判定：三笔具有 radius 厚度的真实段并集，每敌一次、最多 maxTargets。
                const seen: { [ref: string]: boolean } = {};
                segments.forEach(function (segment: CombatPoint[]) {
                    WorldGeometry.selectBodies(scope, WorldGeometry.bodySegment(segment[0], segment[1], thickness), function (enemy, facts) {
                        const ref = String(enemy.ref());
                        if (ref === actorRef || scope.friendly(enemy) || seen[ref] || total >= cap) return;
                        const alreadyBurned = CombatStatus.has(scope, enemy, "burn");
                        if (!hurt(current, enemy, "fireblast", power,
                            { damage: damageSpec("fireblast", "blast"), status: "burn", chance: burnChance })) return;
                        seen[ref] = true;
                        total++;
                        WorldFeedback.emit(scope, fireblastScene, 1, facts.position(),
                            { moment: "hit", target: ref, sparks: sparks, intensity: intensity }, 24);
                        if (!alreadyBurned && CombatStatus.has(scope, enemy, "burn"))
                            WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), fireblastBurnText, [], 26);
                    });
                });
                if (!inscribe) { finish(current); return; }
                // 刻印：同一字形投到合法地表，之后只有笔画带烫人。
                const ground = WorldGeometry.ground(scope, centre, 6);
                const gflat = WorldCombat.point(ground.x() - origin.x(), 0, ground.z() - origin.z());
                const ghead = gflat.length() < 0.01 ? heading : gflat.unit();
                const gside = WorldCombat.point(-ghead.z(), 0, ghead.x());
                const mark = fireblastGlyph(ground, gside, ghead, glyph);
                const paths = [mark.bar, mark.left, mark.right].map(function (stroke: CombatPoint[]) {
                    return fireblastGroundPath(scope, stroke[0], stroke[1]);
                });
                const markSegments: number[][][] = [];
                paths.forEach(function (path: number[][]) {
                    for (let i = 0; i + 1 < path.length; i++) markSegments.push([path[i], path[i + 1]]);
                });
                const cover = Math.max(1.5, glyph * 1.15);
                WorldEffects.field(scope, fireblastMarkRule, ground, cover,
                    { glyph: glyph, mark: markPower, markIntensity: markIntensity, thickness: markThickness, cover: cover,
                        markTicks: markTicks, markPulse: markPulse, paths: paths, segments: markSegments, pulses: 0, next: {} }, markTicks);
                finish(current);
            }

            sound(action, "cobblemon:move.fireblast.actor");
            paint(action);
        }
    });
}
