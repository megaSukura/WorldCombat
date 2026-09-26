/**
 * 岩斧 / stoneaxe —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8，仅劈斧螳螂 1 位学习者）：Rock／物理／威力 65／命中 90／PP 15／接触／切斩（slicing）／
 *   命中后在对手周围留下隐形岩。原生描述：「用岩石之斧瞄准要害进行攻击。散落的岩石碎片会飘浮在对手周围。」
 *
 * 核心念头：一记过顶的岩石斧劈下，斧头崩裂，岩石碎片**悬浮在落点四周**——谁走进这片空域就被砸，
 *   飞在半空的也躲不掉。它是这一组里唯一「浮在对手周围、砸到空中」的一击。
 *
 * 世界化：把「散落的岩石碎片飘浮在对手周围」翻成**一片数量有限的悬浮岩石**（`WorldEffects.field`，规则
 *   `world_combat:hazard/floatingrocks` 由本单元注册）：每个**新进入**空域的非友方消耗一块，从它正上方落一块真实岩/
 *   短下坠判定；竖直段被方块挡住就只砸在屋顶（不消耗、不伤人），通达才结算 `rock`。余量 `rocks` 归零整片散尽，
 *   留在里面不会反复挨砸。斧劈命中或没被墙挡住的落点铺下这片石阵；未命中且被墙挡住时只留一下崩碎。
 *
 * 与已有隐形岩分开：隐形岩是远程抬手布置的纯场地、按属性相性吃最大生命；岩斧是**近身斧劈带出有限悬岩**，
 *   伤害走物理攻防，来一个砸一块、砸完即止，且 `shatter` 档让它第一次被闯进就把余量一次全落、只结算一记重的。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   cleave       斧劈威力：物攻定斧刃、等级定熟练；崩解 ×0.92 / 悬岩 ×1.05；夹 46..140。
 *   rock         每块悬岩砸伤威力：物攻；崩解 ×1.8（崩解只落一次，总伤不随石数叠加）/ 悬岩 ×0.85；夹 12..48。
 *   rockInterval 同一目标反复进出空域的再次触发间隔：速度；崩解 ×1.5；夹 16..40。
 *   fieldRadius  悬浮范围半径：体宽；崩解 ×0.9 / 悬岩 ×1.15；夹 1.6..4.2（也是指示圈与判定半径）。
 *   fieldTicks   碎片悬停时长：等级＋HP；崩解 ×0.7 / 悬岩 ×1.25；夹 120..460。
 *   lift         悬浮高度：身高；决定碎片浮到多高、画面里石阵的位置。
 *   critChance   暴击几率（「瞄准要害」）：速度＋等级；夹 0.15..0.50。
 *   reach        斧击距离：速度与等级；夹 2.6..4.6，也是实际射程。
 *   rocks        悬岩石块总数：物攻；每来一个新敌人落一块，归零即散，同时是画面里石块与碎屑的数量。
 *   tempo／aftercast／recharge  速度定节奏；崩解更快落斧但石阵更短，悬岩更稳更久。
 *
 * 配置 `shatter`（崩解）双向取舍：开＝第一次被闯进就把余量一次全落、只结算一记（单次砸伤 ×1.8），但悬浮时长 ×0.7、范围 ×0.9、
 *   斧劈 ×0.92——一口气砸重的；关＝悬岩式，来一个敌人落一块、范围更大、斧劈 ×1.05，但每次砸伤 ×0.85。
 *
 * 伤害段：`cleave`（斧劈本体，暴击由本招 `critChance` 掷取）与 `rock`（悬岩砸伤）各自同名参数。
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const stoneaxeId = "stoneaxe";
    export const stoneaxeRule = "world_combat:hazard/floatingrocks";
    export const stoneaxeScene = "world_combat:move_stoneaxe";
    export const stoneaxeReference = 2.4;
    export const stoneaxeLayText = "world_combat.move.stoneaxe.text.lay";
    export const stoneaxeHitText = "world_combat.move.stoneaxe.text.hit";
    export const stoneaxeShatterText = "world_combat.move.stoneaxe.text.shatter";
    export const stoneaxeCritText = "world_combat.move.stoneaxe.text.crit";
    export const stoneaxeMissText = "world_combat.move.stoneaxe.text.miss";

    actionParameters.define(stoneaxeId, {
        /** 斧劈威力：65 + (物攻−60)×0.32（夹 −14..30）+ (等级−25)×0.2（夹 0..8）；崩解 ×0.92 / 悬岩 ×1.05；夹 46..140。 */
        cleave: formula(
            F.base(65)
                .plus(F.stat("attack").minus(60).times(0.32).clamp(-14, 30))
                .plus(F.level().minus(25).times(0.2).clamp(0, 8))
                .times(F.when(F.pref("shatter"), F.const(0.92), F.const(1.05)))
                .clamp(46, 140).round(1),
            "斧劈威力", {
                base: 65,
                unit: "威力",
                description: "过顶斧劈落下那一下的接触威力；物攻给出斧刃、等级给定熟练。对手防御、相性与本招自己的暴击在命中时另算。"
            }),
        /** 砸伤威力：20 + (物攻−60)×0.14（夹 −5..18）；崩解 ×1.8 / 悬岩 ×0.85；夹 12..48。 */
        rock: formula(
            F.base(20).plus(F.stat("attack").minus(60).times(0.14).clamp(-5, 18))
                .times(F.when(F.pref("shatter"), F.const(1.8), F.const(0.85)))
                .clamp(12, 48).round(1),
            "砸伤威力", {
                base: 20,
                unit: "威力",
                description: "一块悬岩落下来砸中一个刚进入空域敌人的威力，走岩属性物理攻防；物攻越高越重。每来一个新敌人落一块，砸完即止。崩解式把全部余量一次压进那一记砸击，不会按石数叠加。"
            }),
        /** 再触发间隔：26 − (速度−60)×0.04（夹 −4..7）；崩解 ×1.5；夹 16..40 秒。 */
        rockInterval: seconds(
            F.base(26).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 7))
                .times(F.when(F.pref("shatter"), F.const(1.5), F.const(1)))
                .clamp(16, 40).round(0),
            "再触发间隔", "同一个敌人短时间内反复进出空域时，两次落岩之间至少隔多久；速度快的个体盯得更紧。留在里面不会再被砸，要重新进入才再落一块。"),
        /** 悬浮半径：2.4 + (体宽−0.9)×0.9（夹 −0.2..1.0）；崩解 ×0.9 / 悬岩 ×1.15；夹 1.6..4.2。 */
        fieldRadius: formula(
            F.base(2.4).plus(F.body("width").minus(0.9).times(0.9).clamp(-0.2, 1.0))
                .times(F.when(F.pref("shatter"), F.const(0.9), F.const(1.15)))
                .clamp(1.6, 4.2).round(2),
            "悬浮半径", {
                unit: "格",
                description: "岩石碎片悬浮覆盖的半径；体型越宽罩得越开，悬岩式更广。它也是指示圈与实际判定半径。"
            }),
        /** 悬停时长：240 + (等级−25)×2.2（夹 0..70）+ (HP−60)×0.25（夹 −16..36）；崩解 ×0.7 / 悬岩 ×1.25；夹 120..460。 */
        fieldTicks: seconds(
            F.base(240)
                .plus(F.level().minus(25).times(2.2).clamp(0, 70))
                .plus(F.stat("hp").minus(60).times(0.25).clamp(-16, 36))
                .times(F.when(F.pref("shatter"), F.const(0.7), F.const(1.25)))
                .clamp(120, 460).round(0),
            "悬停时长", "一片悬浮岩石在世界上留多久；等级与 HP 越高留得越久，悬岩式更耐放、崩解式更短。"),
        /** 悬浮高度：1.4 + (身高−1.4)×0.5（夹 −0.1..0.9）；夹 1.0..2.4。 */
        lift: formula(
            F.base(1.4).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.1, 0.9)).clamp(1.0, 2.4).round(2),
            "悬浮高度", {
                unit: "格",
                description: "岩石碎片浮到多高；个子高的个体抬得更高。它是画面里石阵的中心高度，也让飞在空中的目标同样落进这片空域。"
            }),
        /** 暴击几率：0.28 + (速度−60)×0.0012（夹 0..0.12）+ (等级−25)×0.001（夹 0..0.05）；夹 0.15..0.50。 */
        critChance: percent(
            F.base(0.28)
                .plus(F.stat("speed").minus(60).times(0.0012).clamp(0, 0.12))
                .plus(F.level().minus(25).times(0.001).clamp(0, 0.05))
                .clamp(0.15, 0.50).round(3),
            "暴击几率", "「瞄准要害」：这一斧打出暴击的几率，高于普通招；速度与等级越高越准。"),
        /** 斧击距离：3.2 + (速度−60)×0.01（夹 −0.4..0.7）+ (等级−25)×0.02（夹 0..0.5）；夹 2.6..4.6 格。 */
        reach: formula(
            F.base(3.2)
                .plus(F.stat("speed").minus(60).times(0.01).clamp(-0.4, 0.7))
                .plus(F.level().minus(25).times(0.02).clamp(0, 0.5))
                .clamp(2.6, 4.6).round(2),
            "斧击距离", {
                unit: "格",
                description: "从站位到斧头够到的最远距离；腿快、等级高的个体够得更前。它也是本招的实际射程。"
            }),
        /** 悬岩石数：20 + 物攻×0.16；夹 14..44 块。 */
        rocks: formula(
            F.base(20).plus(F.stat("attack").times(0.16)).clamp(14, 44).round(0),
            "悬岩石数", {
                unit: "块",
                description: "斧头崩裂后悬在空域里的岩石总数；每来一个新进入的敌人落一块、落一块少一块，归零整片散尽。物攻越高备得越多，它也是画面里石块与碎屑的数量。"
            }),
        /** 起手：9 − (速度−60)×0.03（夹 −1.5..2）+ 崩解 −1；夹 4..13 刻。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2))
                .plus(F.when(F.pref("shatter"), F.const(-1), F.const(0)))
                .clamp(4, 13).round(0),
            "起手", "把岩斧举过头顶蓄势的时间；速度越快越短，崩解式落斧更急。"),
        /** 收招：8 − (速度−60)×0.02（夹 −1.5..2）；夹 4..12 刻。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2)).clamp(4, 12).round(0),
            "收招", "收斧、抖落斧头残屑的时间；速度越快越利落。"),
        /** 冷却：30 − (速度−60)×0.05（夹 −4..6）；崩解 ×0.9 / 悬岩 ×1.05；夹 14..44 刻。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.05).clamp(-4, 6))
                .times(F.when(F.pref("shatter"), F.const(0.9), F.const(1.05)))
                .clamp(14, 44).round(0),
            "冷却", "两次斧劈之间的等待；崩解式落得快一些，悬岩式稍慢。")
    });

    defineCategory(stoneaxeId, "physical");
    defineDamage(stoneaxeId, "cleave", { defenceCoefficient: 0.005 }, { contact: true, slice: true });
    defineDamage(stoneaxeId, "rock", {});

    stages(stoneaxeId, [
        { level: 40, values: { cleave: 74, rock: 26 } },
        { level: 54, values: { cleave: 84, lift: 1.7 } }
    ]);

    describe(stoneaxeId, [
        { key: "description.0", values: ["cleave","reach","critChance"] },
        { key: "description.1", values: ["rock","fieldRadius","fieldTicks","rockInterval"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "shatter.on", values: [], when: function (context) { return read(context.detail.values, ["shatter"]) === true; } },
        { key: "shatter.off", values: [], when: function (context) { return read(context.detail.values, ["shatter"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cleave", "tier.0.rock"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cleave"] }
    ]);
}
