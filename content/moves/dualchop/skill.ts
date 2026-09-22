/**
 * 二连劈 / dualchop —— 出手方式。
 *
 * 核心念头：一记**同点两劈**。抡起坚硬的前肢/角，第一劈砸开对方的架势、并在落点地面留下一道裂痕；第二劈
 *   顺着这道裂痕劈进同一处，第一劈命中则这一下撕得更深。两下都是站定、垂直的向前重击，龙属性能量沿裂痕扩散。
 *
 * 幕：
 *   起（raise，提交前）：前肢抬起、对准落点，只播预告（`action.present`，可打断、不花 PP）。
 *   一（chop1，提交后）：第一劈。身前扇形内最多 `maxTargets` 个非友方各挨一记 `chop` 接触伤害，被顶开 `push` 格；
 *       随后在地面沿朝向租出一道长 `quake` 的裂痕（到期原方块回来）。
 *   二（chop2）：`gap` 之后第二劈。再次扫过扇形，第一劈命中者在这劈吃到 `breach` 加成；走出扇面或裂痕的人躲开。
 *   收（settle）：收势的余震。
 *
 * 与同族分开：二连击是水平回扫、把人来回推；双翼是掠飞、有升力；只有二连劈是**站定、垂直下砸、地面开裂**，
 *   第一劈的裂痕就是第二劈的落点标记，反制方式是趁两劈之间离开裂痕。
 */
namespace PokemonSkills {
    /** 在身前沿朝向租出一道地面裂痕；返回实际铺出的格数与用于表现的顶点。 */
    function dualchopCrack(world: CombatWorld, origin: CombatPoint, direction: CombatPoint, length: number, ticks: number): { placed: number; path: number[][] } {
        const heading = WorldCombat.point(direction.x(), 0, direction.z());
        const flat = heading.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : heading.unit();
        const cells: any[] = [], path: number[][] = [];
        const steps = Math.max(1, Math.round(length));
        for (let i = 1; i <= steps; i++) {
            const at = origin.plus(flat.scale(i));
            const x = Math.floor(at.x()), z = Math.floor(at.z()), baseY = Math.floor(at.y());
            for (let dy = 1; dy >= -3; dy--) {
                const y = baseY + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                const above = world.block(WorldCombat.point(x, y + 1, z));
                const over = above === null ? "" : String(above.id());
                if (over === "minecraft:air" || over === "minecraft:cave_air" || over === "minecraft:void_air") {
                    cells.push({ x: x, y: y, z: z, block: "minecraft:cracked_stone_bricks" });
                    path.push([x + 0.5, y + 1.02, z + 0.5]);
                }
                break;
            }
        }
        if (!cells.length) return { placed: 0, path: path };
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return { placed: 0, path: path }; }
        return { placed: cells.length, path: path };
    }

    define({
        id: dualchopId,
        name: "Dual Chop",
        description: "The user attacks its target by hitting it with brutal strikes. The target is hit twice in a row.",
        uses: ["站定抡起前肢，朝同一处连劈两下", "第一劈砸地留裂痕，第二劈追着裂痕撕深", "分劈式把身前一小片敌人一起劈到"],
        kind: "enemy",
        range: 2.9,
        maxRange: 4.2,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 28,
        style: "chop",
        defaults: { breach: true, ai: { maxChase: 9, finishLow: false, leaveStation: true } },
        fields: [flag("breach", "裂痕追击")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[dualchopId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dualchop", "tempo", context)),
                recover: Math.round(p("dualchop", "settle", context)),
                cooldown: Math.round(p("dualchop", "recharge", context)),
                active: 0,
                range: p("dualchop", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const shards = Math.max(6, Math.round(p("dualchop", "shards", action)));
            action.present("dualchop:raise:" + action.id(), dualchopScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", windup: prepare, shards: shards, breach: config && config.breach === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[dualchopId], detail: { values: config } };
            return {
                radius: p("dualchop", "reach", context), geometry: "cone", style: "chop", color: 0xC79BE8,
                label: config && config.breach === true ? "二连劈·裂痕" : "二连劈·分劈"
            };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const breach = !!(config && config.breach === true);
            const power = p("dualchop", "chop", action);
            const gap = Math.max(2, Math.round(p("dualchop", "gap", action)));
            const reach = Math.max(2, action.range());
            const span = p("dualchop", "span", action);
            const breachBonus = p("dualchop", "breach", action);
            const push = p("dualchop", "push", action);
            const quake = p("dualchop", "quake", action);
            const crackTicks = Math.max(40, Math.round(p("dualchop", "crackTicks", action)));
            const shards = Math.max(8, Math.round(p("dualchop", "shards", action)));
            const cap = Math.max(1, Math.round(p("dualchop", "maxTargets", action)));
            const band = { below: 1.5, above: 2.6 };
            let landedFirst = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function chop(current: CombatAction, index: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) {
                    if (index === 1) { finish(current); return; }
                    current.after(2, function (next: CombatAction) { chop(next, 1); });
                    return;
                }
                const origin = self.position();
                const direction = aim(current);
                const heading = [direction.x(), direction.y(), direction.z()];
                WorldFeedback.emit(scope, dualchopScene, 1, origin,
                    { moment: index === 0 ? "chop1" : "chop2", index: index + 1, reach: reach, span: span, shards: shards,
                        breach: breach ? 1 : 0, direction: heading }, 22);
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, direction, reach, span, band), function (victim, facts) {
                    if (hits >= cap) return;
                    const bonus = index === 1 && landedFirst ? 1 + breachBonus : 1;
                    if (!hurt(current, victim, dualchopId, power * bonus, { damage: damageSpec(dualchopId, "chop"), contact: true })) return;
                    hits++;
                    if (index === 0) landedFirst = true;
                    const at = scope.observe(victim);
                    const point = at === null ? facts.position() : at.position();
                    if (scope.valid(victim) && index === 0) {
                        const away = WorldCombat.point(point.x() - origin.x(), 0, point.z() - origin.z());
                        if (away.length() >= 0.05) scope.displace(victim, away.unit().scale(push));
                    }
                    WorldFeedback.emit(scope, dualchopScene, 1, point,
                        { moment: index === 0 ? "hit1" : "hit2", target: String(victim.ref()), shards: shards, index: index + 1,
                            intensity: Math.max(0.5, Math.min(2, (power * bonus) / 60)) }, 22);
                    scope.sound("cobblemon:impact.dragon", point, 14, "{}");
                });
                if (index === 0) {
                    const crack = dualchopCrack(scope, origin, direction, quake, crackTicks);
                    if (crack.placed > 0)
                        WorldFeedback.emit(scope, dualchopScene, 1, origin,
                            { moment: "crack", path: crack.path, quake: quake, scale: Math.max(0.6, Math.min(2, quake / 4)) }, Math.min(200, crackTicks));
                    else
                        WorldFeedback.emit(scope, dualchopScene, 1, origin.plus(direction.scale(reach * 0.5)),
                            { moment: "miss1", reach: reach, span: span, shards: shards }, 18);
                    current.after(gap, function (next: CombatAction) { chop(next, 1); });
                    return;
                }
                if (index === 1 && hits > 0 && landedFirst)
                    WorldFeedback.text(scope, origin.plus(direction.scale(reach * 0.5)).plus(WorldCombat.point(0, 1.0, 0)), dualchopBreachText, [], 22);
                WorldFeedback.emit(scope, dualchopScene, 1, origin.plus(direction.scale(reach * 0.5)),
                    { moment: "settle", reach: reach, quake: quake, shards: shards }, 18);
                finish(current);
            }

            sound(action, "minecraft:entity.iron_golem.attack");
            chop(action, 0);
        }
    });
}
