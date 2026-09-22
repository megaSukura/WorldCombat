/**
 * 愤怒粉 / Rage Powder —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Bug、变化、威力 0、命中必中、PP 20、优先度 +2、目标 self；
 *   带 powder 标记（草属性、防尘护目镜免疫）；onTry 要求 activePerHalf > 1；命中挂 volatile `ragepowder`，
 *   duration 1，让对手本回合只瞄准自己（onFoeRedirectTargetPriority 1）。
 *
 * 世界化：把「撒在自己身上的刺激粉末让对手只盯我」翻成即时里一团挂在施法者周围的粉尘云——
 *   云里的敌人会不断被指向施法者（world.target），把火力从同伴身上吸过来；因为是粉末，草属性身上不生效。
 *   它比「看我嘛」更稠、更黏，牵引圈子更紧、更持久，代价是怕草属性。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   cloudRadius 粉尘半径：等级与特攻决定云罩多大；浓粉更紧、薄粉更宽。
 *   cloudTicks  粉尘存续：等级与特防决定这团云挂多久；浓粉更久、薄粉略短。
 *   interval    牵引节奏：速度决定多久把云里的敌人重新蘸一次粉；浓粉更快。
 *   motes       粉尘颗粒：特攻决定粒子量。
 *   tempo／aftercast／recharge：起手（原生 +2 优先度，很短）、收招、冷却，随速度与等级变化。
 * 配置 thick（浓粉／薄粉）双向取舍：浓粉＝半径 ×0.85 但牵引间隔 ×0.6、存续 ×1.15（小范围、黏得死）；
 *   薄粉＝半径 ×1.3，牵引间隔 ×1.3、存续 ×0.9（罩得广但松）。两边各有局面。
 */
namespace PokemonSkills {
    export const ragePowderId = "ragepowder";
    export const ragePowderEffect = "world_combat:rage_powder";
    export const ragePowderMark = "world_combat:rage_powder_cloud";
    export const ragePowderScene = "world_combat:move_ragepowder";
    export const ragePowderStatus = "ragepowder";
    export const ragePowderTextCloud = "world_combat.move.ragepowder.text.cloud";
    export const ragePowderTextFade = "world_combat.move.ragepowder.text.fade";
    const ragePowderThick = { key: "worldcombat.skill." + ragePowderId + ".preference.thick" };

    actionParameters.define(ragePowderId, {
        cloudRadius: formula(
            F.base(5).plus(F.level().times(0.06)).plus(F.stat("specialAttack").times(0.015))
                .times(F.when(F.pref("thick", ragePowderThick), F.const(0.85), F.const(1.3)))
                .clamp(3, 10).round(1),
            "粉尘半径", { unit: " 格", description: "粉尘云罩住多大范围，云里的敌人会被拉向自己；等级与特攻越高越大，浓粉更紧、薄粉更宽。" }),
        cloudTicks: seconds(
            F.base(120).plus(F.level().times(2)).plus(F.stat("specialDefence").times(0.5))
                .times(F.when(F.pref("thick", ragePowderThick), F.const(1.15), F.const(0.9)))
                .clamp(70, 300).round(0),
            "粉尘存续", "这团粉尘云挂多久；等级与特防越久，浓粉更长、薄粉略短。走完或被清除即结束。"),
        interval: seconds(
            F.base(14).minus(F.stat("speed").times(0.02))
                .times(F.when(F.pref("thick", ragePowderThick), F.const(0.6), F.const(1.3)))
                .clamp(6, 22).round(0),
            "牵引节奏", "每隔多久把云里的敌人重新蘸一次粉；速度越快越勤，浓粉再 ×0.6。"),
        motes: formula(
            F.base(24).plus(F.stat("specialAttack").times(0.1)).clamp(18, 54).round(0),
            "粉尘颗粒", { unit: " 点", description: "粉尘云里飘浮的颗粒数量；特攻越高越多，粒子按它发射。" }),
        tempo: seconds(
            F.base(6).minus(F.stat("speed").times(0.02)).clamp(3, 9).round(0),
            "起手", "把粉尘撒开需要多久；速度越快越短（原生优先度 +2，很短）。"),
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").times(0.02)).clamp(2, 9).round(0),
            "收招", "撒完之后的收势；速度越快收得越短。"),
        recharge: seconds(
            F.base(130).minus(F.level().times(0.5)).clamp(60, 180).round(0),
            "冷却", "两团粉尘之间的等待；等级越高越短。")
    });

    describe(ragePowderId, [
        { key: "description.0", values: ["cloudRadius", "cloudTicks"] },
        { key: "description.1", values: ["interval", "motes"] },
        { key: "thick.on", values: [], when: function (context) { return read(context.detail.values, ["thick"]) === true; } },
        { key: "thick.off", values: [], when: function (context) { return read(context.detail.values, ["thick"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
