/**
 * 极光幕 / auroraveil 的参数与数值来源。
 *
 * 原生事实：Ice、变化、威力 —、命中 必中、PP 20、目标己方场地／side auroraveil，持续 5 回合，
 *   期间己方（施法者一侧）受到的物理与特殊伤害都减弱；只有冰雹（本工程里读作雷雨 + 雪地）时才能使出。
 * 核心念头：在头顶拉起一道极光，把整片天光变成一层幕；幕下的友方，物理和特殊的伤害都被一起滤掉。
 *   天不够冷、不下雪就铺不起来——这是这招唯一的门槛。
 * 世界化：在选定的地面张开一片极光区（`WorldEffects.field`），幕下的**友方**每 5 刻被补上
 *   world_combat:auroraveil_screen（身份 auroraveil）与自己的 world_combat:auroraveil_mark；受击时按
 *   cutPhys／cutSpec 分别削减物理与特殊伤害。离开极光区或被墙隔断就失去幕，连回幕心的细丝同时断。
 * 场地高度：铺幕时从落点向上探一次原生方块，得到实际能挂多高（`ceiling`）；幕顶虹带贴到它，低顶棚改用幕内短垂带。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   reach        基础 12 格 + 20 级起每级 +0.06，夹 10..18；能把极光铺到多远的天。
 *   veilTicks    基础 200 刻 + 等级 ×1.5 + 特防 ×0.4，再乘幕法系数（长幕 ×1.3、明幕 ×0.7），夹 140..520。
 *   veilRadius   基础 4 格 + 身高 ×0.8 + 特防 ×0.008，夹 3..7；极光罩住多大一片。
 *   ribbons      基础 8 条 + 特防 ×0.05 + 等级 ×0.2，夹 6..20；极光带数，粒子按它发射。
 *   cutPhys      基础 0.28 + 防御 ×0.0012，再乘幕法系数（明幕 ×1.2、长幕 ×1），夹 0.18..0.5；物理减伤。
 *   cutSpec      基础 0.28 + 特防 ×0.0012，再乘幕法系数（明幕 ×1.2、长幕 ×1），夹 0.18..0.5；特殊减伤。
 *   tempo        基础 12 刻 − 速度 ×0.03，加幕法修正（明幕 +3、长幕 −2），夹 4..18；铺幕的起手。
 *   aftercast    基础 7 刻 − 速度 ×0.01，夹 4..10；收招。
 *   recharge     基础 170 刻 − 速度 ×0.1，再乘幕法系数（明幕 ×1.15、长幕 ×0.95），夹 90..210。
 * 配置 bright 双向取舍：明幕物特各减 ×1.2，代价是时长 ×0.7、起手 +3、冷却 ×1.15；长幕物特各减基础值，
 *   换来时长 ×1.3、起手 −2、冷却 ×0.95——铺得广、挂得久，但挡得薄。
 */
namespace PokemonSkills {
    export const auroraveilId = "auroraveil";
    export const auroraveilEffect = "world_combat:auroraveil_screen";
    export const auroraveilMark = "world_combat:auroraveil_mark";
    export const auroraveilField = "world_combat:field/auroraveil";
    export const auroraveilScene = "world_combat:move_auroraveil";
    export const auroraveilStatus = "auroraveil";
    export const auroraveilRaiseText = "world_combat.move.auroraveil.text.raise";
    export const auroraveilBlockText = "world_combat.move.auroraveil.text.block";
    export const auroraveilFadeText = "world_combat.move.auroraveil.text.fade";

    actionParameters.define(auroraveilId, {
        reach: formula(
            F.base(12).plus(F.level().minus(20).max(0).times(0.06)).clamp(10, 18).round(1),
            "施放距离", { unit: " 格", description: "能把极光铺到多远的天；等级越高够得越远。" }),
        veilTicks: seconds(
            F.base(200).plus(F.level().times(1.5)).plus(F.stat("specialDefence").times(0.4))
                .times(F.when(F.pref("bright"), F.const(0.7), F.const(1.3)))
                .clamp(140, 520).round(0),
            "极光时长", "这片极光能挂多久；长幕 ×1.3、明幕 ×0.7，等级与特防会延长。"),
        veilRadius: formula(
            F.base(4).plus(F.body("height").times(0.8)).plus(F.stat("specialDefence").times(0.008)).clamp(3, 7).round(2),
            "极光半径", { unit: " 格", description: "极光罩住多大一片；身板越大、特防越高罩得越广。" }),
        ribbons: formula(
            F.base(8).plus(F.stat("specialDefence").times(0.05)).plus(F.level().times(0.2)).clamp(6, 20).round(0),
            "极光带数", { unit: " 条", description: "横过天顶的极光带数量；特防与等级越高越密，粒子按它发射。" }),
        cutPhys: percent(
            F.base(0.28).plus(F.stat("defence").times(0.0012))
                .times(F.when(F.pref("bright"), F.const(1.2), F.const(1)))
                .clamp(0.18, 0.5),
            "物理减伤", "幕下友方受到的物理伤害被削掉的比例；防御越高越厚，明幕 ×1.2。"),
        cutSpec: percent(
            F.base(0.28).plus(F.stat("specialDefence").times(0.0012))
                .times(F.when(F.pref("bright"), F.const(1.2), F.const(1)))
                .clamp(0.18, 0.5),
            "特殊减伤", "幕下友方受到的特殊伤害被削掉的比例；特防越高越厚，明幕 ×1.2。"),
        tempo: seconds(
            F.base(12).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("bright"), F.const(3), F.const(-2))).clamp(4, 18).round(0),
            "起手", "拉开幕需要多久；速度越快越短，明幕 +3 刻、长幕 −2 刻。"),
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").times(0.01)).clamp(4, 10).round(0),
            "收招", "铺幕之后的收势。"),
        recharge: seconds(
            F.base(170).minus(F.stat("speed").times(0.1))
                .times(F.when(F.pref("bright"), F.const(1.15), F.const(0.95))).clamp(90, 210).round(0),
            "冷却", "两次铺幕之间的等待；明幕 ×1.15、长幕 ×0.95。")
    });
    describe(auroraveilId, [
        { key: "description.0", values: ["reach"] },
        { key: "description.1", values: ["veilTicks","veilRadius"] },
        { key: "description.2", values: ["cutPhys","cutSpec"] },
        { key: "form.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.bright); } },
        { key: "form.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.bright); } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] }
    ]);
}
