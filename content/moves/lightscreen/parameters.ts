/**
 * 光墙 / lightscreen 的参数与数值来源。
 *
 * 原生事实：Psychic、变化、威力 —、命中 必中、PP 30、目标己方场地／side lightscreen，持续 5 回合，
 *   期间己方（施法者一侧）受到的特殊攻击伤害减半。
 * 核心念头：在选定的落点立起一面朝向施放方向的柔光竖幕，只有从幕外真实穿过幕面、打向幕后友方的特殊攻击
 *   被这层光折弱；同侧来击、幕面之外的接触都不凭位置白减。
 * 世界化：幕面是一块带 `WorldEffects.categories.screen` 标签的有限宽高矩形场地（`WorldEffects.field`），
 *   位置即幕的下缘中点，法线是施放者到落点的水平方向。施法者在幕存在期间带共享身份
 *   world_combat:status/lightscreen 的真实 MobEffect（物品栏可见、/effect 可用、可被破屏招清除）。
 *   削减与滤淡写在本单元的入场伤害规则：按投射物真实轨迹或原生 sourcePosition→目标身体点的交面结果处理。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   screenTicks   基础 260 刻 + 等级 ×2 + 特防 ×0.5，夹 180..560；幕面能立多久，特防高的人立得久。
 *   screenRadius  基础 3 格 + 身高 ×0.8 + 特防 ×0.008，夹 2.5..6；竖直幕面每侧伸出的半宽。
 *   screenHeight  基础 2.2 格 + 身高 ×1.5，夹 2..5；幕面从下缘向上立起的高度，身板越高幕越高。
 *   reach         基础 5.5 格 + 20 级起每级 +0.06 + 速度 ×0.01，夹 4..10；能把幕立到多远的落点。
 *   motes         基础 22 点 + 特防 ×0.08 + 等级 ×0.3，夹 16..60；幕面光尘数量，也驱动持续画面。
 *   cut           基础 0.34 + 特防 ×0.0012，再乘形态系数（厚幕 ×1.18、柔幕 ×0.8），夹 0.2..0.55；特殊减伤比例。
 *   damp          基础 0.4 + 特防 ×0.002，再乘形态系数（厚幕 ×0.6、柔幕 ×1.3），夹 0.15..0.85；附带效果被滤淡的比例。
 *   tempo         基础 11 刻 − 速度 ×0.03，加形态修正（柔幕 −2、厚幕 +3），夹 4..17；立幕的起手。
 *   aftercast     基础 7 刻 − 速度 ×0.01，夹 4..10；收招。
 *   recharge      基础 150 刻 − 速度 ×0.1，再乘形态系数（柔幕 ×0.9、厚幕 ×1.12），夹 80..200；两次立幕的等待。
 * 配置 thick 双向取舍：厚幕把特殊减伤推到 ×1.18，代价是滤附带效果只有柔幕的约六成，起手 +3、冷却 ×1.12；
 *   柔幕减伤 ×0.8，但把附带效果滤掉得多（×1.3），起手 −2、冷却 ×0.9。
 */
namespace PokemonSkills {
    export const lightscreenId = "lightscreen";
    export const lightscreenEffect = "world_combat:lightscreen_veil";
    export const lightscreenMark = "world_combat:lightscreen_mark";
    export const lightscreenScene = "world_combat:move_lightscreen";
    export const lightscreenStatus = "lightscreen";
    export const lightscreenRaiseText = "world_combat.move.lightscreen.text.raise";
    export const lightscreenBlockText = "world_combat.move.lightscreen.text.block";
    export const lightscreenDampText = "world_combat.move.lightscreen.text.damp";
    export const lightscreenFadeText = "world_combat.move.lightscreen.text.fade";

    actionParameters.define(lightscreenId, {
        screenTicks: seconds(
            F.base(260).plus(F.level().times(2)).plus(F.stat("specialDefence").times(0.5)).clamp(180, 560).round(0),
            "光幕时长", "这面光幕能立多久；等级与特防让光幕亮得更久。"),
        screenRadius: formula(
            F.base(3).plus(F.body("height").times(0.8)).plus(F.stat("specialDefence").times(0.008)).clamp(2.5, 6).round(2),
            "幕面半宽", { unit: " 格", description: "竖直幕面每侧伸出的半宽；身板越大、特防越高，幕面越宽。" }),
        screenHeight: formula(
            F.base(2.2).plus(F.body("height").times(1.5)).clamp(2, 5).round(2),
            "幕面高度", { unit: " 格", description: "幕面从下缘中点向上立起的高度；身板越高幕越高。" }),
        reach: formula(
            F.base(5.5).plus(F.level().minus(20).max(0).times(0.06)).plus(F.stat("speed").times(0.01)).clamp(4, 10).round(1),
            "施放距离", { unit: " 格", description: "能把幕立到多远的落点；等级与速度让它够得更远。" }),
        motes: formula(
            F.base(22).plus(F.stat("specialDefence").times(0.08)).plus(F.level().times(0.3)).clamp(16, 60).round(0),
            "光尘数量", { unit: " 点", description: "幕面上的光尘数量；特防与等级越高越密，粒子按它发射。" }),
        cut: percent(
            F.base(0.34).plus(F.stat("specialDefence").times(0.0012))
                .times(F.when(F.pref("thick"), F.const(1.18), F.const(0.8)))
                .clamp(0.2, 0.55),
            "特殊减伤", "从幕外穿过幕面的特殊伤害被削掉的比例；特防越高越厚，厚幕 ×1.18、柔幕 ×0.8。"),
        damp: percent(
            F.base(0.4).plus(F.stat("specialDefence").times(0.002))
                .times(F.when(F.pref("thick"), F.const(0.6), F.const(1.3)))
                .clamp(0.15, 0.85),
            "效果滤淡", "穿幕特殊招式附带的次要效果落点几率被滤掉的比例；柔幕 ×1.3、厚幕 ×0.6。"),
        tempo: seconds(
            F.base(11).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("thick"), F.const(3), F.const(-2)))
                .clamp(4, 17).round(0),
            "起手", "立起光幕需要多久；速度越快越短，厚幕 +3 刻、柔幕 −2 刻。"),
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").times(0.01)).clamp(4, 10).round(0),
            "收招", "立幕之后的收势。"),
        recharge: seconds(
            F.base(150).minus(F.stat("speed").times(0.1))
                .times(F.when(F.pref("thick"), F.const(1.12), F.const(0.9)))
                .clamp(80, 200).round(0),
            "冷却", "两次立幕之间的等待；厚幕 ×1.12、柔幕 ×0.9。")
    });
    describe(lightscreenId, [
        { key: "description.0", values: ["screenRadius", "screenHeight", "screenTicks"] },
        { key: "description.1", values: ["cut", "damp"] },
        { key: "description.2", values: [] },
        { key: "description.3", values: ["reach"] },
        { key: "form.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.thick); } },
        { key: "form.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.thick); } },
        { key: "timing", values: ["reach","prepare","recover","pp","cooldown"] }
    ]);
}
