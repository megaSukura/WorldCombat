/**
 * 破壳 / shellsmash 的出手方式。
 *
 * 核心念头：把包着自己的硬壳整个撑裂——壳片四散飞出、扎进身周的地里，露出里面柔软而暴露的身体。
 *   攻、特攻、速度猛涨，防、特防随壳一起永久地掉了。它是这一族里唯一**自伤换爆发**的招，
 *   也是唯一在场上留下实体壳片的一招。
 *
 * 三幕：
 *   起式（windup，提交前）：壳体绷紧、接缝处透出光；可被打断，打断不消耗任何东西。
 *   破壳（提交后）：攻／特攻／速度各 +surge，防／特防各 −toll（永久），壳片向外炸开、扎进地面。
 *   落定（收势）：壳片在地里停一会儿（world.terrain 的 linger 租约），到期原方块回来。
 *
 * 与同族分开：龙之舞、蝶舞是原地起舞、只升不降；破壳是**一记自损的爆发**，而且真的把壳的碎片留在地上。
 */
namespace PokemonSkills {
    const shellsmashScene = "world_combat:move_shellsmash";
    const shellsmashText = "world_combat.move.shellsmash.text.broken";

    /**
     * 把壳片扎进身周地面：以自身脚点为心、向外一圈散落 `count` 片，落在最上面一块可替换的实心方块上。
     * 交给 world.terrain 的 linger 租约，`ticks` 后原方块回来；液体、基岩、屏障与受保护的方块不动。
     */
    function shellsmashScatter(world: CombatWorld, centre: CombatPoint, radius: number, count: number, ticks: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = Object.create(null);
        const plates = ["minecraft:calcite", "minecraft:diorite"];
        const cx = Math.floor(centre.x()), cz = Math.floor(centre.z()), cy = Math.floor(centre.y());
        for (let i = 0; i < count; i++) {
            const angle = i * (Math.PI * 2) / count;
            const distance = radius * (0.5 + 0.5 * (((i * 37) % 11) / 10));
            const x = cx + Math.round(Math.cos(angle) * distance), z = cz + Math.round(Math.sin(angle) * distance);
            const key = x + "," + z;
            if (seen[key]) continue;
            for (let dy = 1; dy >= -3; dy--) {
                const y = cy + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                seen[key] = true;
                cells.push({ x: x, y: y, z: z, block: plates[i % plates.length] });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(20, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: "shellsmash",
        name: "破壳",
        description: "撑裂自己的外壳，壳片四散扎进身周的地里，露出柔软的身体：物攻、特攻、速度猛涨，防御与特防永久下降。彻底破壳换来更高更广的一发，代价是更慢的起手与更长的冷却。",
        uses: ["开战前用防御换一波爆发", "在对手够不到的窗口里先破壳", "被围住时连壳一起炸开、赌一波速战速决"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 90,
        style: "shatter",
        stationary: true,
        defaults: { total: false, ai: { minGap: 4, minHealth: 0.45 } },
        fields: [flag("total", "彻底破壳")],
        indicator: function (config, pokemon) {
            return { radius: Math.max(1.0, p("shellsmash", "spread", pokemon)), geometry: "area", style: "shatter", color: 0xE8E2D0,
                label: config && config.total ? "破壳 · 彻底" : "破壳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["shellsmash"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("shellsmash", "tempo", context)),
                recover: Math.round(p("shellsmash", "aftercast", context)),
                cooldown: Math.round(p("shellsmash", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_shellsmash:strain", shellsmashScene, 1, action.origin(),
                JSON.stringify({ moment: "swell", total: config && config.total ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(3, Math.round(p("shellsmash", "surge", action))));
            const toll = Math.max(1, Math.min(2, Math.round(p("shellsmash", "toll", action))));
            const spread = Math.max(1.0, p("shellsmash", "spread", action));
            const shards = Math.max(10, Math.round(p("shellsmash", "shards", action)));
            const shardSize = Math.max(0.05, p("shellsmash", "shardSize", action));
            const shatter = Math.max(0.05, p("shellsmash", "shatter", action));
            const debris = Math.max(20, Math.round(p("shellsmash", "debrisTicks", action)));
            const scale = spread / 1.8;
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));

            NativeEffects.boost(world, actor, "atk", gift);
            NativeEffects.boost(world, actor, "spa", gift);
            NativeEffects.boost(world, actor, "spe", gift);
            NativeEffects.boost(world, actor, "def", -toll);
            NativeEffects.boost(world, actor, "spd", -toll);

            const laid = shellsmashScatter(world, feet, spread, shards, debris);
            WorldFeedback.emit(world, shellsmashScene, 1, body.position(),
                { moment: "crack", actor: String(actor.ref()), surge: gift, toll: toll, shards: shards, shardSize: shardSize,
                    shatter: shatter, spread: spread, scale: scale,
                    intensity: Math.max(0.8, Math.min(2.4, gift / 2 + shards / 30)) }, 30);
            WorldFeedback.emit(world, shellsmashScene, 1, feet,
                { moment: "shed", actor: String(actor.ref()), shards: shards, shardSize: shardSize, shatter: shatter,
                    spread: spread, scale: scale, laid: laid, intensity: Math.max(0.8, Math.min(2.4, shards / 26)) }, 34);
            WorldFeedback.emit(world, shellsmashScene, 1, feet,
                { moment: "settle", actor: String(actor.ref()), shards: Math.min(shards, 24), shardSize: shardSize, spread: spread, scale: scale }, 24);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), shellsmashText, [gift, toll], 30);
            world.sound("minecraft:block.anvil.land", body.position(), 16, "{}");
            world.sound("cobblemon:impact.rock", body.position(), 14, "{}");
            done(action);
        }
    });
}
