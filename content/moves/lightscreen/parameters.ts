/**
 * 光墙 / lightscreen 的参数与数值来源。
 *
 * 原生事实：Psychic、变化、威力 —、命中 必中、PP 30、目标己方场地／side lightscreen，持续 5 回合，
 *   期间己方（施法者一侧）受到的特殊攻击伤害减半。
 * 核心念头：在身周张起一层柔光穹顶，特殊攻击穿进来时被这层光折暗；附带的效果也被滤淡一些。
 * 世界化：施法者挂共享身份 world_combat:status/lightscreen 的真实 MobEffect（物品栏可见、/effect 可用），
 *   并以自身为锚每 20 刻把同一层光幕补给半径内的友方；每面光幕的削减份额与滤淡份额写在该活体自己的
 *   world_combat:lightscreen_mark 上，特殊伤害与其附带效果的几率在结算前读到并处理。光幕跟着施法者走。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   screenTicks   基础 260 刻 + 等级 ×2 + 特防 ×0.5，夹 180..560；光幕能维持多久，特防高的人维持得久。
 *   screenRadius  基础 3 格 + 身高 ×0.8 + 特防 ×0.008，夹 2.5..6；穹顶罩住多大一圈，身板大、特防高则更广。
 *   motes         基础 22 点 + 特防 ×0.08 + 等级 ×0.3，夹 16..60；光幕粒子数量，也驱动持续画面。
 *   cut           基础 0.34 + 特防 ×0.0012，再乘形态系数（厚幕 ×1.18、柔幕 ×0.8），夹 0.2..0.55；特殊减伤比例。
 *   damp          基础 0.4 + 特防 ×0.002，再乘形态系数（厚幕 ×0.6、柔幕 ×1.3），夹 0.15..0.85；附带效果被滤淡的比例。
 *   tempo         基础 11 刻 − 速度 ×0.03，加形态修正（柔幕 −2、厚幕 +3），夹 4..17；张幕的起手。
 *   aftercast     基础 7 刻 − 速度 ×0.01，夹 4..10；收招。
 *   recharge      基础 150 刻 − 速度 ×0.1，再乘形态系数（柔幕 ×0.9、厚幕 ×1.12），夹 80..200；两次张幕的等待。
 * 配置 thick 双向取舍：厚幕把特殊减伤推到 ×1.18，代价是滤附带效果只有薄幕的约六成，起手 +3、冷却 ×1.12；
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
            "光幕时长", "这层光幕能维持多久；等级与特防让光幕亮得更久。"),
        screenRadius: formula(
            F.base(3).plus(F.body("height").times(0.8)).plus(F.stat("specialDefence").times(0.008)).clamp(2.5, 6),
            "光幕半径", { unit: " 格", description: "穹顶罩住多大一圈队友；身板越大、特防越高罩得越广。" }),
        motes: formula(
            F.base(22).plus(F.stat("specialDefence").times(0.08)).plus(F.level().times(0.3)).clamp(16, 60).round(0),
            "光尘数量", { unit: " 点", description: "光幕里的光尘数量；特防与等级越高越密，粒子按它发射。" }),
        cut: percent(
            F.base(0.34).plus(F.stat("specialDefence").times(0.0012))
                .times(F.when(F.pref("thick"), F.const(1.18), F.const(0.8)))
                .clamp(0.2, 0.55),
            "特殊减伤", "穿过光幕的特殊伤害被削掉的比例；特防越高越厚，厚幕 ×1.18、柔幕 ×0.8。"),
        damp: percent(
            F.base(0.4).plus(F.stat("specialDefence").times(0.002))
                .times(F.when(F.pref("thick"), F.const(0.6), F.const(1.3)))
                .clamp(0.15, 0.85),
            "效果滤淡", "特殊招式附带的次要效果（灼伤、麻痹等）落点几率被滤掉的比例；柔幕 ×1.3、厚幕 ×0.6。"),
        tempo: seconds(
            F.base(11).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("thick"), F.const(3), F.const(-2)))
                .clamp(4, 17).round(0),
            "起手", "张起光幕需要多久；速度越快越短，厚幕 +3 刻、柔幕 −2 刻。"),
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").times(0.01)).clamp(4, 10).round(0),
            "收招", "张幕之后的收势。"),
        recharge: seconds(
            F.base(150).minus(F.stat("speed").times(0.1))
                .times(F.when(F.pref("thick"), F.const(1.12), F.const(0.9)))
                .clamp(80, 200).round(0),
            "冷却", "两次张幕之间的等待；厚幕 ×1.12、柔幕 ×0.9。")
    });
    describe(lightscreenId, [
        { key: "description.0", values: ["screenTicks", "screenRadius"] },
        { key: "description.1", values: ["cut", "damp"] },
        { key: "description.2", values: ["motes"] },
        { key: "description.3", values: ["tempo", "aftercast", "recharge"] },
        { key: "form.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.thick); } },
        { key: "form.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.thick); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
