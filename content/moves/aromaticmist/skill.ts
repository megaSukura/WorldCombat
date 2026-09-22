/**
 * 芳香薄雾 / aromaticmist — 执行组织。
 *
 * 核心念头：施法者身上腾起一层带甜香的薄雾，雾不散，就地漫开成一片会停留的香云；走进雾里的伙伴被香气裹住、
 *   特防提起来，离雾之后香还挂在身上一小会儿。它把一次特防强化留在**世界上一个位置**，而不是只贴一个人。
 *
 * 三幕：
 *   腾（windup 播「聚香」）。
 *   铺（提交后）：把香雾送到选定点，用 WorldEffects.field 租借一片会停留的云；云每 5 刻扫一次。
 *   养（持续）：雾里的友方按共享身份 world_combat:status/aromaticmist 挂上真实 MobEffect，特防写入公共能力阶梯；
 *     留在雾里香气不断续上，离雾后香随留香窗口自己走完。
 * 结束：留香窗口到期或被清除时，按该效果等级把特防原样收回。
 * 反制：香雾只在落点一小片、绕开即可；带走的是有限的一小段窗口，清掉留香即可解。
 */
namespace PokemonSkills {
    const aromaticScene = "world_combat:move_aromaticmist";
    const aromaticEffect = "world_combat:aromatic_veil";
    const aromaticField = "world_combat:field/aromaticmist";
    const aromaticVeiledText = "world_combat.move.aromaticmist.text.veiled";
    const aromaticSettleText = "world_combat.move.aromaticmist.text.settle";
    const aromaticFadeText = "world_combat.move.aromaticmist.text.fade";
    /** 表现里的参考半径：`data.scale = 实际香雾半径 / 这个数`。 */
    const aromaticReferenceRadius = 3.6;

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function aromaticStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function aromaticRaise(world: CombatWorld, actor: CombatActor, stat: string, want: number): number {
        const before = aromaticStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, want);
        return Math.max(0, aromaticStage(world, actor, stat) - before);
    }

    // 香云的行为：续播画面；对雾里的友方按节流续上留香，第一次进入才真正抬起特防。
    WorldEffects.fieldRule(aromaticField, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!world.friendly(actor)) return;
            const body = world.observe(actor);
            if (body === null) return;
            const gift = Math.max(1, Math.min(2, Math.round(Number(field.data.gift) || 1)));
            const veil = Math.max(40, Math.round(Number(field.data.veilTicks) || 100));
            const motes = Math.max(8, Math.round(Number(field.data.motes) || 20));
            const view = MobEffects.read(world, actor, aromaticEffect);
            if (view === null) {
                const granted = aromaticRaise(world, actor, "spd", gift);
                MobEffects.apply(world, actor, aromaticEffect, veil, granted);
                WorldFeedback.emit(world, aromaticScene, 1, body.position(),
                    { moment: "veiled", target: String(actor.ref()), gift: granted, motes: motes,
                        intensity: Math.max(0.7, Math.min(2, granted / 2 + 0.4)) }, 24);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), aromaticVeiledText, [granted], 28);
            } else {
                // 已在香里：只续时间，不动已记下的等级，避免结算错乱。
                MobEffects.apply(world, actor, aromaticEffect, veil, view.amplifier());
            }
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
            const motes = Math.max(8, Math.round(Number(field.data.motes) || 20));
            WorldFeedback.keep(world, "aromatic:cloud:" + String(effect.id()), aromaticScene, 1, centre,
                { moment: "cloud", radius: field.radius, motes: motes, scale: field.radius / aromaticReferenceRadius }, 12);
        }
    });

    define({
        id: "aromaticmist",
        name: "芳香薄雾",
        description: "在选定点铺下一片会停留的香云，裹住雾里的友方并提高他们的特防；离雾后香还挂在身上一小会儿，绕开那片云即可躲过。",
        uses: ["在队友据守的门口铺一片香云", "替缠斗中的伙伴补上特防", "把治疗位或后排护在香里"],
        kind: "point",
        range: 5,
        maxRange: 8,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 100,
        style: "aroma",
        defaults: { bouquet: 1, ai: { maxChase: 10 } },
        fields: [
            field(pathOf("bouquet"), "香势", "choice", {
                options: [
                    { value: 1, label: "浓香" },
                    { value: 0, label: "弥香" }
                ],
                help: "浓香：留香 ×1.3，但半径 ×0.8——罩得紧、香得久；弥香：半径 ×1.25，但留香 ×0.75——铺得开、留得短。"
            })
        ],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["aromaticmist"], detail: { values: config } };
            return { radius: p("aromaticmist", "cloudRadius", context), geometry: "area", style: "aroma", color: 0xF6C7E0,
                label: config && Number(config.bouquet) === 1 ? "芳香薄雾 · 浓香" : "芳香薄雾 · 弥香" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["aromaticmist"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("aromaticmist", "tempo", context)),
                recover: Math.round(p("aromaticmist", "aftercast", context)),
                cooldown: Math.round(p("aromaticmist", "wait", context)),
                active: 1,
                range: p("aromaticmist", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_aromaticmist:gather", aromaticScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", bouquet: config && Number(config.bouquet) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor();
            const centre = action.targetPosition(), origin = action.origin();
            const gift = Math.max(1, Math.min(2, Math.round(p("aromaticmist", "gift", action))));
            const radius = Math.max(1.5, p("aromaticmist", "cloudRadius", action));
            const cloudTicks = Math.max(100, Math.round(p("aromaticmist", "cloudTicks", action)));
            const veilTicks = Math.max(60, Math.round(p("aromaticmist", "veilTicks", action)));
            const motes = Math.max(8, Math.round(p("aromaticmist", "motes", action)));
            const delta = centre.minus(origin), distance = delta.length();
            const direction = distance < 0.01 ? action.direction() : delta.unit();
            WorldEffects.field(world, aromaticField, centre, radius,
                { gift: gift, veilTicks: veilTicks, motes: motes }, cloudTicks);
            const scale = radius / aromaticReferenceRadius;
            WorldFeedback.emit(world, aromaticScene, 1, origin,
                { moment: "release", direction: [direction.x(), direction.y(), direction.z()], distance: distance,
                    motes: motes, scale: scale }, 26);
            WorldFeedback.emit(world, aromaticScene, 1, centre,
                { moment: "settle", radius: radius, motes: motes, scale: scale, intensity: Math.max(0.8, Math.min(2, gift / 2 + 0.5)) }, 30);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 0.8, 0)), aromaticSettleText,
                [gift, Math.round(cloudTicks / 20)], 28);
            world.sound("cobblemon:move.spore.actor", centre, 16, "{}");
            world.sound("minecraft:block.honey_block.place", centre, 14, "{}");
            done(action);
        }
    });

    // 留香期：每 20 刻在被裹住的友方身边续一次香点，低密度、慢节奏。
    WorldCombat.on("world_combat:move_aromaticmist/veiled", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== aromaticEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "aromatic:veiled:" + String(actor.ref()), aromaticScene, 1, body.position(),
            { moment: "veiled", target: String(actor.ref()), motes: 12, gift: 1 }, 40);
    });

    // 香散：按实际抬到的级数把特防原样收回。
    WorldCombat.on("world_combat:move_aromaticmist/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== aromaticEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const loss = Math.min(Math.max(0, Math.round(Number(data.amplifier) || 0)), Math.max(0, aromaticStage(world, actor, "spd")));
        if (loss > 0) NativeEffects.boost(world, actor, "spd", -loss);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, aromaticScene, 1, body.position(),
            { moment: "fade", target: String(actor.ref()), lost: loss }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), aromaticFadeText, [], 22);
    });
}
