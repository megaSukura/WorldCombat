/**
 * 奇妙空间 / wonderroom 的参数与数值来源。
 *
 * 原生事实：Psychic、Status、威力 —、命中 必中、PP 10、场上伪天气 pseudoWeather wonderroom，持续 5 回合，
 *   期间所有宝可梦的防御与特防互换。
 * 核心念头：施法者在地面撑开一片淡青的交换空间，两半边沿反向旋转；踏进来的活体，防御与特防当场对调，
 *   走出去立刻换回。它不改数值、不改能力等级，只是把两条通道接反。
 * 世界化：以落点为心租出一片场地（WorldEffects.field），半径内的活体带共享身份
 *   world_combat:status/wonderroom 的 MobEffect；本单元在共享的伤害事实读取器
 *   （PokemonDamage.combatants）里注册一条规则：带该身份的活体，防御与特防数字互换。
 *   凡是读取该活体防御／特防的结算（招式命中、说明、其他公式）都走同一条读取器，因此对双方平等。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   swapTicks   基础 250 刻 + 等级 ×2 + 特攻 ×0.3，再乘形态系数（广域 ×1.15、紧凑 ×0.8），夹 160..520；
 *               空间撑多久，特攻高的人撑得久。
 *   swapRadius  基础 3.4 格 + 身高 ×0.9 + 特攻 ×0.012，再乘形态系数（广域 ×1.2、紧凑 ×0.85），夹 2.4..7；
 *               身板大、特攻高铺得广。
 *   density     基础 22 点 + 特攻 ×0.1 + 等级 ×0.3，夹 14..56；交换粒子数量，直接驱动画面。
 *   reach       施放距离：基础 12 格，20 级起每级 +0.08，夹 9..16；等级越高够得越远。
 *   tempo       基础 13 刻 − 速度 ×0.03，夹 8..17；撑开空间的起手，广域 +2 刻。
 *   aftercast   基础 8 刻 − 速度 ×0.01，夹 4..11；收招。
 *   recharge    基础 170 刻 − 速度 ×0.1，夹 100..210；两次撑空间之间的等待，广域 ×1.15、紧凑 ×0.85。
 * 配置 span（广域／紧凑）双向取舍：广域更大更久（半径 ×1.2、时长 ×1.15），代价是起手 +2、冷却 ×1.15；
 *   紧凑更小更短（半径 ×0.85、时长 ×0.8），换来起手 0、冷却 ×0.85。
 */
namespace PokemonSkills {
    export const wonderRoomId = "wonderroom";
    export const wonderRoomField = "world_combat:field/wonderroom";
    export const wonderRoomSwap = "world_combat:wonderroom_swap";
    export const wonderRoomScene = "world_combat:move_wonderroom";
    export const wonderRoomStatus = "wonderroom";
    export const wonderRoomOpenText = "world_combat.move.wonderroom.text.open";
    export const wonderRoomSwapText = "world_combat.move.wonderroom.text.swap";

    actionParameters.define(wonderRoomId, {
        swapTicks: seconds(
            F.base(250).plus(F.level().times(2)).plus(F.stat("specialAttack").times(0.3))
                .times(F.when(F.pref("span"), F.const(1.15), F.const(0.8)))
                .clamp(160, 520),
            "空间时长", "交换空间撑多久；等级与特攻让它更久，广域（×1.15）比紧凑（×0.8）更持久。"),
        swapRadius: formula(
            F.base(3.4).plus(F.body("height").times(0.9)).plus(F.stat("specialAttack").times(0.012))
                .times(F.when(F.pref("span"), F.const(1.2), F.const(0.85)))
                .clamp(2.4, 7),
            "空间半径", { unit: " 格", description: "空间罩住多大一片地；身板越大、特攻越高铺得越广，广域 ×1.2、紧凑 ×0.85。" }),
        density: formula(
            F.base(22).plus(F.stat("specialAttack").times(0.1)).plus(F.level().times(0.3)).clamp(14, 56).round(0),
            "交换密度", { unit: " 点", description: "两半边交换粒子的数量；特攻与等级越高越密，粒子按它发射。" }),
        reach: formula(F.base(12).plus(F.level().minus(20).max(0).times(0.08)).clamp(9, 16).round(1),
            "施放距离", { unit: " 格", description: "能往多远的地面撑开空间；等级越高够得越远。" }),
        tempo: seconds(F.base(13).minus(F.stat("speed").times(0.03)).clamp(8, 17).round(0), "起手",
            "撑开空间需要多久；速度越快越短，广域多花 2 刻。"),
        aftercast: seconds(F.base(8).minus(F.stat("speed").times(0.01)).clamp(4, 11).round(0), "收招",
            "撑开空间之后的收势。"),
        recharge: seconds(F.base(170).minus(F.stat("speed").times(0.1)).clamp(100, 210).round(0), "冷却",
            "两次撑空间之间的等待；广域更贵、紧凑更省。")
    });
    describe(wonderRoomId, [
        { key: "description.0", values: ["swapTicks", "swapRadius"] },
        { key: "description.1", values: ["reach"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "span.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.span === 1); } },
        { key: "span.1", values: [], when: function (context) { return !(context.detail && context.detail.values) || context.detail.values.span !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
