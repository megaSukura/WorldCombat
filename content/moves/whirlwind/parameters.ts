/**
 * 吹飞 / whirlwind —— 第 078 组「强制退场」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：飞行、变化、PP 20、优先度 -6、命中 100；说明是
 *   「吹飞对手，强制拉后备宝可梦上场；如果对手为野生宝可梦，战斗将直接结束」。
 * - 即时战斗翻译：朝选定方向推出一道向前推进的风墙。风墙从施法者身前出发，以每刻固定速度扫到风道尽头；
 *   每个推进拍上有一道横风带，按真实方块裁剪——同一侧向位置被墙挡住的人，风到不了；开口处风继续通过。
 *   风墙推进期间只对真实风道内、且随风吹过身位的人沿风向做受击位移，累计不超过 blow 总预算；
 *   离开风面立即不再推动，抗位移的目标推不动也不强绕。没有伤害；有合法后备的对手被原生队伍操作真正换下。
 *   本招不再持续清目标：被吹开者随后照常重新寻敌。
 * - 参数分散到精灵数据：风道长度取速度（气息），风道半径取身高（体量），推进速度取速度，吹飞总预算取体重，
 *   粒子数量取速度，时序取速度与等级。
 * - 配置 wide（宽阔风墙）：开启＝风墙宽度 ×1.35，代价是长度 ×0.85、吹飞预算 ×0.9；关闭＝又窄又长、
 *   吹得更远，适合远距离清场。两个方向各有适用局面。
 */
namespace PokemonSkills {
    export const whirlwindId = "whirlwind";
    export const whirlwindScene = "world_combat:move_whirlwind";
    export const whirlwindBlowText = "world_combat.move.whirlwind.text.blow";
    export const whirlwindMissText = "world_combat.move.whirlwind.text.miss";
    export const whirlwindSwitchText = "world_combat.move.whirlwind.text.switch";

    actionParameters.define(whirlwindId, {
        /** 风道长度：基础 7 格 +（速度 − 60）×0.05（夹 -1..+3）；wide ×0.85；夹在 4..14 格。 */
        reach: formula(
            F.base(7, "风道长度")
                .plus(F.stat("speed").minus(60).times(0.05).clamp(-1, 3))
                .times(F.when(F.pref("wide", text("worldcombat.skill.whirlwind.preference.wide")), F.const(0.85), F.const(1)))
                .clamp(4, 14).round(2),
            "风道长度", {
                unit: " 格",
                description: "风墙从施法者身前一直推到多远；速度越快推得越远，宽阔风墙会短一些。它也是本招的实际射程与瞄准距离。"
            }),
        /** 风道半径：基础 1.7 格 +（身高 − 1.4）×0.5（夹 -0.2..+1.0）；wide ×1.35；夹在 1.2..4 格。 */
        band: formula(
            F.base(1.7, "风道半径")
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 1.0))
                .times(F.when(F.pref("wide", text("worldcombat.skill.whirlwind.preference.wide")), F.const(1.35), F.const(1)))
                .clamp(1.2, 4).round(2),
            "风道半径", {
                unit: " 格",
                description: "风墙从中心向两侧展开的半径；体量越大越宽，宽阔风墙再 ×1.35。站在风道外就整发躲过。"
            }),
        /** 推进速度：基础 0.7 格/刻 +（速度 − 60）×0.004（夹 -0.1..+0.5）；夹在 0.45..1.2 格/刻。 */
        front: formula(
            F.base(0.7, "推进速度")
                .plus(F.stat("speed").minus(60).times(0.004).clamp(-0.1, 0.5))
                .clamp(0.45, 1.2).round(2),
            "推进速度", {
                unit: " 格/刻",
                description: "风墙每刻向前走多远；速度越快扫得越快，留给对手闪开的时间也越少。"
            }),
        /** 吹飞总预算：基础 1.6 格 +（体重 − 50）×0.004（夹 -0.1..+0.6）；wide ×0.9；夹在 0.8..3.8 格。 */
        blow: formula(
            F.base(1.6, "吹飞总预算")
                .plus(F.body("weight").minus(50).times(0.004).clamp(-0.1, 0.6))
                .times(F.when(F.pref("wide", text("worldcombat.skill.whirlwind.preference.wide")), F.const(0.9), F.const(1)))
                .clamp(0.8, 3.8).round(2),
            "吹飞总预算", {
                unit: " 格",
                description: "风墙推进期间，沿风向推一个目标的累计上限；身子越重的个体吹得越开，宽阔风墙略短。抗位移的目标推不动，但风照常扫过。"
            }),
        /** 风尘数量：基础 16 个 +（速度 − 60）×0.2（夹 -2..+18）；夹在 12..40 个；驱动画面里的风尘数量。 */
        motes: formula(
            F.base(16, "风尘数量")
                .plus(F.stat("speed").minus(60).times(0.2).clamp(-2, 18))
                .clamp(12, 40).round(0),
            "风尘数量", {
                unit: " 个",
                description: "风墙推进时卷起的风尘数量；速度越快越多，画面里的风尘也按它发射。"
            }),
        /** 起手：基础 10 刻 −（速度 − 60）×0.03（夹 -2..+2）；wide +2；夹在 6..16 刻。 */
        tempo: seconds(
            F.base(10, "起手")
                .minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 2))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.whirlwind.preference.wide")), F.const(2), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "把风聚到身前再推出去要多久；速度越快越早，宽阔风墙要多花几刻。"),
        /** 收招：基础 8 刻 −（速度 − 60）×0.02（夹 -2..+2）；夹在 5..12 刻。 */
        recover: seconds(
            F.base(8, "收招")
                .minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2))
                .clamp(5, 12).round(0),
            "收招", "风推完收势的时间；快的个体收得干脆。"),
        /** 冷却：基础 100 刻 − 等级 ×0.4；wide +15、窄风 −8；夹在 75..160 刻。 */
        wait: seconds(
            F.base(100, "冷却")
                .minus(F.level().times(0.4))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.whirlwind.preference.wide")), F.const(15), F.const(-8)))
                .clamp(75, 160).round(0),
            "冷却", "两次吹飞之间的等待；等级越高越熟练，宽阔风墙更久。PP 20 的代价。")
    });

    stages(whirlwindId, [
        { level: 30, values: { reach: 8.4, blow: 2.0 } },
        { level: 50, values: { reach: 10, blow: 2.6, motes: 30 } }
    ]);

    describe(whirlwindId, [
        { key: "description.0", values: ["reach","band"] },
        { key: "description.1", values: ["front", "blow"] },
        { key: "description.2", values: [] },
        { key: "description.3", values: [] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach", "tier.0.blow"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.blow"] }
    ]);
}
