/**
 * 电气场地 / electricterrain 的参数。
 *
 * 原生事实：Electric／变化／威力 —／命中 —／PP 10／场上场地 5 回合：地面上的宝可梦无法入眠，
 * 电属性招式威力 ×1.5（Gen 8+ ×1.3）。
 * 世界化：把「5 回合的场地」翻成一片带电的地面——施法者把电流按进选定的地面，电火花贴着地皮窜开；
 * 站在地上（grounded）的活体带上 electricterrain 身份，电招更猛，脚下那层电荷让它无法入眠
 * （共享的睡眠施加在 `CombatStatus.gate` 上被拒绝）；一旦离开地面，很快恢复可入睡。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   gather       起手：基础 13 刻，速度每快 1 点减 0.04 刻，夹在 9..20。
 *   settle       收招：基础 9 刻，速度每快 1 点减 0.02 刻，夹在 6..14。
 *   reach        施放距离：基础 15 格，20 级起每级 +0.08，夹在 11..19。
 *   fieldRadius  电场半径：基础 3.0 格 +（特攻超过 60）×0.012 +（身高超过 1.4）×0.5，再乘强弱系数，夹在 2.2..5.5。
 *   fieldTicks   电场持续：基础 300 刻 + 20 级起每级 5 刻，再乘强弱系数，夹在 220..560。
 *   wakeTicks    清醒余量：基础 60 刻 + 速度 ×0.5，再乘强弱系数，夹在 40..160；离开电场后仍无法入眠的时长。
 *   fieldDensity 电弧密度：基础 26 + 特攻 ÷ 8，再乘强弱系数，夹在 14..60；直接驱动粒子数量。
 *   surge        入场合电：基础 10 + 特攻 ÷ 12，夹在 6..22；踩进电场时身上迸出的火花数。
 * 配置 surging 在「更大更密、清醒更久的强电」和「更小更短但更久更省的稳电」之间取舍。
 */
namespace PokemonSkills {
    export const electricScene = "world_combat:move_electricterrain";
    export const electricField = "world_combat:field/electricterrain";
    export const electricGround = "world_combat:electricterrain_ground";
    export const electricChargeText = "world_combat.move.electricterrain.text.charge";
    export const electricAwakeText = "world_combat.move.electricterrain.text.awake";

    actionParameters.define("electricterrain", {
        gather: seconds(F.base(13).plus(F.stat("speed").minus(40).max(0).times(0.04).clamp(0, 6)).clamp(9, 20),
            "起手", "把电流按进地面需要多少时间；速度越快，电得越早。"),
        settle: seconds(F.base(9).plus(F.stat("speed").minus(40).max(0).times(0.02).clamp(0, 4)).clamp(6, 14),
            "收招", "电场亮起后收势需要多少时间。"),
        reach: formula(F.base(15).plus(F.level().minus(20).max(0).times(0.08)).clamp(11, 19).round(1),
            "施放距离", { unit: " 格", description: "能在多远的地面按进电流；等级越高够得越远。" }),
        fieldRadius: formula(
            F.base(3).plus(F.stat("specialAttack").minus(60).max(0).times(0.012))
                .plus(F.body("height").minus(1.4).max(0).times(0.5))
                .times(F.when(F.pref("surging"), F.const(1.2), F.const(0.85)))
                .clamp(2.2, 5.5).round(2),
            "电场半径", { unit: " 格", description: "电场覆盖多大的一片地；特攻越高、体型越大越广，强电 ×1.2、稳电 ×0.85。" }),
        fieldTicks: seconds(
            F.base(300).plus(F.level().minus(20).max(0).times(5))
                .times(F.when(F.pref("surging"), F.const(0.78), F.const(1.2)))
                .clamp(220, 560),
            "电场持续", "这片电场亮多久；稳电更久（×1.2）、强电更短（×0.78），等级提升会延长。"),
        wakeTicks: seconds(
            F.base(60).plus(F.stat("speed").times(0.5))
                .times(F.when(F.pref("surging"), F.const(1.35), F.const(0.8)))
                .clamp(40, 160),
            "清醒余量", "离开电场后还无法入眠多久；速度越快余电散得越慢，强电更久、稳电更短。"),
        fieldDensity: formula(
            F.base(26).plus(F.stat("specialAttack").div(8))
                .times(F.when(F.pref("surging"), F.const(1.4), F.const(0.8)))
                .clamp(14, 60).round(),
            "电弧密度", { unit: " 点", description: "电场里电弧与电火花的数量；特攻越高铺得越密，粒子直接按它发射。" }),
        surge: formula(F.base(10).plus(F.stat("specialAttack").div(12)).clamp(6, 22).round(),
            "入场合电", { unit: " 点", description: "踩进电场时身上迸出的火花数；特攻越高越亮。" })
    });

    stages("electricterrain", [{ level: 40, values: { cooldown: 144 } }, { level: 55, values: { cooldown: 126 } }]);
    describe("electricterrain", [
        { key: "description.0", values: ["fieldRadius", "fieldTicks"] },
        { key: "description.1", values: ["wakeTicks", "fieldDensity"] },
        { key: "description.2", values: ["surge"] },
        { key: "description.3", values: ["gather", "settle"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
