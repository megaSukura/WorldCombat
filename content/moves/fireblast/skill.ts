/**
 * 大字爆炎 / fireblast 的出手方式。
 *
 * 核心念头：在空中烧出一个「大」字——先写一横，再顺两撇、两捺把字补全，三笔依次点亮；字成形的一瞬，
 * 整个字崩开砸在字心，把对手烧穿。原生的 85 命中在这里是「这一笔写得正不正」：字心会偏一点，偏远了
 * 就只擦到边。刻印式让这个字落在地上继续闷烧，站在字痕上的人反复挨烫；爆燃式只崩一记更重的。
 *
 * 四幕：
 *   起（stoke，提交前）：喉间聚起写好这个字的火，只播预告。
 *   书（bar → left → right，提交后）：三笔依次在目标处点亮，各留一条火焰笔迹。
 *   崩（erupt → hit）：字成形后整个崩开，罩住字心周围一圈；命中结算 blast 伤害并按概率引燃。
 *   印（mark → markhit，仅刻印式）：余烬落在地上烧出字痕，按 markPulse 反复烫站在上面的人，到 markTicks 散去。
 *
 * 与同族分开：火花是一粒点、喷射火焰是一道会变长的墙、神圣之火是一次俯冲；只有大字爆炎会在空中
 * 写出一整幅可辨认的字。配置 `inscribe` 由 resolve 改时序、由公式改威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const fireblastScene = "world_combat:move_fireblast";
    const fireblastBurnText = "world_combat.move.fireblast.text.burn";
    const fireblastHitText = "world_combat.move.fireblast.text.hit";
    const fireblastMissText = "world_combat.move.fireblast.text.miss";

    function fireblastVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

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

    /** 落点下方第一块实心方块的顶面位置；给字痕一个贴地的锚点。 */
    function fireblastGround(world: CombatWorld, point: CombatPoint): CombatPoint {
        const x = Math.floor(point.x()), z = Math.floor(point.z()), base = Math.floor(point.y());
        for (let dy = 0; dy <= 5; dy++) {
            const y = base - dy;
            const block = world.block(WorldCombat.point(x, y, z));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return WorldCombat.point(x + 0.5, y + 1.05, z + 0.5);
        }
        return point;
    }

    define({
        id: "fireblast",
        cooldownParameter: "recharge",
        name: "Fire Blast",
        description: "The target is attacked with an intense blast of all-consuming fire. This may also leave the target with a burn.",
        uses: ["在空中写下一个大字后崩开烧穿目标", "用刻印式在地上留下会烫人的字痕", "在远处一记高威力特殊火点杀"],
        kind: "enemy",
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
            return { radius: p("fireblast", "radius", pokemon), geometry: "area", style: "inferno",
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
            const inscribe = !!(config && config.inscribe);
            const power = p("fireblast", "blast", action);
            const markPower = p("fireblast", "mark", action);
            const glyph = p("fireblast", "glyph", action);
            const radius = p("fireblast", "radius", action);
            const scatter = p("fireblast", "scatter", action);
            const gap = Math.max(2, Math.round(p("fireblast", "strokeGap", action)));
            const burnChance = Math.max(0.01, Math.min(0.5, p("fireblast", "burnChance", action)));
            const sparks = Math.max(12, Math.round(p("fireblast", "sparks", action)));
            const markRadius = p("fireblast", "markRadius", action);
            const markTicks = Math.max(40, Math.round(p("fireblast", "markTicks", action)));
            const markPulse = Math.max(4, Math.round(p("fireblast", "markPulse", action)));
            const cap = Math.max(1, Math.round(p("fireblast", "maxTargets", action)));
            const intensity = Math.max(0.6, Math.min(2.6, power / 110));
            const origin = action.origin();
            const anchor = action.targetPosition();
            let centre = anchor;
            const target = action.target();
            if (target !== null && world.valid(target)) {
                const body = world.observe(target);
                if (body !== null) centre = body.position();
            }
            const flat = WorldCombat.point(centre.x() - origin.x(), 0, centre.z() - origin.z());
            const heading = flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const up = WorldCombat.point(0, 1, 0);
            const angle = world.random() * Math.PI * 2, offset = world.random() * scatter;
            centre = centre.plus(WorldCombat.point(Math.cos(angle) * offset, 0, Math.sin(angle) * offset));
            const air = fireblastGlyph(centre, side, up, glyph);
            const strokes = [air.bar, air.left, air.right];
            const moments = ["bar", "left", "right"];
            let index = 0, total = 0, settled = false, ground = centre;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, fireblastScene, 1, centre, { moment: "fade", glyph: glyph, intensity: intensity }, 26);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.4, 0)),
                    total > 0 ? fireblastHitText : fireblastMissText, total > 0 ? [total] : [], 28);
                done(current);
            }

            function paint(current: CombatAction): void {
                if (index >= strokes.length) { erupt(current); return; }
                const scope = current.world();
                const stroke = strokes[index];
                WorldFeedback.keep(scope, "fireblast:" + moments[index] + ":" + String(actor.ref()), fireblastScene, 1, stroke[0],
                    { moment: moments[index], path: [fireblastVertex(stroke[0]), fireblastVertex(stroke[1])],
                        direction: [heading.x(), heading.y(), heading.z()], glyph: glyph, intensity: intensity }, gap + 8);
                sound(current, "cobblemon:move.fireblast.actor");
                index++;
                current.after(gap, function (next: CombatAction) { paint(next); });
            }

            function erupt(current: CombatAction): void {
                const scope = current.world();
                WorldFeedback.emit(scope, fireblastScene, 1, centre,
                    { moment: "erupt", sparks: sparks, glyph: glyph, radius: radius, intensity: intensity }, 30);
                sound(current, "minecraft:entity.generic.explode");
                sound(current, "cobblemon:impact.fire");
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, 0, radius, { below: 2, above: 3 }), function (enemy, facts) {
                    if (String(enemy.ref()) === String(actor.ref()) || total >= cap) return;
                    const alreadyBurned = CombatStatus.has(scope, enemy, "burn");
                    if (!hurt(current, enemy, "fireblast", power,
                        { damage: damageSpec("fireblast", "blast"), status: "burn", chance: burnChance })) return;
                    total++;
                    WorldFeedback.emit(scope, fireblastScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), sparks: sparks, intensity: Math.max(0.6, Math.min(2.6, power / 110)) }, 24);
                    if (!alreadyBurned && CombatStatus.has(scope, enemy, "burn"))
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), fireblastBurnText, [], 26);
                });
                if (!inscribe) { finish(current); return; }
                ground = fireblastGround(scope, centre);
                const gflat = WorldCombat.point(ground.x() - origin.x(), 0, ground.z() - origin.z());
                const ghead = gflat.length() < 0.01 ? heading : gflat.unit();
                const gside = WorldCombat.point(-ghead.z(), 0, ghead.x());
                const mark = fireblastGlyph(ground, gside, ghead, glyph);
                const marks = [mark.bar, mark.left, mark.right];
                ["bar", "left", "right"].forEach(function (name: string, order: number) {
                    WorldFeedback.keep(scope, "fireblast:mark:" + name + ":" + String(actor.ref()), fireblastScene, 1, marks[order][0],
                        { moment: "mark", path: [fireblastVertex(marks[order][0]), fireblastVertex(marks[order][1])],
                            glyph: glyph, markRadius: markRadius, markTicks: markTicks, intensity: Math.max(0.5, Math.min(1.8, markPower / 16)) }, markTicks + 12);
                });
                WorldFeedback.keep(scope, "fireblast:markground:" + String(actor.ref()), fireblastScene, 1, ground,
                    { moment: "markground", markRadius: markRadius, markTicks: markTicks, glyph: glyph }, markTicks + 12);
                pulse(current, 0);
            }

            function pulse(current: CombatAction, elapsed: number): void {
                const scope = current.world();
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(ground, 0, markRadius, { below: 2, above: 2 }), function (enemy, facts) {
                    if (String(enemy.ref()) === String(actor.ref())) return;
                    if (!hurt(current, enemy, "fireblast", markPower, { damage: damageSpec("fireblast", "mark") })) return;
                    total++;
                    WorldFeedback.emit(scope, fireblastScene, 1, facts.position(),
                        { moment: "markhit", target: String(enemy.ref()), glyph: glyph, intensity: Math.max(0.5, Math.min(1.6, markPower / 16)) }, 16);
                });
                elapsed += markPulse;
                if (elapsed >= markTicks) { finish(current); return; }
                current.after(markPulse, function (next: CombatAction) { pulse(next, elapsed); });
            }

            sound(action, "cobblemon:move.fireblast.actor");
            paint(action);
        }
    });
}
