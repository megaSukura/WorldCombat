/**
 * 瞬间移动 / teleport —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Psychic／变化／威力 —／命中 —／PP 20／优先度 −6／selfSwitch／target self；
 *   说明是「当有后备宝可梦在时，如果使用就可以进行替换。野生的宝可梦会逃走」。
 *
 * 世界化翻译：即时世界没有后备席，把「瞬移离场」落成**一次点对自己的瞬移**——折叠空间瞬间挪到选定落点，
 *   顺手甩掉盯着自己的敌人；野生的个体挪得更远、并彻底松开手里的目标（逃走）。真正的「和后备宝可梦替换」
 *   需要共享层提供让后备个体入场／收回当前个体的操作，本单元交付可观察到的瞬移与脱锁，替换部分见报告共享前置。
 *
 * 数据分散：
 *   blinkRange  瞬移距离 = 特攻（折叠空间）＋ 速度（抢一瞬）＋ 野生加成 ＋ 配置；它也是本招的实际射程；
 *   shedRadius  甩仇恨半径 = 等级 ＋ 配置；
 *   motes       空间裂缝碎点数 = 速度 ＋ 特攻；
 *   tempo／aftercast／recharge = 速度／等级／配置。
 *
 * 配置 far（远遁闪）：开启＝距离 ×1.35、甩仇恨半径 ×1.2，代价是起手 +3、冷却 +26（落地更散、更久才能再闪）；
 *   关闭（闪现）：距离 ×0.85、甩仇恨半径 ×0.9，起手与冷却都更省。两向各有局面：拉开生死距离 vs 频繁小挪。
 * 无伤害段：这是纯位移＋脱锁的 Status 招。
 */
namespace PokemonSkills {
    export const teleportId = "teleport";
    export const teleportScene = "world_combat:move_teleport";
    export const teleportText = "world_combat.move.teleport.text.blink";
    export const teleportWildText = "world_combat.move.teleport.text.flee";

    actionParameters.define(teleportId, {
        /** 瞬移距离：9 +（特攻 − 50）×0.03 [−1.5,3] +（速度 − 50）×0.05 [−1.5,4] + 野生 +3；远遁闪 ×1.35／闪现 ×0.85；夹 5..20。 */
        blinkRange: formula(
            F.base(9)
                .plus(F.stat("specialAttack").minus(50).times(0.03).clamp(-1.5, 3).as(text("worldcombat.skill.teleport.value.fold")))
                .plus(F.stat("speed").minus(50).times(0.05).clamp(-1.5, 4).as(text("worldcombat.skill.teleport.value.dash")))
                .plus(F.when(F.individual("wild").gt(0), F.const(3), F.const(0)).as(text("worldcombat.skill.teleport.value.wild")))
                .times(F.when(F.pref("far", text("worldcombat.skill.teleport.preference.far")), F.const(1.35), F.const(0.85)))
                .clamp(5, 20).round(2),
            "瞬移距离", {
                unit: " 格",
                description: "一次能挪多远；特攻折叠空间、速度抢那一瞬，野生的个体借逃走的劲挪得更远。它也是本招的实际射程与指示线长度。"
            }),
        /** 甩仇恨半径：6 +（等级 − 30）×0.08 [−1,4]；远遁闪 ×1.2／闪现 ×0.9；夹 4..12。 */
        shedRadius: formula(
            F.base(6).plus(F.level().minus(30).times(0.08).clamp(-1, 4))
                .times(F.when(F.pref("far", text("worldcombat.skill.teleport.preference.far")), F.const(1.2), F.const(0.9)))
                .clamp(4, 12).round(2),
            "甩仇恨半径", {
                unit: " 格",
                description: "离开原位置时，该位置周围这个范围内正盯着你的敌人会失去目标；等级越高、开启远遁闪时甩得越开。"
            }),
        /** 裂缝碎点数：20 + 速度 ÷ 6 + 特攻 ÷ 10；夹 14..52。 */
        motes: formula(
            F.base(20).plus(F.stat("speed").div(6)).plus(F.stat("specialAttack").div(10)).clamp(14, 52).round(0),
            "裂缝碎点", {
                unit: " 点",
                description: "进出空间裂缝时散出的碎点数量，直接驱动表现密度；速度与特攻越高越密。"
            }),
        /** 起手：4 −（速度 − 50）×0.02 [−1,1]；远遁闪 +3；夹 2..7。 */
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(50).times(0.02).clamp(-1, 1))
                .plus(F.when(F.pref("far", text("worldcombat.skill.teleport.preference.far")), F.const(3), F.const(0)))
                .clamp(2, 7).round(0),
            "起手", "折叠空间需要的瞬间；速度越快越短，远遁闪要先站稳再闪。"),
        /** 收招：5 −（速度 − 50）×0.02 [−1,1]；夹 3..7。 */
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(50).times(0.02).clamp(-1, 1)).clamp(3, 7).round(0),
            "收招", "落地后稳住身形的时间。"),
        /** 冷却：60 +（等级 − 30）×0.4 [−4,10]；远遁闪 +26／闪现 −8；夹 40..110。 */
        recharge: seconds(
            F.base(60).plus(F.level().minus(30).times(0.4).clamp(-4, 10))
                .plus(F.when(F.pref("far", text("worldcombat.skill.teleport.preference.far")), F.const(26), F.const(-8)))
                .clamp(40, 110).round(0),
            "冷却", "再折叠一次空间前的等待；远遁闪更费，闪现更省。")
    });

    stages(teleportId, [
        { level: 34, values: { blinkRange: 10, recharge: 54 } },
        { level: 52, values: { blinkRange: 12, recharge: 46 } }
    ]);

    describe(teleportId, [
        { key: "description.0", values: ["blinkRange"] },
        { key: "description.1", values: ["shedRadius"] },
        { key: "description.2", values: [] },
        { key: "far.on", values: [], when: function (context) { return read(context.detail.values, ["far"]) === true; } },
        { key: "far.off", values: [], when: function (context) { return read(context.detail.values, ["far"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blinkRange"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blinkRange"] }
    ]);
}
