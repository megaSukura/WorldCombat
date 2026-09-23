/**
 * 羽毛舞 / Feather Dance 的参数与数值来源。
 *
 * 原生：Flying／Status／威力 —／命中 100／PP 15／目标 normal（单体）／boosts={atk:-2}（大幅降低攻击）／
 *       flags 含 dance（舞类）。
 * 世界化：撒出的是一团会飘的羽绒，不是瞬间扣等级——羽绒云打到目标身边罩住它，还在落点铺开一小片
 *   久久不散的绒雾：谁走进那片绒雾，谁也会被覆上一层、抡不动胳膊。媒介是「看得见的云」，所以它同时
 *   是单体的攻击削弱与一小块区域封锁。落点与半径就是画面里那片绒雾的范围。
 * 「厚羽」把同一团羽绒压得更实：覆盖更小、一次削得更深；「撒羽」铺得更开、深度回到 2 级。两向各有局面。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   atkDrop      基础 2 级，厚羽再 +1（夹 2..3）；压得越实削得越深。
 *   cloudRadius  2.4 + (宽度 − 0.9) × 1.6 格，厚羽 ×0.72，夹 1.6..4.2；体型越宽铺得越开。
 *   downTicks    140 + (特攻 − 60) × 0.8 刻，夹 120..300；特攻越高，羽毛上的力越耐留。
 *   fieldTicks   160 + (等级 − 20) × 2 刻，夹 120..360；等级越高，地上的绒雾留得越久。
 *   flightSpeed  1.0 + (速度 − 50) × 0.006 格/刻，夹 0.8..1.6；出手越快，羽毛飞得越急。
 *   strandRadius 0.3 + (身高 − 1.4) × 0.1 格，夹 0.22..0.55；身量越高，判定越宽。
 *   reach        6 + (身高 − 1.4) × 0.8 格，夹 5..9；翅膀越长，撒得越远。
 *   feathers     20 + (特攻 − 50) × 0.5 个，夹 14..56；特攻越高，一次撒出的绒羽越多（画面里的数量）。
 *   tempo        速度 ÷ 9 + 4 刻，夹 6..13；速度越快，起舞越早。
 *   recharge     120 + (等级 − 30) × 1.5 刻，夹 110..240；等级越高越熟练。
 */
namespace PokemonSkills {
    export const featherdanceId = "featherdance";
    export const featherdanceEffect = "world_combat:downy_coat";
    export const featherdanceScene = "world_combat:move_featherdance";
    export const featherdanceSpot = "world_combat:status/downy";
    export const featherdanceField = "world_combat:move/featherdance/down";

    actionParameters.define(featherdanceId, {
        atkDrop: formula(
            F.base(2).plus(F.when(F.pref("dense", text("worldcombat.skill.featherdance.preference.dense")), F.const(1), F.const(0))).clamp(2, 3),
            "攻击下降", {
                unit: " 级",
                description: "被羽绒覆身者损失的攻击等级；厚羽取向压得更实，从 2 级升到 3 级。"
            }),
        cloudRadius: formula(
            F.base(2.4).plus(F.body("width").minus(0.9).times(1.6))
                .times(F.when(F.pref("dense", text("worldcombat.skill.featherdance.preference.dense")), F.const(0.72), F.const(1)))
                .clamp(1.6, 4.2).round(2),
            "绒雾半径", {
                unit: " 格",
                description: "落点那片绒雾的半径；体型越宽铺得越开，厚羽取向压得更小。"
            }),
        downTicks: seconds(
            F.base(140).plus(F.stat("specialAttack").minus(60).max(0).times(0.8)).clamp(120, 300),
            "覆羽时长", "羽绒留在身上多久；特攻越高，羽毛上的力越耐留。"),
        fieldTicks: seconds(
            F.base(160).plus(F.level().minus(20).max(0).times(2)).clamp(120, 360),
            "绒雾时长", "落点的绒雾存在多久；等级越高留得越久。"),
        flightSpeed: formula(
            F.base(1.0).plus(F.stat("speed").minus(50).max(0).times(0.006)).clamp(0.8, 1.6),
            "羽绒速度", {
                unit: " 格/刻",
                description: "羽绒云飞出去的速度；施法者速度越快越难被走位躲开。"
            }),
        strandRadius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.22, 0.55),
            "判定半径", {
                unit: " 格",
                description: "羽绒云的横向判定半径；身量越高判定越宽。"
            }),
        reach: formula(
            F.base(6).plus(F.body("height").minus(1.4).times(0.8)).clamp(5, 9),
            "撒羽距离", {
                unit: " 格",
                description: "羽绒云能打到的最远点；翅膀越长撒得越远。"
            }),
        feathers: formula(
            F.base(20).plus(F.stat("specialAttack").minus(50).max(0).times(0.5)).clamp(14, 56).round(0),
            "绒羽量", {
                unit: " 个",
                description: "一次撒出的绒羽数量；特攻越高越多，画面里的羽毛也按它画出。"
            }),
        tempo: seconds(
            F.stat("speed").div(9).plus(4).clamp(6, 13),
            "起手", "起手撒羽需要多久；速度越快越早起舞。"),
        recharge: seconds(
            F.base(120).plus(F.level().minus(30).max(0).times(1.5)).clamp(110, 240),
            "冷却", "两次羽舞之间的等待；等级越高越熟练。")
    });
    describe(featherdanceId, [
        { key: "description.0", values: ["atkDrop", "downTicks"] },
        { key: "description.1", values: ["cloudRadius", "fieldTicks"] },
        { key: "description.2", values: ["flightSpeed", "strandRadius", "reach", "range", "tempo"] },
        { key: "dense.on", values: [], when: function (context) { return read(context.detail.values, ["dense"]) === true; } },
        { key: "dense.off", values: [], when: function (context) { return read(context.detail.values, ["dense"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
