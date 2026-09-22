/**
 * 豁出去 / temperflare 的出手方式。
 *
 * 核心念头：上一次出手落空、索性什么都不顾了——点着自己整个人朝目标撞过去；撞上的那一下连人带火炸开，
 *   把身边的人都燎到，地上留下一片焦痕。带着这股自暴自弃时，火更大、撞到的人还会被点着。
 *
 * 两幕：
 *   起（gather，提交前）：火从脚下窜起、裹住身体，只播预告。
 *   撞（charge → burst／scorch／miss）：提交后逐刻朝目标冲，trace 撞上活体即结算 `flare` 接触伤害、
 *       把目标顶开，并在落点炸开一圈 `scorch` 溅射；没撞到人也在尽头炸开一次。带豁出去时命中者被点燃，
 *       落点留下焦痕。
 *
 * 与同族分开：
 *   跺脚（stompingtantrum）是原地跺地、沿一条缝掀人，走的是地面；
 *   豁出去是**把自己整个人烧着撞出去**，走的是空中与火，代价是收招与冷却更长——一个埋进地里，一个烧在风里。
 */
namespace PokemonSkills {
    /** 地表的焦痕形态：草土类烧成粗土，沙地烧成砂岩；其余不动。 */
    function temperCharred(id: string): string {
        if (id === "minecraft:grass_block" || id === "minecraft:dirt" || id === "minecraft:coarse_dirt" ||
            id === "minecraft:podzol" || id === "minecraft:rooted_dirt" || id === "minecraft:moss_block" ||
            id === "minecraft:gravel") return "minecraft:coarse_dirt";
        if (id === "minecraft:sand" || id === "minecraft:red_sand") return "minecraft:sandstone";
        if (id === "minecraft:stone" || id === "minecraft:cobblestone" || id === "minecraft:andesite" ||
            id === "minecraft:diorite" || id === "minecraft:granite" || id === "minecraft:tuff") return "minecraft:cobblestone";
        return "";
    }

    /** 在落点铺一圈焦痕；只动地表的可换方块，到期原方块回来。 */
    function temperScorch(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        const limit = Math.max(6, Math.round(cap)), r = Math.ceil(radius);
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 1; dy >= -2; dy--) {
                const y = baseY + dy, block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const key = x + "," + y + "," + z;
                if (!seen[key]) {
                    const charred = temperCharred(id);
                    if (charred !== "" && charred !== id) { seen[key] = true; cells.push({ x: x, y: y, z: z, block: charred }); }
                }
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: temperId,
        name: "Temper Flare",
        description: "Spurred by desperation, the user attacks the target. This move's power is doubled if the user's previous move failed.",
        uses: ["上一次打空后烧着自己撞出去", "在落点炸开一片火、燎到围观的人", "把撞到的人点着并在地上留下焦痕"],
        kind: "enemy",
        range: 3.2,
        maxRange: 4.2,
        prepare: 5,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "fire",
        defaults: { reckless: false, ai: { maxChase: 8, punishWhiff: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(temperId, "blast", pokemon) : 1.5, geometry: "line", style: "fire",
                color: 0xE0562A, label: config && config.reckless === true ? "豁出去·拼命" : "豁出去" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[temperId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(temperId, "tempo", context)),
                recover: Math.round(p(temperId, "settle", context)),
                cooldown: Math.round(p(temperId, "recharge", context)),
                active: 0,
                range: p(temperId, "dash", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:temperflare:gather", temperScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", reckless: config && config.reckless === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const start = world.observe(actor);
            if (start === null) { done(action); return; }
            const direction = aim(action);
            const length = p(temperId, "dash", action);
            const step = p(temperId, "charge", action);
            const radius = p(temperId, "collisionRadius", action);
            const traceAhead = 1.2;
            const doubled = CombatStatus.has(world, actor, temperStatus);
            let travelled = 0, settled = false;

            sound(action, "minecraft:entity.blaze.shoot");
            WorldFeedback.emit(world, temperScene, 1, start.position(),
                { moment: "charge", direction: [direction.x(), direction.y(), direction.z()], scale: radius / 0.45,
                    doubled: doubled ? 1 : 0, intensity: Math.max(0.6, Math.min(2.4, p(temperId, "flare", action) / 75)) }, 30);

            /** 撞上或冲到尽头：结算主目标、爆开溅射、铺焦痕，然后收招。 */
            function detonate(current: CombatAction, point: CombatPoint, primary: CombatImpact | null): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const flarePower = p(temperId, "flare", current);
                const scorchPower = p(temperId, "scorch", current);
                const blast = p(temperId, "blast", current);
                const push = p(temperId, "push", current);
                const embers = Math.max(6, Math.round(p(temperId, "embers", current)));
                const ignite = Math.max(20, Math.round(p(temperId, "igniteTicks", current)));
                const scorchTicks = Math.max(40, Math.round(p(temperId, "scorchTicks", current)));
                const scorchCells = Math.max(6, Math.round(p(temperId, "scorchCells", current)));
                const scale = Math.max(0.5, Math.min(2.2, blast / 1.5));
                const intensity = Math.max(0.5, Math.min(2.4, flarePower / 75));
                let struck = 0;
                let primaryRef = "";

                if (primary !== null) {
                    const target = primary.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) {
                        primaryRef = String(target.ref());
                        if (impact(current, primary, temperId, flarePower, { damage: damageSpec(temperId, "flare"), contact: true })) {
                            struck++;
                            const away = primary.position().minus(current.origin());
                            if (away.length() > 0.05 && scope.valid(target)) scope.displace(target, away.unit().scale(push));
                            if (doubled && scope.valid(target)) scope.ignite(target, ignite);
                        }
                    }
                }

                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, blast, { below: 2, above: 2.5 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === primaryRef || ref === String(current.actor().ref())) return;
                    if (!hurt(current, enemy, temperId, scorchPower, { damage: damageSpec(temperId, "scorch") })) return;
                    struck++;
                    const away = facts.position().minus(point);
                    if (scope.valid(enemy)) {
                        if (away.length() > 0.2) scope.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push * 0.7));
                        if (doubled) scope.ignite(enemy, ignite);
                    }
                    WorldFeedback.emit(scope, temperScene, 1, facts.position(),
                        { moment: "scorch", target: ref, embers: Math.max(4, Math.round(embers / 2)), scale: scale,
                            doubled: doubled ? 1 : 0, intensity: intensity }, 22);
                });

                WorldFeedback.emit(scope, temperScene, 1, point,
                    { moment: "burst", embers: embers, scale: scale, doubled: doubled ? 1 : 0, intensity: intensity }, 26);
                sound(current, doubled ? "minecraft:entity.generic.explode" : "cobblemon:impact.fire");
                const cells = temperScorch(scope, point, blast, scorchTicks, scorchCells);
                WorldFeedback.emit(scope, temperScene, 1, point,
                    { moment: "char", radius: blast, cells: cells, intensity: intensity }, 26);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)),
                    doubled ? temperRageText : struck > 0 ? temperHitText : temperMissText, doubled || struck > 0 ? [struck] : [], 26);
                done(current);
            }

            function advance(current: CombatAction): void {
                if (settled) return;
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(here, here.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) { detonate(current, hit.position(), hit); return; }
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < 0.05 || travelled >= length) { detonate(current, here.plus(delta), null); return; }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
