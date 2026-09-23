/**
 * 岩石打磨 / rockpolish — 执行组织。
 *
 * 核心念头：拿地面当磨石，把身上粗糙的那层一圈圈磨掉。火花与石粉往外溅，磨过的地面留下一圈亮痕；
 *   磨光之后空气挂不住你，速度大幅提高——可这层光面会随时间失亮，磨出来的速度也跟着一起收回。
 *
 * 两幕：
 *   磨（windup 播「起磨」，提交前只观察与预告，打断不花代价）。
 *   亮（提交后）：NativeEffects.boost(spe, gift) 写入公共能力阶梯，挂上带级数的共享身份
 *     world_combat:status/polished「光面」窗口；用 world.terrain 把脚下石质地面租借成磨亮的方块（到期原样回来），
 *     并按 sparks／dust 播放火花与石粉。
 * 结束：光面窗口走完（或被牛奶、清除解掉）时，这段打磨抬起的等级原样收回——对手因此有一次拖过去的反制。
 */
namespace PokemonSkills {
    const rockPolishScene = "world_combat:move_rockpolish";
    const rockPolishShine = "world_combat:rock_polish_shine";
    const rockPolishText = "world_combat.move.rockpolish.text.shined";
    const rockPolishFadeText = "world_combat.move.rockpolish.text.dulled";
    /** 表现里的参考半径：`data.scale = 实际磨亮半径 / 这个数`，让地环与地面痕迹同半径。 */
    const rockPolishReferenceRadius = 1.2;
    /** 会被磨亮的地面：只认石质家族，各换成同族的磨光方块；不在表里的地面只落粉、不动方块。 */
    const rockPolishFloor: { [id: string]: string } = {
        "minecraft:stone": "minecraft:smooth_stone",
        "minecraft:cobblestone": "minecraft:stone",
        "minecraft:deepslate": "minecraft:polished_deepslate",
        "minecraft:cobbled_deepslate": "minecraft:polished_deepslate",
        "minecraft:granite": "minecraft:polished_granite",
        "minecraft:diorite": "minecraft:polished_diorite",
        "minecraft:andesite": "minecraft:polished_andesite",
        "minecraft:tuff": "minecraft:polished_tuff",
        "minecraft:blackstone": "minecraft:polished_blackstone",
        "minecraft:basalt": "minecraft:smooth_basalt",
        "minecraft:sandstone": "minecraft:smooth_sandstone",
        "minecraft:red_sandstone": "minecraft:smooth_red_sandstone"
    };

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function rockPolishStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function rockPolishRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = rockPolishStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, rockPolishStage(world, actor, stat) - before);
    }

    /** 把脚下一圈石质地面租借成磨亮的方块；到期原样还回。非石质地面不列入 cells。 */
    function rockPolishGrind(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
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
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                const polished = rockPolishFloor[id];
                if (polished) cells.push({ x: x, y: y, z: z, block: polished });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    define({
        id: "rockpolish",
        cooldownParameter: "wait",
        name: "岩石打磨",
        description: "经过准备后大幅提高速度，效果结束后收回本次提升。",
        uses: ["开战前站定磨一轮，把速度拉满", "用可见的光面窗口逼对手拖时间", "顺手把脚下的石地磨亮、标下这块场地"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 14,
        active: 1,
        recover: 6,
        cooldown: 90,
        style: "polish",
        stationary: true,
        defaults: { grit: 0, ai: { maxChase: 15, minGap: 4 } },
        fields: [
            field(pathOf("grit"), "磨料", "choice", {
                options: [
                    { value: 0, label: "粗磨" },
                    { value: 1, label: "精磨" }
                ],
                help: "粗磨：起手与冷却更短、地面留痕更小、光面更短；精磨：起手与冷却更长、地圈更大、光面更久，轻身板也能磨到满级。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: p("rockpolish", "patchRadius", pokemon), geometry: "area", style: "polish", color: 0xE8B87A,
                label: config && Number(config.grit) === 1 ? "岩石打磨 · 精磨" : "岩石打磨 · 粗磨" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["rockpolish"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("rockpolish", "tempo", context)),
                recover: Math.round(p("rockpolish", "aftercast", context)),
                cooldown: Math.round(p("rockpolish", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_rockpolish:grind", rockPolishScene, 1, action.origin(),
                JSON.stringify({ moment: "grind", fine: config && Number(config.grit) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const fine = !!(config && Number(config.grit) === 1);
            const gift = Math.max(2, Math.min(3, Math.round(p("rockpolish", "gift", action))));
            const shine = Math.max(90, Math.round(p("rockpolish", "shine", action)));
            const patchRadius = Math.max(0.9, p("rockpolish", "patchRadius", action));
            const sparks = Math.max(12, Math.round(p("rockpolish", "sparks", action)));
            const dust = Math.max(10, Math.round(p("rockpolish", "dust", action)));
            const scale = patchRadius / rockPolishReferenceRadius;
            const levels = rockPolishRaise(world, actor, "spe", gift);
            MobEffects.apply(world, actor, rockPolishShine, shine, levels);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            const laid = rockPolishGrind(world, feet, patchRadius, shine);
            WorldFeedback.emit(world, rockPolishScene, 1, feet,
                { moment: "flash", actor: String(actor.ref()), gift: levels, shine: shine, patchRadius: patchRadius,
                    sparks: sparks, dust: dust, scale: scale, laid: laid, fine: fine ? 1 : 0,
                    intensity: Math.max(0.8, Math.min(2, levels / 2 + (fine ? 0.6 : 0))) }, 34);
            WorldFeedback.keep(world, "rockpolish:shine:" + String(actor.ref()), rockPolishScene, 1, body.position(),
                { moment: "shine", actor: String(actor.ref()), sparks: sparks, scale: scale }, Math.min(shine, 240));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), rockPolishText, [levels], 32);
            world.sound("minecraft:block.grindstone.use", body.position(), 16, "{}");
            done(action);
        }
    });

    // 光面走完（或被人解除）：把这段打磨抬起的等级原样收回，只收到当前实际持有的正等级，避免抹掉别处的增益。
    WorldCombat.on("world_combat:move_rockpolish/dull", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rockPolishShine) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(1, Math.round(Number(data.amplifier) || 1));
        const loss = Math.min(levels, Math.max(0, rockPolishStage(world, actor, "spe")));
        if (loss > 0) NativeEffects.boost(world, actor, "spe", -loss);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, rockPolishScene, 1, body.position(), { moment: "dull", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), rockPolishFadeText, [], 24);
    });
}
