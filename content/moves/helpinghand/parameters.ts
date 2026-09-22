/**
 * 帮助 / Helping Hand —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中 必中、PP 20、优先度 +5、目标 adjacentAlly；
 *   被帮助者获得 volatile helpinghand，本回合招式基础威力 ×1.5（重复施加会再乘 1.5）。
 *
 * 世界化：把「借出去的力气」翻成一次短暂的托举——施法者伸手把光送进伙伴身上，伙伴的**下一次命中**因此更重，
 *   用掉即散；没有出手则会随时间自行褪去。原生的 +5 优先度落成很短的起手（3~9 刻）。
 *   任何活着的伙伴都能被帮助，但只有宝可梦会在招式层面把这份力用出去。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   reach       托举距离：基础 4 格 + 速度/90，夹 4..6；越快的个体手伸得越远。
 *   assist      助力强度：基础 +50%，物攻与特攻合计每 600 点再加，夹 40%%..95%%；借出的力随自己的攻击面走。
 *   assistTicks 助力时长：基础 80 刻 + 亲密度×0.6 + 等级×1.2，夹 50..300；感情越深、等级越高，这份力留得越久。
 *   motes       暖光数量：基础 18 + 亲密度×0.08 + 特攻×0.08，夹 12..48；表现与持续光点的数量。
 *   tempo       起手：基础 6 刻 − 速度×0.01，夹 3..9。
 *   aftercast   收招：基础 5 刻 − 速度×0.008，夹 2..6。
 *   recharge    冷却：基础 48 刻 − 等级×0.2，夹 28..60。
 * 配置 rally（同心协力）双向取舍：开启＝加成 ×1.15 但窗口 ×0.65、冷却 +8（一次性重击）；关闭＝窗口 ×1.5 但加成 ×0.9、冷却 −6（长时间待命）。
 */
namespace PokemonSkills {
    export const helpinghandId = "helpinghand";
    export const helpinghandEffect = "world_combat:helping_hand";
    export const helpinghandMark = "world_combat:helpinghand_mark";
    export const helpinghandScene = "world_combat:move_helpinghand";
    export const helpinghandStatus = "helpinghand";
    export const helpinghandReadyText = "world_combat.move.helpinghand.text.ready";
    export const helpinghandStrikeText = "world_combat.move.helpinghand.text.strike";
    export const helpinghandFadeText = "world_combat.move.helpinghand.text.fade";

    actionParameters.define(helpinghandId, {
        reach: formula(
            F.base(4).plus(F.stat("speed").div(90).min(2)).clamp(4, 6).round(1),
            "托举距离", { unit: " 格", description: "够到伙伴并把光送过去的最大距离；速度越快伸得越远。" }),
        assist: percent(
            F.base(0.5).plus(F.stat("attack").plus(F.stat("specialAttack")).div(600).min(0.3))
                .times(F.when(F.pref("rally"), F.const(1.15), F.const(0.9)))
                .clamp(0.4, 0.95).round(3),
            "助力强度", "伙伴的下一次命中额外增加的伤害比例；施法者攻击面越高、同心协力开启时越强。"),
        assistTicks: seconds(
            F.base(80).plus(F.individual("friendship").times(0.6)).plus(F.level().times(1.2))
                .times(F.when(F.pref("rally"), F.const(0.65), F.const(1.5)))
                .clamp(50, 300).round(0),
            "助力时长", "这份力能留多久；亲密度与等级延长它，同心协力会缩短窗口换来更重的一击。"),
        motes: formula(
            F.base(18).plus(F.individual("friendship").times(0.08)).plus(F.stat("specialAttack").times(0.08)).clamp(12, 48).round(0),
            "暖光数量", { unit: " 点", description: "托举时飞向伙伴的光点数量，也驱动伙伴身上的持续暖光。" }),
        tempo: seconds(F.base(6).minus(F.stat("speed").times(0.01)).clamp(3, 9).round(0), "起手",
            "伸手把光送出去需要多久；速度越快越短。"),
        aftercast: seconds(F.base(5).minus(F.stat("speed").times(0.008)).clamp(2, 6).round(0), "收招",
            "送完光之后的收势。"),
        recharge: seconds(F.base(48).minus(F.level().times(0.2)).clamp(28, 60).round(0), "冷却",
            "两次托举之间的等待；等级越高越熟练。")
    });

    describe(helpinghandId, [
        { key: "description.0", values: ["assist", "assistTicks"] },
        { key: "description.1", values: ["reach", "motes"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "stance.rally", values: [], when: function (context) { return read(context.detail.values, ["rally"]) === true; } },
        { key: "stance.calm", values: [], when: function (context) { return read(context.detail.values, ["rally"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
