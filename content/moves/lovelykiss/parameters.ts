/**
 * 恶魔之吻 / Lovely Kiss —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Normal／变化／威力 0／命中 75／PP 10／单体，命中后目标陷入睡眠（slp）。
 *
 * 世界化：把「用恐怖的脸强吻」翻成一记**贴地猛扑**——施法者先摆出一张恐怖的脸，再沿直线扑到对方脸上，
 *   在接触的一刻强吻下去，把人当场吓睡。它不隔空：必须先把身体送过去，所以走位与突进距离是它的读法；
 *   一旦贴到，命中很高，唯一能溜掉的是**比它更快**的目标（敏捷差进入成功率）。
 *
 * 与同族分开：催眠术隔空但靠运气；哈欠必中但要等。恶魔之吻是唯一**用身体去换**的：先在近距离把自己
 *   暴露出去，扑到就几乎必中，扑不到就白白贴上去挨打。它也是三式入睡里睡眠最长的一个。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数上）：
 *   pounce      扑击距离 3.0 + 速度偏移 + 等级偏移；凌空式 ×1.35 / 重吻式 ×0.85；夹 2.4..6.5。
 *   sleepTicks  睡眠时长 190 + 物攻偏移 + 体重偏移 + 亲密度 ×0.3；重吻式 ×1.25 / 凌空式 ×0.85；夹 100..420。
 *   landChance  扑中概率 0.94 − max(0, 目标速度 − 自身速度) × 0.006；夹 0.50..0.95。
 *   pounceSpeed 扑击速度 0.9 + 速度偏移；凌空式 ×1.25；夹 0.5..1.8 格/刻。
 *   kissRadius  判定半径 0.45 + 身高偏移；夹 0.30..0.80。
 *   hearts      落吻心数 8 + 体重偏移；夹 5..26（也是画面里心的数量）。
 *   tempo／aftercast／recharge 速度与等级决定起手、收招、冷却；重吻式起手 +3、冷却 ×1.15。
 *
 * 配置 `leap`（凌空扑吻）双向取舍：开＝扑击距离 ×1.35、速度 ×1.25、冷却 ×0.9，但睡眠 ×0.85（追上跑者、快进快出）；
 *   关（重吻）＝睡眠 ×1.25、冷却 ×1.15、扑击距离 ×0.85、起手 +3（贴上去把人睡死）。两向各有局面。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const lovelykissId = "lovelykiss";
    export const lovelykissScene = "world_combat:move_lovelykiss";
    export const lovelykissTrance = "world_combat:lovelykiss_trance";

    actionParameters.define(lovelykissId, {
        /** 扑击距离：3.0 + 速度偏移[−0.6,1.4] + 等级(≥25)偏移[0,1]；凌空 ×1.35 / 重吻 ×0.85；夹 2.4..6.5。 */
        pounce: formula(
            F.base(3.0)
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-0.6, 1.4))
                .plus(F.level().minus(25).times(0.03).clamp(0, 1))
                .times(F.when(F.pref("leap"), F.const(1.35), F.const(0.85)))
                .clamp(2.4, 6.5).round(2),
            "扑击距离", {
                unit: " 格",
                description: "猛扑过去能覆盖多远；速度越快扑得越远。它加上判定半径就是本招的射程，也是走位能读出的那段距离。"
            }),
        /** 睡眠时长：190 + 物攻偏移[−30,80] + 体重偏移[−20,60] + 亲密度 ×0.3；重吻 ×1.25 / 凌空 ×0.85；夹 100..420。 */
        sleepTicks: seconds(
            F.base(190)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-30, 80))
                .plus(F.body("weight").minus(60).times(0.12).clamp(-20, 60))
                .plus(F.individual("friendship").times(0.3))
                .times(F.when(F.pref("leap"), F.const(0.85), F.const(1.25)))
                .clamp(100, 420).round(0),
            "睡眠时长", "被吻到后睡多久；物攻越足、分量越重的个体把人吓得越沉。受伤害会立刻惊醒。"),
        /** 扑中概率：0.94 − max(0, 目标速度 − 自身速度) × 0.006；夹 0.50..0.95。 */
        landChance: percent(
            F.base(0.94)
                .minus(F.target("stat.speed").minus(F.stat("speed")).max(0).times(0.006))
                .clamp(0.50, 0.95),
            "扑中概率", "贴到之后抓住对方的概率；只有比施法者更快、更灵活的目标能扭开这一吻。"),
        /** 扑击速度：0.9 + 速度偏移[−0.35,0.9]；凌空 ×1.25；夹 0.5..1.8。 */
        pounceSpeed: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.012).clamp(-0.35, 0.9))
                .times(F.when(F.pref("leap"), F.const(1.25), F.const(1)))
                .clamp(0.5, 1.8).round(2),
            "扑击速度", {
                unit: " 格/刻",
                description: "身体扑出去每刻走多远；速度越快越难被提前拉开，画面里的扑击也更急。"
            }),
        /** 判定半径：0.45 + 身高偏移[−0.12,0.32]；夹 0.30..0.80。 */
        kissRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.30, 0.80).round(2),
            "判定半径", {
                unit: " 格",
                description: "扑到多近算贴上了脸；个高的个体判定更宽。"
            }),
        /** 落吻心数：8 + 体重偏移[−1,9]；夹 5..26；直接驱动画面。 */
        hearts: formula(
            F.base(8).plus(F.body("weight").minus(60).times(0.05).clamp(-1, 9)).clamp(5, 26).round(0),
            "落吻心数", {
                unit: " 个",
                description: "落吻时炸开的心的数量；分量越重画面越满，也按它画出。"
            }),
        /** 起手：11 − 速度偏移[−2,3] + 重吻 3；夹 6..18。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("leap"), F.const(0), F.const(3)))
                .clamp(6, 18).round(0),
            "起手", "摆出恐怖的脸、压低身形需要多久；速度越快越短，重吻式多蓄一拍。"),
        /** 收招：9 − 速度偏移[−2,2]；夹 5..15。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2)).clamp(5, 15).round(0),
            "收招", "落吻后从贴身退开的时间。"),
        /** 冷却：80 − 等级(≥25)偏移[0,14]；凌空 ×0.9 / 重吻 ×1.15；夹 40..130。 */
        recharge: seconds(
            F.base(80).minus(F.level().minus(25).times(0.3).clamp(0, 14))
                .times(F.when(F.pref("leap"), F.const(0.9), F.const(1.15)))
                .clamp(40, 130).round(0),
            "冷却", "两次强吻之间的等待；等级越高回得越快，重吻式缓得更久。")
    });

    stages(lovelykissId, [
        { level: 30, values: { pounce: 3.6, hearts: 12 } },
        { level: 45, values: { pounce: 5.0, sleepTicks: 280, hearts: 18, landChance: 0.86 } }
    ]);

    describe(lovelykissId, [
        { key: "description.0", values: ["pounce", "kissRadius", "landChance"] },
        { key: "description.1", values: ["sleepTicks"] },
        { key: "leap.on", values: [], when: function (context) { return read(context.detail.values, ["leap"]) === true; } },
        { key: "leap.off", values: [], when: function (context) { return read(context.detail.values, ["leap"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.pounce"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.pounce", "tier.1.sleepTicks", "tier.1.landChance"] }
    ]);
}
