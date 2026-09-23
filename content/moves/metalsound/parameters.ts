/**
 * 金属音 / metalsound 的参数与数值来源。
 *
 * 原生：Steel／Status／威力 —／命中 85／PP 40／目标 normal（单体）／boosts={spd:-2}／
 *       flags 含 sound、bypasssub、allyanim（声音类，隔着掩体也听得见）。
 *
 * 世界化：把「摩擦金属的讨厌声音」落成一次**慢慢地刮**——施法者用身上的金属相互摩擦，刺耳的高频声贴着墙
 *   送到对手耳里，在它体内拉出一条长长的回响，特防被一层层刮掉。它不飞、不铺地，也不需要看见对方，
 *   但要把音磨出来就得站在原地花时间：本组起手最长、回响最久的一招，作用于特防。
 *   与同族分开：刺耳声是一条能扫多人的走廊、假哭要贴脸通视、怪异电波是绕身一圈；金属音只对一个人，
 *   但穿墙、磨得最久。
 *
 * 数值来源（每个参数读不同的精灵数据）：
 *   reach   回响距离：基础 4 格 + 碰撞箱高度×1.2 + 等级×0.02；夹 4..9。身板越高、越老练，声磨得越远。
 *   drop    特防下降：基础 2 级，体重 ≥ 100 加 1 级（金属共鸣更沉），长磨再加 1 级；夹 2..3。
 *   ring    回响时长：基础 140 刻 + 等级×3，长磨 ×1.45；夹 120..420。本组最长。
 *   cycles  刮擦圈数：基础 10 + 体重/12；夹 10..40。越重，一次刮出的声纹圈越多（也是画面里的数量）。
 *   tempo   起手：基础 15 刻 − (速度 − 60) × 0.03，长磨 +5；夹 10..22。要把音磨出来就得先站定。
 *   wait    冷却：基础 150 刻 − 等级×0.6，长磨 +20；夹 120..190。等级越高越熟练。
 *
 * 配置 `long`（长磨）：开启＝回响约 ×1.45、特防多降一级，但起手 +5 刻、冷却 +20 刻；
 *   关闭（短刮）＝出手更快、冷却更短，回响与降幅保持基础。磨得越久、压得越深，但站定挨打的风险越大。
 */
namespace PokemonSkills {
    export const metalsoundId = "metalsound";
    export const metalsoundEffect = "world_combat:metal_sound_grating";
    export const metalsoundScene = "world_combat:move_metalsound";
    export const metalsoundSpot = "world_combat:status/grating";

    actionParameters.define(metalsoundId, {
        reach: formula(
            F.base(4).plus(F.body("height").times(1.2)).plus(F.level().times(0.02)).clamp(4, 9).round(1),
            "回响距离", {
                unit: " 格",
                description: "刮擦声能送到对方耳里的距离；碰撞箱越高、等级越高传得越远。不需要通视，掩体挡不住它。"
            }),
        drop: formula(
            F.base(2).plus(F.when(F.body("weight").gte(100), F.const(1), F.const(0)))
                .plus(F.when(F.pref("long", text("worldcombat.skill.metalsound.preference.long")), F.const(1), F.const(0)))
                .clamp(2, 3).round(0),
            "特防下降", {
                unit: " 级",
                description: "被刮擦声磨掉的特防等级；施法者体重达到 100 时 +1，长磨再 +1。"
            }),
        ring: seconds(
            F.base(140).plus(F.level().times(3))
                .times(F.when(F.pref("long", text("worldcombat.skill.metalsound.preference.long")), F.const(1.45), F.const(1)))
                .clamp(120, 420).round(0),
            "回响时长", "刮擦声在对方体内回荡多久；等级越高越久，长磨最长，是本组里掉得最久的一招。"),
        cycles: formula(
            F.base(10).plus(F.body("weight").div(12)).clamp(10, 40).round(0),
            "刮擦圈数", {
                unit: " 圈",
                description: "一次刮出的声纹圈数；体重越大越密，画面里的回响也按它画出。"
            }),
        tempo: seconds(
            F.base(15).minus(F.stat("speed").minus(60).max(0).times(0.03))
                .plus(F.when(F.pref("long", text("worldcombat.skill.metalsound.preference.long")), F.const(5), F.const(0)))
                .clamp(10, 22).round(0),
            "起手", "站定把音磨出来需要多久；速度越快稍早收声，长磨要多花 5 刻。"),
        wait: seconds(
            F.base(150).minus(F.level().times(0.6))
                .plus(F.when(F.pref("long", text("worldcombat.skill.metalsound.preference.long")), F.const(20), F.const(0)))
                .clamp(120, 190).round(0),
            "冷却", "两次金属音之间的等待；等级越高越熟练，长磨更久。PP 40 的代价。")
    });

    describe(metalsoundId, [
        { key: "description.0", values: ["drop", "ring"] },
        { key: "description.1", values: ["reach"] },
        { key: "description.2", values: ["tempo", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
