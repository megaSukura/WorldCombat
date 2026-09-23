/**
 * 神圣之火 / sacredfire 的出手方式。
 *
 * 核心念头：施法者被一道虹彩圣火裹住，腾空压向目标，撞上去是实打实的一记物理重击；这一击极难点不着，
 * 圣火还压过冰霜（解冻自身）。它是本组里唯一的近身招：其余三招都是远程火，只有神圣之火是施法者本人
 * 化作一团彩火撞过去。
 *
 * 四幕：
 *   起（risen，提交前）：虹彩圣火从脚下升起裹住全身、微微浮起，只播预告。
 *   降（dive → hit）：提交后沿瞄准方向俯冲，身周拖一条彩虹火尾；命中结算 strike 物理伤害与击退，
 *       并按高概率引燃；一路无人则在落点炸开一撮彩火。
 *   焚（flame → flamehit，仅圣火式）：撞击点或落点留下一片虹彩余焰，按 flamePulse 反复烫圈内的人，
 *       到 flameTicks 散去；天罚式不留余焰、只取更重的一记。
 *
 * 与同族分开：火花是一粒点、喷射火焰是一道会变长的墙、大字爆炎是一幅字；只有神圣之火是一次裹着彩火的俯冲。
 * 配置 `smite`（天罚式）由 resolve 改时序、由公式改威力与引燃，提交后才触碰世界。
 */
namespace PokemonSkills {
    const sacredfireScene = "world_combat:move_sacredfire";
    const sacredfireBurnText = "world_combat.move.sacredfire.text.burn";
    const sacredfireHitText = "world_combat.move.sacredfire.text.hit";

    /** 落点下方第一块实心方块的顶面位置；给余焰一个贴地的锚点。 */
    function sacredfireGround(world: CombatWorld, point: CombatPoint): CombatPoint {
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
        freeMovement: true,
        id: "sacredfire",
        cooldownParameter: "recharge",
        name: "Sacred Fire",
        description: "被一道虹彩圣火裹住，俯冲撞向目标：一记物理重击，命中后有较高概率使其陷入灼伤，施放时还会解去自身的冰封；圣火式在撞击点留下一片反复烫人的虹彩余焰，天罚式只取更重的一击。",
        uses: ["裹着虹彩圣火俯冲撞穿一个目标", "用高概率的灼伤压制对手", "在落点留下一片会烫人的彩火"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 10,
        active: 0,
        recover: 9,
        cooldown: 44,
        style: "radiant",
        defaults: { smite: false, ai: { maxChase: 12, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("sacredfire", "sprint", pokemon), geometry: "line", style: "radiant",
                color: 0xFFE0A0, label: config && config.smite === true ? "天罚式神圣之火" : "圣火式神圣之火" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["sacredfire"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("sacredfire", "tempo", context)),
                recover: Math.round(p("sacredfire", "aftercast", context)),
                cooldown: Math.round(p("sacredfire", "recharge", context)),
                active: 0,
                range: p("sacredfire", "sprint", context) + 1.2
            };
        },
        windup: function (action, config, prepare) {
            action.present("sacredfire:risen", sacredfireScene, 1, action.origin(),
                JSON.stringify({ moment: "risen", smite: config && config.smite === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const smite = !!(config && config.smite);
            const power = p("sacredfire", "strike", action);
            const pace = p("sacredfire", "pace", action);
            const sprint = p("sacredfire", "sprint", action);
            const radius = p("sacredfire", "radius", action);
            const push = p("sacredfire", "push", action);
            const burnChance = Math.max(0.01, Math.min(0.75, p("sacredfire", "burnChance", action)));
            const flamePower = p("sacredfire", "flame", action);
            const flameRadius = p("sacredfire", "flameRadius", action);
            const flameTicks = Math.max(30, Math.round(p("sacredfire", "flameTicks", action)));
            const flamePulse = Math.max(4, Math.round(p("sacredfire", "flamePulse", action)));
            const sparks = Math.max(12, Math.round(p("sacredfire", "sparks", action)));
            const traceAhead = p("sacredfire", "traceAhead", action);
            const minimumMove = p("sacredfire", "minimumMove", action);
            const cap = Math.max(1, Math.round(p("sacredfire", "maxTargets", action)));
            const direction = aim(action);
            const intensity = Math.max(0.6, Math.min(2.6, power / 100));
            const scale = Math.max(0.7, Math.min(1.7, radius / 0.7));
            let travelled = 0, struck = false, settled = false, total = 0;

            if (CombatStatus.has(world, actor, "frozen")) CombatStatus.cure(world, actor, "frozen");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(actor);
                WorldFeedback.emit(scope, sacredfireScene, 1, body !== null ? body.position() : current.origin(),
                    { moment: "fade", sparks: sparks, intensity: intensity }, 24);
                if (total > 0) WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.3, 0)), sacredfireHitText, [total], 26);
                done(current);
            }

            function leaveFlame(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                const ground = sacredfireGround(scope, at);
                let elapsed = 0;
                function pulse(current: CombatAction, elapsed: number): void {
                    const ring = current.world();
                    let hits = 0;
                    WorldGeometry.selectEnemies(ring, WorldGeometry.ring(ground, 0, flameRadius, { below: 2, above: 2 }), function (enemy, facts) {
                        if (String(enemy.ref()) === String(actor.ref()) || hits >= cap) return;
                        if (!hurt(current, enemy, "sacredfire", flamePower, { damage: damageSpec("sacredfire", "flame") })) return;
                        hits++;
                        total++;
                        WorldFeedback.emit(ring, sacredfireScene, 1, facts.position(),
                            { moment: "flamehit", target: String(enemy.ref()), sparks: Math.round(6 + flamePower), scale: scale, intensity: Math.max(0.5, Math.min(1.6, flamePower / 15)) }, 18);
                    });
                    WorldFeedback.keep(ring, "sacredfire:flame:" + String(actor.ref()), sacredfireScene, 1, ground,
                        { moment: "flame", radius: flameRadius, flow: Math.round(30 + flameRadius * 14), sparks: sparks, scale: scale }, flamePulse + 6);
                    elapsed += flamePulse;
                    if (elapsed >= flameTicks) { finish(current); return; }
                    current.after(flamePulse, function (next: CombatAction) { pulse(next, elapsed); });
                }
                WorldFeedback.keep(scope, "sacredfire:flame:" + String(actor.ref()), sacredfireScene, 1, ground,
                    { moment: "flame", radius: flameRadius, flow: Math.round(30 + flameRadius * 14), sparks: sparks, scale: scale }, flameTicks + 12);
                pulse(current, 0);
            }

            function strikeAt(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const target = hit.target();
                const point = hit.position();
                struck = true;
                const landed = impact(current, hit, "sacredfire", power,
                    { damage: damageSpec("sacredfire", "strike"), status: "burn", chance: burnChance, contact: true });
                const body = target !== null ? scope.observe(target) : null;
                const at = body !== null ? body.position() : point;
                WorldFeedback.emit(scope, sacredfireScene, 1, at,
                    { moment: "hit", target: target !== null ? String(target.ref()) : "", sparks: sparks, scale: scale, intensity: intensity }, 30);
                sound(current, "cobblemon:impact.fire");
                if (target !== null && scope.valid(target)) {
                    scope.displace(target, direction.scale(push));
                    if (CombatStatus.has(scope, target, "burn"))
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), sacredfireBurnText, [], 28);
                }
                if (landed) total++;
                if (!smite) leaveFlame(current, at); else finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const step = Math.min(pace, Math.max(0, sprint - travelled));
                if (step <= 0.001) { if (!smite) leaveFlame(current, here); else finish(current); return; }
                const delta = direction.scale(step);
                const hit = current.trace(here, here.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity()) { strikeAt(current, hit); return; }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= sprint) {
                    const body = scope.observe(actor);
                    WorldFeedback.emit(scope, sacredfireScene, 1, body !== null ? body.position() : here,
                        { moment: "whiff", sparks: sparks, scale: scale, intensity: intensity }, 26);
                    sound(current, "minecraft:entity.generic.explode");
                    total++;
                    if (!smite) leaveFlame(current, here); else finish(current);
                    return;
                }
                WorldFeedback.keep(scope, "sacredfire:trail:" + String(actor.ref()), sacredfireScene, 1, here,
                    { moment: "dive", sparks: sparks, scale: scale, intensity: intensity }, 8);
                current.face(here.plus(direction), 22, 22);
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "minecraft:item.firecharge.use");
            const body = world.observe(actor);
            WorldFeedback.emit(world, sacredfireScene, 1, body !== null ? body.position() : action.origin(),
                { moment: "risen", smite: smite, sparks: sparks, intensity: intensity }, 18);
            advance(action);
        }
    });
}
