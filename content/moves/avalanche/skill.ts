/**
 * 雪崩 / avalanche 的出手方式。
 *
 * 核心念头：把一路挨打积起来的重量拢成一堆雪，朝对手滚碾过去；带着「被打懵」的积伤时这一记翻倍，
 *   被压得越久、雪堆得越沉，崩下来的范围与击退越大，落点留下一片短暂的积雪。
 *
 * 两幕半：
 *   起（windup，提交前）：头顶拢起雪团、冰屑向内收，积伤越厚拢得越大（present gather）。
 *   滚（execute）：沿瞄准方向慢而重地推进，trace 撞上活体即结算 `collapse`；
 *       命中后原地崩开一圈震荡，波及附近每个非友方，并把落点地面租成一层积雪（frost）。
 *
 * 与同族分开：雪崩读的是「我自己累计挨了多少」，慢、广、留冰；报复读「这个对手刚打过我」（短而直的一拳）；
 *   恶意追击读目标的伤（贴身追）；清醒读目标的麻痹。
 */
namespace PokemonSkills {
    /** 在落点把地面租成一层积雪；活物占着的格子由宿主等它走开再合上。 */
    function avalancheSnow(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [], r = Math.max(1, Math.min(2, Math.floor(radius)));
        const reach = Math.max(radius, r), cx = Math.floor(centre.x()), cz = Math.floor(centre.z());
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (dx * dx + dz * dz > reach * reach + 0.01) continue;
            const x = cx + dx, z = cz + dz;
            let y = Math.floor(centre.y());
            for (let k = 0; k < 4; k++) {
                const probe = world.block(WorldCombat.point(x + 0.5, y, z + 0.5));
                if (probe !== null && probe.id() !== "minecraft:air") break;
                y -= 1;
            }
            const ground = world.block(WorldCombat.point(x + 0.5, y, z + 0.5));
            if (ground === null || ground.id() === "minecraft:air") continue;
            cells.push({ x: x, y: y, z: z, block: "minecraft:snow_block" });
        }
        return cells.length ? world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks) : 0;
    }

    define({
        freeMovement: true,
        id: avalancheId,
        cooldownParameter: "recharge",
        name: "Avalanche",
        description: "把一路挨打积起来的重量拢成雪堆碾过去：自己带着「被打懵」积伤时威力翻倍，积得越厚范围与击退越大，落点留下一片短暂积雪。",
        uses: ["挨了一轮打之后用翻倍的一记压制", "把围在身边的对手一起崩开", "在落点留一片积雪改变脚下"],
        kind: "enemy",
        range: 2.8,
        maxRange: 5.2,
        prepare: 8,
        active: 0,
        recover: 9,
        cooldown: 34,
        style: "ice",
        defaults: { deepdrift: false, ai: { maxChase: 9, crumble: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(avalancheId, "radius", pokemon) * 1.2 : 1.0, geometry: "line", style: "ice", color: 0x6FC4E8,
                label: config && config.deepdrift === true ? "雪崩·厚重" : "雪崩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[avalancheId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(avalancheId, "brace", context)),
                recover: Math.round(p(avalancheId, "settle", context)),
                cooldown: Math.round(p(avalancheId, "recharge", context)),
                active: 0,
                range: p(avalancheId, "reach", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const stacks = world.valid(actor) ? avalancheStacks(world, actor) : 0;
            const shards = Math.round(p(avalancheId, "shards", action));
            action.present("avalanche:gather", avalancheScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", stacks: stacks, battered: stacks > 0 ? 1 : 0,
                    shards: shards + stacks * 2, deepdrift: config && config.deepdrift === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const direction = aim(action);
            const length = p(avalancheId, "reach", action);
            const step = p(avalancheId, "step", action);
            const radius = p(avalancheId, "radius", action);
            const push = p(avalancheId, "push", action);
            const shards = Math.round(p(avalancheId, "shards", action));
            const frost = Math.max(1, Math.round(p(avalancheId, "frost", action)));
            const stacks = avalancheStacks(action.world(), action.actor());
            const battered = stacks > 0;
            const scale = Math.max(0.5, Math.min(2.0, radius / 1.0));
            let travelled = 0;

            sound(action, "minecraft:block.powder_snow.place");
            WorldFeedback.emit(action.world(), avalancheScene, 1, action.origin(),
                { moment: "roll", direction: [direction.x(), direction.y(), direction.z()],
                    shards: shards, battered: battered ? 1 : 0, scale: scale }, 30);

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(here, here.plus(delta.scale(p(avalancheId, "traceAhead", current))), radius * 0.6);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    const point = hit.position();
                    let landed = false;
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const power = p(avalancheId, "collapse", current);
                        landed = impact(current, hit, avalancheId, power, { damage: damageSpec(avalancheId, "collapse"), contact: true });
                        if (landed) {
                            const away = point.minus(here);
                            if (away.length() > 0.05 && scope.valid(victim)) scope.displace(victim, away.unit().scale(push));
                        }
                        // 崩开一圈：波及附近每个非友方（主角已单独结算过）。
                        const around = scope.query(point, radius, false);
                        for (let index = 0; index < around.length; index++) {
                            const other = around[index];
                            if (String(other.ref()) === String(victim.ref())) continue;
                            if (!scope.valid(other) || scope.friendly(other)) continue;
                            const body = scope.observe(other);
                            if (body === null) continue;
                            if (hurt(current, other, avalancheId, power * 0.7, { damage: damageSpec(avalancheId, "collapse"), contact: false })) {
                                const away = body.position().minus(point);
                                if (scope.valid(other) && away.length() > 0.05) scope.displace(other, away.unit().scale(push * 0.7));
                            }
                        }
                    }
                    if (landed) {
                        avalancheSnow(scope, point, radius, frost);
                        WorldFeedback.emit(scope, avalancheScene, 1, point.plus(WorldCombat.point(0, -0.6, 0)),
                            { moment: "frost", scale: scale, shards: Math.round(shards * 0.6) }, Math.min(6000, 40 + frost));
                    }
                    WorldFeedback.emit(scope, avalancheScene, 1, point,
                        { moment: "crash", target: victim === null ? "" : String(victim.ref()),
                            battered: battered ? 1 : 0, power: Math.round(p(avalancheId, "collapse", current) * 10) / 10,
                            shards: battered ? shards : Math.round(shards * 0.7), stacks: stacks, scale: scale,
                            intensity: Math.max(0.6, Math.min(2.2, p(avalancheId, "collapse", current) / 70)) }, 34);
                    scope.sound(landed ? "cobblemon:impact.ice" : "minecraft:block.glass.break", point, 16, "{}");
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.15, 0)),
                        landed ? (battered ? avalancheCrashText : avalancheHitText) : avalancheMissText, [], 26);
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(avalancheId, "minimumMove", current) || travelled >= length) {
                    WorldFeedback.emit(scope, avalancheScene, 1, here.plus(delta), { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, here.plus(delta).plus(WorldCombat.point(0, 1.0, 0)), avalancheMissText, [], 24);
                    sound(current, "minecraft:entity.player.attack.nodamage");
                    done(current);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
