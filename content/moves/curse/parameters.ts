/**
 * 诅咒 / Curse —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Ghost、变化、威力 0、命中 必中、PP 10、单体。
 *   使用者是幽灵属性：自减最大生命的一半，给目标挂 volatile curse，每回合扣最大生命 1/4。
 *   使用者不是幽灵：招式改为对自己生效，物攻 +1、防御 +1、速度 −1。
 *
 * 世界化：诅咒是一次**交换**——把自身的一部分押出去。
 *   幽灵个体：当场押上半条命，把债记在对手身上；之后每隔一段从对手身上扣一口，债走完或被清掉才停。
 *   非幽灵个体：押上敏捷，换来凶悍与硬壳（物攻/防御 +，速度 −），并在身上烙下一枚短暂的契约印记。
 *   出招仍需要一个对手作为「凝视的对象」，所以 kind 是 enemy；幽灵把债推给对手，其他个体只能自己吞下。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   reach       诅咒距离：基础 5 格 + 特攻/120，夹 4..8；凝视得越远的个体够得越远。
 *   hexShare    每口债：基础 25%%，血契抬到满额、稳咒降到 55%%，夹 12%%..32%%。
 *   hexTicks    债的时长：基础 200 刻 + 特攻×0.6 + 等级×0.8，血契 ×0.7、稳咒 ×1.35，夹 120..480。
 *   hexInterval 扣血间隔：基础 60 刻 − 速度×0.05，夹 40..70；快个体收债更勤。
 *   bloodCost   幽灵的代价：血契 50%% 最大生命，稳咒 35%%。
 *   pactGain    非幽灵的交换等级：基础 1，血契再 +1，50 级起再 +1，夹 1..3；物攻与防御同涨、速度同跌。
 *   tempo / aftercast / recharge：起手、收招、冷却，随速度与等级变化。
 * 配置 bloodpact（血契）双向取舍：开启＝代价更重、每口更狠、债更短、交换等级更高；关闭＝代价更轻、每口更淡、债更久。
 */
namespace PokemonSkills {
    export const curseId = "curse";
    export const cursedHex = "world_combat:cursed_hex";
    export const cursedBind = "world_combat:cursed_bind";
    export const cursePact = "world_combat:curse_pact";
    export const curseScene = "world_combat:move_curse";
    export const curseStatus = "curse";
    export const cursePactStatus = "cursed_pact";
    export const curseTextHex = "world_combat.move.curse.text.hex";
    export const curseTextPact = "world_combat.move.curse.text.pact";
    export const curseTextToll = "world_combat.move.curse.text.toll";
    export const curseTextLift = "world_combat.move.curse.text.lift";

    export function curseGhostType(pokemon: CombatPokemon | null | undefined): boolean {
        if (!pokemon) return false;
        for (let i = 0; i < pokemon.typeCount(); i++) if (String(pokemon.type(i)) === "ghost") return true;
        return false;
    }

    actionParameters.define(curseId, {
        reach: formula(
            F.base(5).plus(F.stat("specialAttack").div(120).min(3)).clamp(4, 8).round(1),
            "诅咒距离", { unit: " 格", description: "能把债记到多远的对手身上；特攻越高够得越远。" }),
        hexShare: percent(
            F.base(0.25).times(F.when(F.pref("bloodpact"), F.const(1), F.const(0.55))).clamp(0.12, 0.32).round(4),
            "每口债", "每隔一段从对手最大生命里扣掉的比例；血契每一口更狠，稳咒更淡但更久。"),
        hexTicks: seconds(
            F.base(200).plus(F.stat("specialAttack").times(0.6)).plus(F.level().times(0.8))
                .times(F.when(F.pref("bloodpact"), F.const(0.7), F.const(1.35)))
                .clamp(120, 480).round(0),
            "债的时长", "债能记在对手身上多久；特攻与等级延长它，血契更短、稳咒更久。"),
        hexInterval: seconds(
            F.base(60).minus(F.stat("speed").times(0.05)).clamp(40, 70).round(0),
            "扣血间隔", "每隔多久从对手身上扣一口；速度越快收债越勤。"),
        bloodCost: percent(
            F.when(F.pref("bloodpact"), F.const(0.5), F.const(0.35)),
            "生命代价", "幽灵形态当场押出去的最大生命比例；血契押上半条命，稳咒押 35%%。"),
        pactGain: formula(
            F.base(1).plus(F.when(F.pref("bloodpact"), F.const(1), F.const(0)))
                .plus(F.when(F.level().gte(50), F.const(1), F.const(0))).clamp(1, 3).round(0),
            "交换等级", { unit: " 级", description: "非幽灵形态物攻/防御各提高、速度各降低的等级；血契与高等级让这笔交换更大。" }),
        tempo: seconds(F.base(9).minus(F.stat("speed").times(0.02)).clamp(4, 12).round(0), "起手",
            "把债递出去需要多久；速度越快越短。"),
        aftercast: seconds(F.base(8).minus(F.stat("speed").times(0.012)).clamp(3, 10).round(0), "收招",
            "递完债之后的收势。"),
        recharge: seconds(F.base(90).minus(F.level().times(0.4)).clamp(50, 110).round(0), "冷却",
            "两次诅咒之间的等待；等级越高越熟练。")
    });

    describe(curseId, [
        { key: "description.ghost.0", values: ["hexShare", "hexTicks", "hexInterval"],
            when: function (context) { return curseGhostType(context.pokemon); } },
        { key: "description.ghost.1", values: ["bloodCost", "reach"],
            when: function (context) { return curseGhostType(context.pokemon); } },
        { key: "description.plain.0", values: ["pactGain", "reach"],
            when: function (context) { return !curseGhostType(context.pokemon); } },
        { key: "description.plain.1", values: ["tempo"],
            when: function (context) { return !curseGhostType(context.pokemon); } },
        { key: "stance.blood", values: [], when: function (context) { return read(context.detail.values, ["bloodpact"]) === true; } },
        { key: "stance.steady", values: [], when: function (context) { return read(context.detail.values, ["bloodpact"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
