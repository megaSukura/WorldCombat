/**
 * 焕然一新 / Refresh —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中必中、PP 20、优先度 0、目标 self；
 *   onHit 只在中毒／灼伤／麻痹三种主异常上生效（睡眠、冰冻返回 false 不触发），随后 cureStatus。
 *
 * 世界化：把「用一回合换一次净化」翻成即时战斗里一次站定的净息——屏住呼吸把毒、灼、麻从身上抖落，
 *   并且抖落之后身体清爽一小段时间，在这段窗口里同样的三种异常再想上身会被弹开（见 skill.ts 的
 *   CombatStatus.gate 贡献）。它不回复生命、不解睡眠与冰冻，和「睡觉」「水流环」明确分开。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   tempo        净息起手：速度决定屏息时间（敏捷的个体更快抖落）。
 *   aftercast    收招：速度决定收势。
 *   recharge     冷却：等级提高熟练度；深息式冷却更长。
 *   clearTicks   清爽窗口：特防与等级决定窗口长度（硬朗与老练的个体清爽更久）；深息式 ×1.5、速净 ×0.65。
 *   motes        拂尘光点：特防与体型决定粒子量。
 *   purgeRadius  净息范围：碰撞箱高度决定抖落的半径，表现按它缩放。
 * 配置 deep（深息／速净）双向取舍：速净起手更短、冷却 ×0.8，但清爽窗口只有 ×0.65（一次短促的净化）；
 *   深息起手 ×1.3、冷却 ×1.25，却把清爽窗口拉到 ×1.5（一次更久的保护）。两个方向各有局面。
 */
namespace PokemonSkills {
    export const refreshId = "refresh";
    /** 本单元注册的真实 MobEffect id（startup.ts 里 e.create 的那个）。 */
    export const refreshEffect = "world_combat:clearheaded";
    /** 共享状态身份：消费方用 CombatStatus.has(world, actor, "clearheaded") 读取。 */
    export const refreshStatus = "clearheaded";
    export const refreshScene = "world_combat:move_refresh";
    export const refreshPurgeText = "world_combat.move.refresh.text.purge";
    export const refreshWardText = "world_combat.move.refresh.text.ward";
    /** 本招只处理这三类主异常，睡眠与冰冻不在其中（忠实原生 onHit）。 */
    export const refreshAfflictions = ["poison", "burn", "paralysis"];
    const refreshDeep = { key: "worldcombat.skill." + refreshId + ".preference.deep" };

    actionParameters.define(refreshId, {
        tempo: seconds(
            F.base(9).minus(F.stat("speed").times(0.03))
                .times(F.when(F.pref("deep", refreshDeep), F.const(1.3), F.const(0.85)))
                .clamp(3, 14).round(0),
            "净息起手", "站定屏息、把异常抖落需要多久；速度越快越短，深息更久。准备期间不能移动，可以被伤害打断。"),
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").times(0.02)).clamp(3, 10).round(0),
            "收招", "净化之后的收势；速度越快收得越利落。"),
        recharge: seconds(
            F.base(140).minus(F.level().times(0.6))
                .times(F.when(F.pref("deep", refreshDeep), F.const(1.25), F.const(0.8)))
                .clamp(70, 180).round(0),
            "冷却", "两次净息之间的等待；等级越高越熟练，深息式更长。"),
        clearTicks: seconds(
            F.base(45).plus(F.level().times(1.0)).plus(F.stat("specialDefence").times(0.25))
                .times(F.when(F.pref("deep", refreshDeep), F.const(1.5), F.const(0.65)))
                .clamp(30, 150).round(0),
            "清爽窗口", "净化后这段时间里，毒、灼、麻三类状态再想上身会被弹开；特防与等级越高越久，深息 ×1.5、速净 ×0.65。"),
        motes: formula(
            F.base(18).plus(F.stat("specialDefence").times(0.05)).plus(F.body("height").times(2)).clamp(14, 44).round(0),
            "拂尘光点", { unit: " 点", description: "抖落异常时迸出的净息光点数量；特防与体型越大越多，粒子按它发射。" }),
        purgeRadius: formula(
            F.base(1.1).plus(F.body("height").times(0.4)).clamp(1.0, 2.6).round(2),
            "净息范围", { unit: " 格", description: "净息环绕身体的半径；体型越大范围越宽，表现按它缩放。" })
    });

    describe(refreshId, [
        { key: "description.0", values: ["clearTicks"] },
        { key: "description.1", values: ["tempo"] },
        { key: "stance.deep", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "stance.quick", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
