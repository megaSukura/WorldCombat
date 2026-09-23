/**
 * 瞪眼 / Leer 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 100／PP 30／目标 allAdjacentFoes（相邻全体）／boosts={def:-1}（降低防御）／
 *       flags 含 protect、reflectable、mirror（需要有形、会被看见）。
 * 世界化：不是隔空扣等级，而是**眯起眼，把一道犀利的目光沿身前扫成一个扇面**——被扫到的人缩紧架势，
 *   防御下降。目光要有形、要被看见：扇面里的人必须和施法者通视，掩体挡下就扫不到。它只是防御上的减法，
 *   不造成伤害。命中后挂共享身份 world_combat:status/guardbroken 的真实 MobEffect，再 NativeEffects.boost
 *   下降防御：宝可梦损失原生防御等级，其他生物落到护甲属性。
 * 「横扫」张角大、只降 1 级、起手快；「瞪住」收窄成一道、降 2 级，但起手更慢、冷却更长。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   drop        横扫 1 级／瞪住 2 级；夹 1..2。扫法与深度之间的取舍。
 *   sweepRange  4 + 身高 × 1.1，瞪住 ×0.85，夹 3..8；身量越高，目光扫得越远。
 *   sweepAngle  90 + (宽度 − 0.9) × 40，横扫 ×1.35／瞪住 ×0.6，夹 45..160；体型越宽扇面越开。
 *   scowlTicks  90 + (物攻 − 40) × 0.8，夹 60..240；越凶的施法者，被瞪住的人缩得越久。
 *   glares      20 + (速度 − 50) × 0.3，夹 14..44；出手越快，一次甩出的目光线越多（也是画面里的数量）。
 *   tempo       6 − (速度 − 60) × 0.03，瞪住 +3，夹 4..13；速度越快越早眯眼。
 *   recharge    95 + (等级 − 30) × 0.5，瞪住 +25，夹 80..170；等级越高越熟练。PP 30。
 */
namespace PokemonSkills {
    export const leerId = "leer";
    export const leerEffect = "world_combat:leer_spook";
    export const leerScene = "world_combat:move_leer";
    export const leerSpot = "world_combat:status/guardbroken";

    actionParameters.define(leerId, {
        drop: formula(
            F.when(F.pref("focus", text("worldcombat.skill.leer.preference.focus")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "防御下降", {
                unit: " 级",
                description: "被目光扫到者损失的防御等级；横扫降 1 级，瞪住降 2 级。"
            }),
        sweepRange: formula(
            F.base(4).plus(F.body("height").times(1.1))
                .times(F.when(F.pref("focus", text("worldcombat.skill.leer.preference.focus")), F.const(0.85), F.const(1)))
                .clamp(3, 8).round(2),
            "目光长度", {
                unit: " 格",
                description: "目光扇面能扫到多远；施法者身形越高越远，瞪住收得更近。画面里的扇面铺到哪，就是会被扫到哪。"
            }),
        sweepAngle: formula(
            F.base(90).plus(F.body("width").minus(0.9).times(40))
                .times(F.when(F.pref("focus", text("worldcombat.skill.leer.preference.focus")), F.const(0.6), F.const(1.35)))
                .clamp(45, 160).round(0),
            "扇面角度", {
                unit: " 度",
                description: "目光扇面的张角；体型越宽张得越开，横扫 ×1.35、瞪住收到 ×0.6。"
            }),
        scowlTicks: seconds(
            F.base(90).plus(F.stat("attack").minus(40).max(0).times(0.8)).clamp(60, 240).round(0),
            "胆怯时长", "被瞪住的人架势散多久；施法者物攻越高，那份凶相留得越久。"),
        glares: formula(
            F.base(20).plus(F.stat("speed").minus(50).max(0).times(0.3)).clamp(14, 44).round(0),
            "目光量", {
                unit: " 道",
                description: "一次瞪眼甩出的目光线数量；施法者速度越快甩得越多，画面里的目光也按它画出。"
            }),
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).max(0).times(0.03))
                .plus(F.when(F.pref("focus", text("worldcombat.skill.leer.preference.focus")), F.const(3), F.const(0)))
                .clamp(4, 13).round(0),
            "起手", "眯起眼、把目光聚成扇面需要多久；速度越快越早，瞪住要多花几刻。"),
        recharge: seconds(
            F.base(95).plus(F.level().minus(30).max(0).times(0.5))
                .plus(F.when(F.pref("focus", text("worldcombat.skill.leer.preference.focus")), F.const(25), F.const(0)))
                .clamp(80, 170).round(0),
            "冷却", "两次瞪眼之间的等待；等级越高越熟练，瞪住更费力。PP 30。")
    });

    describe(leerId, [
        { key: "description.0", values: ["drop","scowlTicks"] },
        { key: "description.1", values: ["sweepRange","sweepAngle"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "focus.off", values: [], when: function (context) { return read(context.detail.values, ["focus"]) !== true; } },
        { key: "focus.on", values: [], when: function (context) { return read(context.detail.values, ["focus"]) === true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
