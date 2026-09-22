/**
 * 宇宙力量 / cosmicpower — 执行组织。
 *
 * 核心念头：站定，一道星光柱从头顶垂直落进身体——防御与特防一起抬起来。它是本组里唯一从天上取力的一招：
 *   起手最长、最容易被中途打断，换来的是夜里星光更盛（夜里多抬 1 级）。
 *
 * 两幕：
 *   引（windup 播「落星」，提交前只观察与预告，打断不花代价）。
 *   承（提交后）：NativeEffects.boost 写入公共能力阶梯（防御 aegis 级、特防 ward 级），挂上共享身份
 *     world_combat:status/cosmicpower 的星辉窗口；同时另存一份「这次加了多少」的记号，供窗口结束时按数收回。
 * 结束：星辉到期或被清除时，按记号把两项等级原样收回。
 */
namespace PokemonSkills {
    const cosmicPowerScene = "world_combat:move_cosmicpower";
    const cosmicPowerSurge = "world_combat:cosmic_surge";
    const cosmicPowerMark = "world_combat:cosmicpower_mark";
    const cosmicPowerSettleText = "world_combat.move.cosmicpower.text.settle";
    const cosmicPowerWaneText = "world_combat.move.cosmicpower.text.wane";
    /** 表现里的参考半径：`data.scale = 实际星环半径 / 这个数`。 */
    const cosmicPowerReferenceRadius = 1.5;

    // 记号：记录这次汲取各自加了多少级，窗口结束时照数收回。加在两个属性上，单靠 amplifier 存不下。
    WorldCombat.effect(cosmicPowerMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.aegis !== "number" || typeof value.ward !== "number") throw new Error("Invalid cosmic power mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(cosmicPowerMark, "start", function () { });

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function cosmicPowerStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function cosmicPowerRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = cosmicPowerStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, cosmicPowerStage(world, actor, stat) - before);
    }

    define({
        id: "cosmicpower",
        name: "宇宙力量",
        description: "汲取宇宙中神秘的力量，从而提高自己的防御和特防。",
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
            const aegisLevels = cosmicPowerRaise(world, actor, "def", aegis);
            const wardLevels = cosmicPowerRaise(world, actor, "spd", ward);
            MobEffects.apply(world, actor, cosmicPowerSurge, dwell, Math.max(aegisLevels, wardLevels));
            world.effect(cosmicPowerMark, actor, JSON.stringify({ aegis: aegisLevels, ward: wardLevels }), dwell);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, cosmicPowerScene, 1, feet,
                { moment: "pour", actor: String(actor.ref()), aegis: aegisLevels, ward: wardLevels, halo: halo,
                    constellation: constellation, shaft: shaft, shaftHalf: shaft / 2, ring: ring, columnRadius: ring * 0.5, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, (aegisLevels + wardLevels) / 2 + halo / 80)) }, 48);
            WorldFeedback.keep(world, "cosmicpower:column:" + String(actor.ref()), cosmicPowerScene, 1, feet,
                { moment: "column", actor: String(actor.ref()), halo: halo, shaft: shaft, shaftHalf: shaft / 2,
                    constellation: constellation, ring: ring, columnRadius: ring * 0.5, scale: scale }, Math.min(dwell, 240));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.35, 0)), cosmicPowerSettleText,
                [aegisLevels, wardLevels, Math.round(dwell / 20)], 34);
            world.sound("minecraft:block.beacon.activate", body.position(), 16, "{}");
            done(action);
        }
    });

    // 星辉到期或被清除：按记号把两项等级原样收回（只收到当前实际持有的正等级）。
    WorldCombat.on("world_combat:move_cosmicpower/wane", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== cosmicPowerSurge) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const marks = world.effects(actor, cosmicPowerMark);
        let aegis = 1, ward = 1;
        if (marks.length) {
            const mark = JSON.parse(String(marks[0].data()));
            if (typeof mark.aegis === "number") aegis = Math.max(0, Math.round(mark.aegis));
            if (typeof mark.ward === "number") ward = Math.max(0, Math.round(mark.ward));
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        const lostAegis = Math.min(aegis, Math.max(0, cosmicPowerStage(world, actor, "def")));
        const lostWard = Math.min(ward, Math.max(0, cosmicPowerStage(world, actor, "spd")));
        if (lostAegis > 0) NativeEffects.boost(world, actor, "def", -lostAegis);
        if (lostWard > 0) NativeEffects.boost(world, actor, "spd", -lostWard);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, cosmicPowerScene, 1, body.position(), { moment: "wane", actor: String(actor.ref()) }, 28);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), cosmicPowerWaneText, [], 24);
    });
}
