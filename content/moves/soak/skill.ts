/**
 * 浸水 / soak — 出手方式。
 *
 * 核心念头：把对手整个浇透——一道水柱从施法者手里沿视线冲到它身上，当着它的面把属性冲掉、换成水。
 *   浇过的地方留下一小块湿泥，水干了原方块回来。漫流档还能把身边一圈人一起浇。
 *
 * 幕：
 *   聚（windup，提交前）：手里聚起水，只观察与预告，可被打断且不花代价。
 *   浇（pour，提交后）：水沿视线冲到对手身上；命中的目标被写进共享 NativeModifiers types 层（单一水属性，
 *     到期自动还原原生属性），并挂共享身份 `world_combat:status/soak` 的标记；漫流档把判定圈里的非友方一起浇。
 *   落（splash）：水花在脚下炸开，表土被浇成一块湿泥（`world.terrain` 租借，到期原方块回来）。
 *   干（dry）：水属性身份到期时，从目标身上滴下水珠，告诉玩家这一浇已经过去。
 *
 * 反制：已经是纯水的目标浇不进去（预检直接拒绝，不浪费 20 发 PP）；非宝可梦没有属性可换。水干之后属性还原。
 */

namespace PokemonSkills {
    export const soakId = "soak";
    export const soakScene = "world_combat:move_soak";
    export const soakEffect = "world_combat:soaked_through";
    export const soakDrenchText = "world_combat.move.soak.text.drench";
    export const soakDryText = "world_combat.move.soak.text.dry";
    export const soakFizzleText = "world_combat.move.soak.text.fizzle";

    function soakAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.25, 0)); }

    /** 目标当前生效的属性（含临时层）；非宝可梦返回空。 */
    function soakTypes(world: CombatWorld, target: CombatActor): string[] {
        if (String(target.domain()) !== "cobblemon" || !world.valid(target)) return [];
        return NativeEffects.types(CobblemonCombat.pokemon(target), NativeEffects.read(world, target));
    }

    /** 能不能浇：非宝可梦没有属性；已经是纯水也浇不进去。返回拒绝原因或空串。 */
    function soakRefusal(world: CombatWorld, target: CombatActor): string {
        const types = soakTypes(world, target);
        if (types.length === 0) return "no-types";
        if (NativeModifiers.typeLocked(world, target)) return "type-locked";
        return types.join(",") === "water" ? "already-water" : "";
    }

    /** 在落点周围把表土换成一格湿泥；只认自然地面，到期原方块回来。 */
    function soakWetGround(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): void {
        const ground = ["minecraft:grass_block", "minecraft:dirt", "minecraft:coarse_dirt", "minecraft:podzol",
            "minecraft:rooted_dirt", "minecraft:moss_block", "minecraft:sand", "minecraft:red_sand",
            "minecraft:gravel", "minecraft:farmland"];
        const reach = Math.max(0, Math.round(radius - 0.5)), cells: any[] = [];
        const x0 = Math.floor(point.x()), z0 = Math.floor(point.z()), y0 = Math.floor(point.y());
        for (let dx = -reach; dx <= reach; dx++) for (let dz = -reach; dz <= reach; dz++) {
            if (dx * dx + dz * dz > reach * reach + reach) continue;
            const x = x0 + dx, z = z0 + dz;
            for (let dy = 0; dy <= 3; dy++) {
                const y = y0 - dy, block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (ground.indexOf(id) >= 0) cells.push({ x: x, y: y, z: z, block: "minecraft:mud" });
                break;
            }
        }
        if (!cells.length) return;
        try {
            world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks)));
        } catch (error) { }
    }

    // 水属性身份到期：从目标身上滴下水珠，告诉玩家这一浇已经干了。属性层随效果同寿命自动还原。
    WorldCombat.on("world_combat:move_soak/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== soakEffect) return;
        if (String(data.cause) !== "expired") return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target)) return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, soakScene, 1, body.position(), { moment: "dry", target: String(target.ref()) }, 22);
        WorldFeedback.text(world, soakAbove(body.position()), soakDryText, [], 26);
    });

    define({
        id: soakId,
        cooldownParameter: "recharge",
        name: "浸水",
        description: "把大量水浇在对手身上，把它的属性整个冲成水属性；漫流档还能浇到它身边一圈人，并把地面浸出一块湿泥。",
        uses: ["把对手的属性和本系一起冲成水", "打开雷与草的弱点、封掉火与地的本系", "顺手把围在身边的一圈敌人一起浇透"],
        kind: "enemy",
        range: 6,
        maxRange: 12,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 88,
        style: "drench",
        defaults: { flood: false },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[soakId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(soakId, "tempo", context)),
                recover: Math.round(p(soakId, "aftercast", context)),
                cooldown: Math.round(p(soakId, "recharge", context)),
                active: 1,
                range: p(soakId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[soakId], detail: { values: config } };
            return { radius: p(soakId, "reach", context), geometry: "line", style: "drench", color: 0x4FA8E8,
                label: config && config.flood === true ? "浸水 · 漫流" : "浸水" };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p(soakId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return soakRefusal(world, target);
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_soak:gather", soakScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", streaks: p(soakId, "streaks", action),
                    flood: config && config.flood === true ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor);
            const at = target === null ? null : world.observe(target);
            if (target === null || !world.valid(target) || self === null || at === null) { done(action); return; }
            const flood = !!(config && config.flood);
            const hold = Math.max(40, Math.round(p(soakId, "hold", action)));
            const splash = Math.max(1.2, p(soakId, "splash", action));
            const streaks = Math.max(8, Math.round(p(soakId, "streaks", action)));
            const ripples = Math.max(4, Math.round(p(soakId, "ripples", action)));
            const puddle = Math.max(40, Math.round(p(soakId, "puddle", action)));
            const point = at.position();
            const scale = Math.max(0.6, Math.min(2.4, splash / 1.6));
            let hits = 0;

            function drench(other: CombatActor): void {
                if (!world.valid(other) || soakRefusal(world, other)) return;
                NativeModifiers.apply(world, other, { types: ["water"] }, hold);
                MobEffects.apply(world, other, soakEffect, hold, flood ? 1 : 0);
                hits++;
                const body = world.observe(other);
                if (body === null) return;
                WorldFeedback.emit(world, soakScene, 1, body.position(),
                    { moment: "splash", target: String(other.ref()), splash: splash, ripples: ripples, streaks: streaks, scale: scale }, 30);
                WorldFeedback.text(world, soakAbove(body.position()), soakDrenchText, [], 30);
            }

            drench(target);
            if (flood) WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, splash, { below: 2, above: 3 }),
                function (other, facts) {
                    if (String(other.ref()) === String(target.ref())) return;
                    drench(other);
                });

            WorldFeedback.emit(world, soakScene, 1, point,
                { moment: "pour", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                    streaks: streaks, ripples: ripples, splash: splash, hits: hits, scale: scale }, 40);
            if (hits === 0) {
                WorldFeedback.emit(world, soakScene, 1, point, { moment: "fizzle", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, soakAbove(point), soakFizzleText, [], 26);
            } else {
                soakWetGround(world, point, splash, puddle);
            }
            sound(action, "cobblemon:move.watergun.actor");
            world.sound("minecraft:entity.generic.splash", point, 14, "{}");
            done(action);
        }
    });
}
