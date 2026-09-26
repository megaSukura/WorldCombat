/**
 * 大扫除 / tidyup 的参数与数值来源。
 *
 * 原生事实：Normal／变化／威力 0／命中必中／PP 10／目标 self；扫除全场（双方）的撒菱、毒菱、隐形岩、黏黏网
 *   与替身，然后攻击与速度各 +1（Cobblemon 1.8 / Showdown）。已实装学习者只有 5 个。
 *
 * 翻译：把「将撒菱、隐形岩、黏黏网、毒菱、替身全部扫除掉」翻成即时战斗里一次**真实的清扫**——施术者原地
 *   扫开一圈，把身边这片场地里别人留下的陷阱连根拔起、把近处的替身一并扫走；扫完自己轻快起来，攻击与速度
 *   各抬一档。它是本族里唯一**移走世界里已有东西**的一招，也是唯一抬速度的一招。
 *
 * 清场对象是世界里真实存在的两种东西：
 *   - 入场陷阱：任何由生产者声明为共享类别 `WorldEffects.categories.hazard` 的场地效果；按层数、属性反吃等
 *     各自的规则留着，大扫除只按「在场」把它们整片收走，新陷阱无需改动本招。
 *   - 替身：`world_combat:substitute_ward` 承载的真实身体与 redirect；扫走后由替身自己的生命周期收尾。
 *   清哪些、留哪些由这招的念头决定：只有场地陷阱与替身会被扫，天气、能力等级、别的持续状态不动。
 *
 * 数值来源（每个参数读不同的精灵数据／现场事实，分散到不同参数上）：
 *   rise      物攻增益：原生 1 级，固定，是这招的身份。
 *   haste     速度增益：原生 1 级，固定，是这招的身份。
 *   sweep     清扫半径：基础 3.2 格 ＋ 体宽偏移 ＋ 等级；配置「广扫」×1.35，夹 2.6..6.5。它同时是判定与表现半径。
 *   sweeps    扫动次数（同时是地面环的重复数）：速度派生，夹 2..4。
 *   debris    扬尘数量：物攻与速度派生，夹 12..44；实际扫走的数量另由执行时数出（`data.cleared`）。
 *   kit       轻快窗口：基础 140 刻 ＋ 等级 ×2 ＋ 速度 ×0.4，夹 120..320；广扫 ×0.9（扫得大、留得短）。
 *   tempo     起手：速度每比 60 快 1 减 0.03 刻，夹 5..12；广扫 +3。
 *   aftercast 收招：基础 5 刻 ＋ 碰撞箱高度 ×1.2，夹 5..9。
 *   wait      冷却：基础 85 刻 − 等级 ×0.5，夹 50..120；广扫 +12。PP 10 的代价。
 * 配置 wide（广扫）双向取舍：开启＝清扫半径 ×1.35，能一次扫掉更远的陷阱；代价是起手 +3 刻、冷却 +12、
 *   轻快窗口 ×0.9。关闭＝就地扫，出手快、窗口长、冷却短，但只扫得到贴身的陷阱。两向各有适用局面。
 */
namespace PokemonSkills {
    export const tidyupId = "tidyup";
    export const tidyupScene = "world_combat:move_tidyup";
    export const tidyupKit = "world_combat:tidyup_kit";
    export const tidyupMark = "world_combat:tidyup_mark";
    export const tidyupContribution = "world_combat:move/tidyup";
    export const tidyupText = "world_combat.move.tidyup.text.swept";
    export const tidyupClearText = "world_combat.move.tidyup.text.cleared";
    export const tidyupFadeText = "world_combat.move.tidyup.text.faded";
    // 入场陷阱不再由本单元列名单：生产者用共享类别 `WorldEffects.categories.hazard` 声明，大扫除按类别整片收走。
    /** 替身的承载效果 id；扫走它由替身自己的生命周期收尾（撤 redirect、清身份、去掉身体）。 */
    export const tidyupWard = "world_combat:substitute_ward";
    /** 表现里的参考半径：`data.scale = 实际清扫半径 / 这个数`。 */
    export const tidyupReference = 3.2;

    actionParameters.define(tidyupId, {
        /** 物攻增益：原生 +1，本招的身份常数。 */
        rise: formula(F.const(1), "物攻增益", {
            unit: " 级",
            description: "扫除后把物攻抬高多少级；原生「攻击提高」的对位。"
        }),
        /** 速度增益：原生 +1，本招的身份常数。 */
        haste: formula(F.const(1), "速度增益", {
            unit: " 级",
            description: "扫除后把速度抬高多少级；原生「速度提高」的对位。对宝可梦落到原生速度等级，对其他战斗者落到移动速度属性。"
        }),
        /** 清扫半径：判定与表现共用。 */
        sweep: formula(
            F.base(3.2).plus(F.body("width").minus(0.9).times(1.2)).plus(F.level().minus(25).times(0.03))
                .times(F.when(F.pref("wide", text("worldcombat.skill.tidyup.preference.wide")), F.const(1.35), F.const(1)))
                .clamp(2.6, 6.5).round(2),
            "清扫半径", {
                unit: " 格",
                description: "一次扫除覆盖多远的场地；体宽与等级越高扫得越开，广扫 ×1.35。它也是指示圈与实际清扫、判定半径。"
            }),
        /** 扫动次数：速度派生，驱动地面环的重复。 */
        sweeps: formula(
            F.base(2).plus(F.stat("speed").minus(60).times(0.01)).clamp(2, 4).round(0),
            "扫动次数", {
                unit: " 次",
                description: "一次扫除来回扫几下（也是地面清扫环的重放次数）；腿快的人扫得更多。"
            }),
        /** 扬尘数量：物攻与速度派生，驱动画面密度。 */
        debris: formula(
            F.base(16).plus(F.stat("attack").div(8)).plus(F.stat("speed").div(8)).clamp(12, 44).round(0),
            "扬尘数量", {
                unit: " 点",
                description: "一次扫除扬起的尘屑粒子总数；物攻与速度越高越多。"
            }),
        /** 轻快窗口：攻速留在身上的时长。 */
        kit: seconds(
            F.base(140).plus(F.level().times(2)).plus(F.stat("speed").times(0.4))
                .times(F.when(F.pref("wide", text("worldcombat.skill.tidyup.preference.wide")), F.const(0.9), F.const(1)))
                .clamp(120, 320).round(0),
            "轻快窗口", "「轻快」在身上的时长；等级与速度越高撑得越久，广扫 ×0.9。窗口走完，这次抬起的攻与速一并收回。"),
        /** 起手：速度决定扫多快。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.tidyup.preference.wide")), F.const(3), F.const(0)))
                .clamp(5, 12).round(0),
            "起手", "把手里的扫具拢好、往地上一按需要多久；速度越高越快，广扫 +3 刻。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.2)).clamp(5, 9).round(0),
            "收招", "扫完直起身的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(85).minus(F.level().times(0.5))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.tidyup.preference.wide")), F.const(12), F.const(0)))
                .clamp(50, 120).round(0),
            "冷却", "两次大扫除之间的等待；等级越高越短，广扫更长。PP 10 的代价。")
    });

    stages(tidyupId, [
        { level: 35, values: { kit: 180, wait: 68 } },
        { level: 50, values: { kit: 220, wait: 60 } }
    ]);

    describe(tidyupId, [
        { key: "description.0", values: ["rise","haste","sweep"] },
        { key: "description.1", values: ["kit"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.kit"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.kit"] }
    ]);
}
