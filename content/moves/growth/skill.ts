/**
 * 生长 / growth 的执行组织。
 *
 * 核心念头：把身体一下子撑大。脚下一沉，绿光从体内往外顶，身形猛地抽长一圈，脚下的土地同时冒出一层草皮；
 * 站在阳光下时这股劲翻倍——阳光就是它的燃料。
 *
 * 两幕：
 *   起（windup 播「聚绿」，提交前只观察与预告，可被打断，打断不花代价）。
 *   长（提交后）：NativeEffects.boost 同时抬起物攻与特攻（阳光下各多一级），挂上共享身份
 *     world_combat:status/grown 的「长大」标记；脚下用 world.terrain 租借一圈苔草与矮草（linger，到期归还原方块）；
 *     播放一次向外扩张的绿环与破土草叶，阳光足时换成更亮的暖金绿版本与「沐光而长」浮字。
 *
 * 与同族分开：自我激励是快、吃自己的伤；生长是慢、吃太阳，并且真的在世上留下一块草地。
 */
namespace PokemonSkills {
    const growthScene = "world_combat:move_growth";
    const growthGrown = "world_combat:grown";
    const growthText = "world_combat.move.growth.text.grown";
    const growthSunText = "world_combat.move.growth.text.sunfed";
    /** 表现里的参考半径：`data.scale = 实际草皮半径 / 这个数`，让地面环与判定同半径。 */
    const growthReferenceRadius = 2.4;

    /** 在身周铺一圈草皮：地表换成苔藓、上面长出矮草；租借，到期原方块回来。 */
    function growthSprout(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [];
        const r = Math.ceil(radius);
        const cx = Math.floor(centre.x()), cz = Math.floor(centre.z()), cy = Math.floor(centre.y());
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            const x = cx + dx, z = cz + dz;
            for (let dy = 1; dy >= -3; dy--) {
                const y = cy + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                if (id !== "minecraft:moss_block") cells.push({ x: x, y: y, z: z, block: "minecraft:moss_block" });
                const above = world.block(WorldCombat.point(x, y + 1, z));
                if (above !== null && (String(above.id()) === "minecraft:air" || String(above.id()) === "minecraft:cave_air"))
                    cells.push({ x: x, y: y + 1, z: z, block: "minecraft:short_grass" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    define({
        id: "growth",
        name: "Growth",
        description: "让身体一下子长大，从而提高攻击和特攻。",
        uses: ["开场先长一轮，把双攻垫起来", "在阳光下翻倍长一次", "把脚下的地顺手变成草皮、标记这块场地"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 10,
        active: 1,
        recover: 6,
        cooldown: 90,
        style: "verdant",
        defaults: { thicket: false },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["growth"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("growth", "tempo", context)),
                recover: Math.round(p("growth", "aftercast", context)),
                cooldown: Math.round(p("growth", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_growth:gather", growthScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", thicket: config && config.thicket ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const atk = Math.max(1, Math.min(2, Math.round(p("growth", "atkGift", action))));
            const spa = Math.max(1, Math.min(2, Math.round(p("growth", "spaGift", action))));
            const spread = Math.max(1.2, Math.min(5, p("growth", "spread", action)));
            const blades = Math.max(6, Math.round(p("growth", "blades", action)));
            const window = Math.max(80, Math.round(p("growth", "grownTicks", action)));
            const scale = spread / growthReferenceRadius;
            NativeEffects.boost(world, actor, "atk", atk);
            NativeEffects.boost(world, actor, "spa", spa);
            MobEffects.apply(world, actor, growthGrown, window, 0);
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const sun = sunlight(world, body.position()) >= growthSunlight;
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            const laid = growthSprout(world, feet, spread, window);
            WorldFeedback.emit(world, growthScene, 1, feet,
                { moment: "swell", actor: String(actor.ref()), scale: scale, blades: blades,
                    gift: atk + spa, sun: sun ? 1 : 0, sunGold: sun ? blades : 0, reach: spread,
                    intensity: Math.max(0.8, Math.min(2, (atk + spa) / 2)) }, 34);
            WorldFeedback.emit(world, growthScene, 1, feet,
                { moment: "sprout", actor: String(actor.ref()), scale: scale, blades: blades, sun: sun ? 1 : 0, laid: laid }, 30);
            WorldFeedback.emit(world, growthScene, 1, feet,
                { moment: "settle", actor: String(actor.ref()), scale: scale, blades: blades }, 24);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)),
                sun ? growthSunText : growthText, [atk, spa], 34);
            world.sound(sun ? "minecraft:block.moss.place" : "minecraft:item.bone_meal.use", body.position(), 16, "{}");
            done(action);
        }
    });
}
