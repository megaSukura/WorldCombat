/**
 * 棱角化 / sharpen —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 —、命中必中、PP 30、优先度 0、目标 self、
 *   boosts { atk: +1 }；isNonstandard Past。
 *
 * 核心念头：把身体的边边角角顶出来。皮肤下先鼓起一片片锋，随后一齐弹出、边缘反着冷光；出手更利，
 *   近身撞上来的人会被这些棱角划伤。它是自我强化族里唯一**把身体本身变成武器**的一招。
 * 翻译：取原生「物攻 +1、Normal、目标自己、PP 30」，再加一层原生描述本身就说出的后果——身体成了棱角，
 *   于是近身接触攻击者被反击。放弃回合制里永久保留的等级，改成一段可见的「棱角」窗口：窗口走完棱角钝去，
 *   这份物攻一并收回，给对手一次拖过窗口的反制。
 *
 * 与同族分开：瑜伽姿势是慢、静、内在的唤醒，不被打扰更深、且留住；棱角化是快、外长棱角、带接触反击的窗口，到点收回。
 *
 * 数值来源（每个参数读不同的精灵数据或现场事实，分散到不同参数上）：
 *   gift       棱角物攻：固定 1 级（原生 +1，本招的身份常数）。
 *   edge       棱锋威力：基础 18 + 物攻×0.18 + 体重×0.02；速成 ×0.9；夹 14..48。物攻越高、身体越重，反击越重。
 *   spikes     棱角数：基础 12 + 物攻/5 + 体重/40；速成 ×0.85；夹 10..40。物攻越高，画面里弹出的棱角越多。
 *   spread     棱角半径：基础 0.8 格 + 碰撞箱高度×0.35；夹 0.7..1.6。身板越高，棱角罩得越开。
 *   sharpTicks 棱角窗口：基础 200 刻 + 等级×3.5 + 物攻×0.5；速成 ×0.75；夹 160..560。窗口走完物攻收回。
 *   tempo      起手：基础 6 刻 − 速度×0.015；速成 −2；夹 4..9。这是本族最快的起手之一。
 *   aftercast  收招：基础 5 刻 + 碰撞箱高度×0.8；夹 5..9。
 *   wait       冷却：基础 80 刻 − 等级×0.5；速成 −15；夹 50..100。PP 30 的代价。
 * 配置 quick（速成棱角）双向取舍：开＝起手快 2 刻、冷却短 15、可以频繁刷新，但窗口 ×0.75、棱锋 ×0.9、棱角更少；
 *   关＝慢一点、贵一点，换来更长的窗口与更重的反击。两向各有局面：缠斗里求短平快，阵地对峙求一记扎手的长刺。
 *
 * 伤害段 `edge` 与参数同名，走向共享换算（本段声明为物理），命中时按对手防御、相性与暴击结算。
 */
namespace PokemonSkills {
    actionParameters.define("sharpen", {
        /** 棱角物攻：原生 +1。 */
        gift: formula(F.const(1), "棱角物攻", {
            unit: " 级",
            description: "棱角化把物攻抬高多少级；原生 +1，是本招的身份常数。"
        }),
        /** 棱锋威力：物攻与体重决定反击有多重。 */
        edge: formula(
            F.base(18).plus(F.stat("attack").times(0.18)).plus(F.body("weight").times(0.02))
                .times(F.when(F.pref("quick", text("worldcombat.skill.sharpen.preference.quick")), F.const(0.9), F.const(1)))
                .clamp(14, 48).round(0),
            "棱锋威力", {
                unit: "威力",
                description: "被棱角划中的近身攻击者承受的本段威力；物攻越高、身体越重越重，速成 ×0.9。对手防御、相性与暴击在命中时另算。"
            }),
        /** 棱角数：物攻与体重决定一次弹出多少。 */
        spikes: formula(
            F.base(12).plus(F.stat("attack").div(5)).plus(F.body("weight").div(40))
                .times(F.when(F.pref("quick", text("worldcombat.skill.sharpen.preference.quick")), F.const(0.85), F.const(1)))
                .clamp(10, 40).round(0),
            "棱角数", {
                unit: " 片",
                description: "身体一次顶出的棱角数量；物攻越高、身体越重越多，粒子按它发射。"
            }),
        /** 棱角半径：身板越高罩得越开。 */
        spread: formula(
            F.base(0.8).plus(F.body("height").times(0.35)).clamp(0.7, 1.6).round(2),
            "棱角半径", {
                unit: " 格",
                description: "棱角罩住身体的半径；碰撞箱越高大罩得越开。"
            }),
        /** 棱角窗口：物攻长在身上多久。 */
        sharpTicks: seconds(
            F.base(200).plus(F.level().times(3.5)).plus(F.stat("attack").times(0.5))
                .times(F.when(F.pref("quick", text("worldcombat.skill.sharpen.preference.quick")), F.const(0.75), F.const(1)))
                .clamp(160, 560).round(0),
            "棱角窗口", "棱角在身上的时长；等级与物攻越高撑得越久，速成更短。窗口走完，这份物攻一并收回。"),
        /** 起手：本族最快之一。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").times(0.015))
                .minus(F.when(F.pref("quick", text("worldcombat.skill.sharpen.preference.quick")), F.const(2), F.const(0)))
                .clamp(4, 9).round(0),
            "起手", "把棱角顶出来需要多久；速度越快越短，速成再快 2 刻。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(0.8)).clamp(5, 9).round(0),
            "收招", "弹出棱角后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(80).minus(F.level().times(0.5))
                .minus(F.when(F.pref("quick", text("worldcombat.skill.sharpen.preference.quick")), F.const(15), F.const(0)))
                .clamp(50, 100).round(0),
            "冷却", "两次棱角化之间的等待；等级越高越短，速成再短 15。PP 30 的代价。")
    });

    stages("sharpen", [
        { level: 30, values: { sharpTicks: 300, wait: 68 } },
        { level: 50, values: { sharpTicks: 380, wait: 56 } }
    ]);

    // 本段是物理反击：状态招本身没有原生类别，显式声明为物理，让共享换算用物攻/物防结算。
    defineCategory("sharpen", "physical");
    defineDamage("sharpen", "edge", { defenceCoefficient: 0.005,
        rationale: "近身撞上棱角的一记反击，按物理默认系数结算。" }, {});

    describe("sharpen", [
        { key: "description.0", values: ["gift", "edge"] },
        { key: "description.1", values: ["sharpTicks"] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "quick.on", values: [], when: function (context) { return read(context.detail.values, ["quick"]) === true; } },
        { key: "quick.off", values: [], when: function (context) { return read(context.detail.values, ["quick"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sharpTicks", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sharpTicks", "tier.1.wait"] }
    ]);
}
