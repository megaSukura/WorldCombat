/**
 * 宇宙力量 / cosmicpower — 执行组织。
 *
 * 核心念头：站定，一道星光柱从头顶垂直落进身体——防御与特防一起抬起来。它是本组里唯一从天上取力的一招：
 *   起手最长、最容易被中途打断，换来的是夜里星光更盛（夜里多抬 1 级）。
 *
 * 两幕：
 *   引（windup 播「落星」，提交前只观察与预告，打断不花代价）。
 *   承（提交后）：星柱落下是一段短暂过程；随后把两项防护写成一条**由本次星辉载体（世界效果 carrier）拥有**的
 *     boostWindow 临时窗口，挂上共享身份 world_combat:status/cosmicpower。窗口的加成只按自己的来源回收：
 *     刷新时先撤本来源旧窗口再重开、被驱散或自然到期随载体一起结束、实际抬升为 0 时不留任何贡献。
 * 持续表现：稀疏星座环绑在真实窗口（onEffect）上，随它自然到期或提前清除一起隐去；夜里实际多出的那一级点亮第二层星座。
 */
namespace PokemonSkills {
    const cosmicPowerScene = "world_combat:move_cosmicpower";
    const cosmicPowerSurge = "world_combat:cosmic_surge";
    /** 本招窗口的贡献来源标记：只回收由它写下的等级，刷新时也只撤自己的旧窗口。 */
    const cosmicPowerContribution = "world_combat:move/cosmicpower";
    const cosmicPowerSettleText = "world_combat.move.cosmicpower.text.settle";
    const cosmicPowerWaneText = "world_combat.move.cosmicpower.text.wane";
    /** 表现里的参考半径：`data.scale = 实际星环半径 / 这个数`。 */
    const cosmicPowerReferenceRadius = 1.5;

    /** 关掉本来源此前留下的窗口，让刷新替换而不是叠加。 */
    function cosmicPowerCloseOwnWindows(world: CombatWorld, actor: CombatActor): void {
        const definition = String(actor.domain()) === "cobblemon" ? "cobblemon_world_combat:modifier" : CombatStages.windowDefinition;
        const views = world.effects(actor, definition);
        for (let i = 0; i < views.length; i++) {
            const data = JSON.parse(String(views[i].data()));
            if (data && data.source === cosmicPowerContribution) NativeEffects.windowClose(world, views[i].id());
        }
    }

    define({
        id: "cosmicpower",
        cooldownParameter: "wait",
        name: "宇宙力量",
        description: "站定，一道星光柱从头顶垂直落进身体：防御与特防一起提高。它是本组起手最长、最容易被中途打断的一招，代价换来的是夜里星光更盛——同样的招在夜里多抬 1 级。窗口走完时两项等级一起收回。",
        uses: ["拉开距离站定，把两项防护一次拉高", "夜里星光更盛，多抬 1 级", "在挨打之前把壳垫厚，再回头交战"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 24,
        active: 1,
        recover: 8,
        cooldown: 150,
        style: "cosmic",
        stationary: true,
        defaults: { ai: { maxChase: 16, minGap: 3, panic: 0.6 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("cosmicpower", "ring", pokemon), geometry: "area", style: "cosmic", color: 0x5B4BC4, label: "宇宙力量" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["cosmicpower"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("cosmicpower", "tempo", context)),
                recover: Math.round(p("cosmicpower", "aftercast", context)),
                cooldown: Math.round(p("cosmicpower", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_cosmicpower:descend", cosmicPowerScene, 1, action.origin(),
                JSON.stringify({ moment: "descend" }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const aegis = Math.max(1, Math.min(2, Math.round(p("cosmicpower", "aegis", action))));
            const ward = Math.max(1, Math.min(2, Math.round(p("cosmicpower", "ward", action))));
            const dwell = Math.max(140, Math.round(p("cosmicpower", "dwell", action)));
            const shaft = Math.max(3, p("cosmicpower", "shaft", action));
            const halo = Math.max(14, Math.round(p("cosmicpower", "halo", action)));
            const constellation = Math.max(5, Math.min(9, Math.round(p("cosmicpower", "constellation", action))));
            const ring = Math.max(0.6, p("cosmicpower", "ring", action));
            const scale = ring / cosmicPowerReferenceRadius;
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            // 刷新替换：先撤本来源旧窗口，再挂新的星辉载体与属于自己的窗口。
            cosmicPowerCloseOwnWindows(world, actor);
            const beforeDef = NativeEffects.effectiveStage(world, actor, "def");
            const beforeSpd = NativeEffects.effectiveStage(world, actor, "spd");
            const previous = MobEffects.read(world, actor, cosmicPowerSurge);
            const carrier = MobEffects.apply(world, actor, cosmicPowerSurge, dwell, previous ? previous.amplifier() : 0);
            const window = carrier === null ? 0
                : NativeEffects.boostWindow(world, actor, { def: aegis, spd: ward }, carrier.duration(), cosmicPowerContribution, carrier);
            const aegisLevels = Math.max(0, NativeEffects.effectiveStage(world, actor, "def") - beforeDef);
            const wardLevels = Math.max(0, NativeEffects.effectiveStage(world, actor, "spd") - beforeSpd);
            // 星星更盛看的是实际多出的那一级，顶到阶梯上限时不会凭空点亮第二层。
            const night = (aegisLevels > 1 || wardLevels > 1) ? 1 : 0;
            WorldFeedback.emit(world, cosmicPowerScene, 1, feet,
                { moment: "pour", actor: String(actor.ref()), aegis: aegisLevels, ward: wardLevels, halo: halo,
                    constellation: constellation, shaft: shaft, shaftHalf: shaft / 2, ring: ring, columnRadius: ring * 0.5,
                    scale: scale, night: night,
                    intensity: Math.max(0.8, Math.min(2, (aegisLevels + wardLevels) / 2 + halo / 80)) }, 48);
            if (window)
                WorldFeedback.onEffect(world, window, "cosmicpower:halo", cosmicPowerScene, 1, feet,
                    { moment: "column", actor: String(actor.ref()), halo: halo, constellation: constellation, ring: ring,
                        scale: scale, night: night, nightRate: night ? 4 : 0, nightRadius: ring * 1.5 });
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.35, 0)), cosmicPowerSettleText,
                [aegisLevels, wardLevels, Math.round(dwell / 20)], 34);
            world.sound("minecraft:block.beacon.activate", body.position(), 16, "{}");
            done(action);
        }
    });

    // 星辉到期或被清除：窗口随载体结束，本事件只报尾声，不再手工扣级。
    WorldCombat.on("world_combat:move_cosmicpower/wane", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== cosmicPowerSurge) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, cosmicPowerSurge) !== null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, cosmicPowerScene, 1, body.position(), { moment: "wane", actor: String(actor.ref()) }, 28);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), cosmicPowerWaneText, [], 24);
    });
}
