/**
 * 丛林治疗 / Jungle Healing —— 出手方式。
 *
 * 核心念头：把自己交给丛林。施法者伏低、把根扎进脚下的土，一圈藤蔓与嫩芽从地里炸起、缠上自己与身边的
 *   伙伴；被绿意缠住的一刻，伤口愈合、身上的异常被一起化掉。脚下是不是真正的自然地面，决定丛林长得多旺。
 *
 * 两幕：
 *   起（windup，提交前）：双手按地、四周浮起绿芽（moment call），只播预告；可被打断，不花代价。
 *   长（execute，提交后）：藤蔓以脚点为心炸开到 radius——圈内的自己与伙伴各回一次血，并化掉全部主异常；
 *     随后在身周自然地面上真的种下一圈短命的嫩芽（`world.terrain` 租借、`linger`，到期原方块回来）。
 *
 * 与生命水滴分开：水一边走一边救人、只回血、不留地面；丛林是瞬间从地里长起、回血并解状态、看脚下是什么地，
 *   并在地面留下会自己谢去的嫩芽。与芳香治疗分开：香云是一块会停留、反复洗的地方，丛林是以自己为心的爆发。
 */
namespace PokemonSkills {
    const junglehealingScene = "world_combat:move_junglehealing";
    const junglehealingText = "world_combat.move.junglehealing.text.embrace";
    /** 表现里的参考半径：`data.scale = 实际藤蔓半径 / 这个数`。 */
    export const junglehealingReferenceRadius = 3.0;
    /** 丛林要化掉的主异常（剧毒由 poison 身份一并带走）。 */
    export const junglehealingMalaise = ["poison", "burn", "paralysis", "sleep", "frozen"];

    /** 回复走共享治疗入口：宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命；返回世界单位回复量。 */
    function junglehealingHeal(world: CombatWorld, target: CombatActor, fraction: number, cause: string): number {
        const before = world.observe(target);
        if (before === null) return 0;
        const amount = Math.min(before.maxHealth() - before.health(), before.maxHealth() * Math.max(0, Math.min(1, fraction)));
        if (amount <= 0) return 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) {
            const pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            world.health(target, amount, "world_combat:" + cause);
        }
        const after = world.observe(target);
        const gained = after === null ? 0 : Math.max(0, after.health() - before.health());
        if (gained > 0) feedback(world, target, after!.position(), "heal", { amount: Math.round(gained * 10) / 10 });
        return gained;
    }

    function junglehealingSoil(id: string): boolean {
        return /grass|dirt|podzol|moss|mud|mycelium|root|farmland|nylium|clay/.test(id);
    }

    /** 在身周真的种下一圈嫩芽；只在自然地面、空气处落脚，租借、到期原方块回来。返回种下的格数。 */
    function junglehealingGrowth(world: CombatWorld, centre: CombatPoint, radius: number, budget: number, ticks: number): number {
        if (budget <= 0) return 0;
        const pick = ["minecraft:short_grass", "minecraft:fern", "minecraft:oak_sapling"];
        const cells: any[] = [];
        const cx = Math.floor(centre.x()), cz = Math.floor(centre.z()), cy = Math.floor(centre.y());
        const r = Math.max(1, Math.ceil(radius));
        for (let dx = -r; dx <= r && cells.length < budget; dx++) for (let dz = -r; dz <= r && cells.length < budget; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            const x = cx + dx, z = cz + dz;
            for (let dy = 1; dy >= -3; dy--) {
                const block = world.block(WorldCombat.point(x, cy + dy, z));
                if (block === null) continue;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock") break;
                if (!junglehealingSoil(id)) break;
                const above = world.block(WorldCombat.point(x, cy + dy + 1, z));
                if (above === null) break;
                const aboveId = String(above.id());
                if (aboveId !== "minecraft:air" && aboveId !== "minecraft:short_grass" && aboveId !== "minecraft:tall_grass") break;
                cells.push({ x: x, y: cy + dy + 1, z: z, block: pick[cells.length % pick.length] });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(80, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: junglehealingId, name: "丛林治疗",
        description: "把自己交给丛林：一圈藤蔓与嫩芽从脚下的土里炸起、缠上自己和身边的伙伴，被缠住的一刻回复其最大生命的一成多并化掉全部主异常。脚下是自然地面对丛林长得更旺；之后地上会留下几丛短命的嫩芽。深根让圈更大、回复更多、芽更密，代价是起手与冷却更长。",
        uses: ["给身边的一队伙伴回血并一起解状态", "在自然地面上一次净化整组人", "用一地嫩芽标记丛林来过的地方"],
        kind: "self", range: 2.6, maxRange: 6, prepare: 9, active: 1, recover: 5, cooldown: 140, style: "verdant",
        maximumTicks: 240,
        defaults: { deeproot: false, helpFriends: true, ai: { healBelow: 0.82, maxChase: 12 } },
        fields: [flag("deeproot", "深根")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[junglehealingId], detail: { values: config } };
            return { radius: p(junglehealingId, "radius", context), geometry: "area", style: "verdant", color: 0x6FC24E,
                label: config && config.deeproot === true ? "丛林治疗 · 深根" : "丛林治疗" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[junglehealingId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(3, Math.round(p(junglehealingId, "tempo", context))),
                recover: Math.max(3, Math.round(p(junglehealingId, "aftercast", context))),
                cooldown: Math.round(p(junglehealingId, "wait", context)),
                active: 1,
                range: p(junglehealingId, "radius", context)
            };
        },
        /** 圈里有伤者或带主异常的人（含自己）才值得唤丛林。 */
        ready: function (action) {
            const world = action.sense(), self = action.actor(), body = world.observe(self);
            if (body === null) return "no-body";
            const radius = Math.max(1.2, p(junglehealingId, "radius", action));
            const actors = world.query(body.position(), radius + 0.6, false);
            for (let i = 0; i < actors.length; i++) {
                const other = actors[i];
                if (!world.friendly(other)) continue;
                const view = world.observe(other);
                if (view !== null && view.health() < view.maxHealth() - 0.01) return "";
                for (let j = 0; j < junglehealingMalaise.length; j++)
                    if (CombatStatus.has(world, other, junglehealingMalaise[j])) return "";
            }
            return "no-wounded";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_junglehealing:call", junglehealingScene, 1, action.origin(),
                JSON.stringify({ moment: "call", motes: Math.round(p(junglehealingId, "motes", action)),
                    deeproot: config && config.deeproot === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const ground = WorldCombat.point(origin.x(), origin.y() - body.height() / 2 + 0.03, origin.z());
            const fraction = Math.max(0, Math.min(1, p(junglehealingId, "heal", action)));
            const radius = Math.max(1.2, p(junglehealingId, "radius", action));
            const budget = Math.max(0, Math.round(p(junglehealingId, "sprouts", action)));
            const motes = Math.max(14, Math.round(p(junglehealingId, "motes", action)));
            const scale = radius / junglehealingReferenceRadius;

            world.sound("cobblemon:move.leafstorm.actor", ground, 14, "{}");
            WorldFeedback.emit(world, junglehealingScene, 1, ground,
                { moment: "erupt", radius: radius, motes: motes, scale: scale, vines: budget }, 26);

            const actors = world.query(ground, radius, false);
            for (let i = 0; i < actors.length; i++) {
                const other = actors[i], ref = String(other.ref());
                if (!world.valid(other) || !world.friendly(other)) continue;
                const before = world.observe(other);
                if (before === null) continue;
                const gained = junglehealingHeal(world, other, fraction, "junglehealing");
                let cleaned = 0;
                for (let j = 0; j < junglehealingMalaise.length; j++)
                    if (CombatStatus.cure(world, other, junglehealingMalaise[j])) cleaned++;
                if (gained <= 0 && cleaned <= 0) continue;
                const after = world.observe(other);
                const point = after === null ? before.position() : after.position();
                WorldFeedback.emit(world, junglehealingScene, 1, point,
                    { moment: "embrace", target: ref, gained: Math.round(gained * 10) / 10, cured: cleaned,
                        motes: Math.max(10, Math.round(motes * 0.6)), scale: scale }, 24);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), junglehealingText,
                    [Math.round(gained * 10) / 10, cleaned], 30);
            }

            const laid = junglehealingGrowth(world, ground, radius, budget, 140);
            if (laid > 0) {
                WorldFeedback.emit(world, junglehealingScene, 1, ground,
                    { moment: "residue", radius: radius, motes: Math.max(8, Math.round(motes * 0.4)), scale: scale, laid: laid }, 26);
                world.sound("minecraft:block.moss.place", ground, 12, "{}");
            }
            done(action);
        }
    });
}
