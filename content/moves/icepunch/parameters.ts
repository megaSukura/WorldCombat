/**
 * 冰冻拳 / icepunch 的参数与伤害段。
 *
 * 原生事实：Ice、物理、威力 75、命中 100、PP 15、接触、拳类，命中后 10% 概率使目标冰冻
 *   （Cobblemon 1.8，全招 171 位学习者）。
 *
 * 翻译：把「充满寒气的拳头」落成**先结霜、再冻实**的两段控制拳——第一拳把寒气按进目标身上，留下一层会拖慢它的
 * 寒霜（共享身份 world_combat:status/chill，本单元自己的载体）；当目标身上已经有霜、或它本来就浸在水里时，
 * 下一拳会把那层霜一把收走、把它冻在原地（共享身份 world_combat:status/frozen，宝可梦同步为原生冰冻）。
 * 它是本族唯一的**控制**招：单点伤害最低，但能把目标按停。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   frost       拳威：物攻定拳劲，特攻定寒气；深冻式把每一拳摊薄。
 *   chillTicks  寒霜时长：特攻与等级决定拖慢多久；深冻式更久。
 *   freezeTicks 冻结时长：特攻与等级决定冻多久（在水中 ×1.5）；深冻式更久。
 *   fistReach   拳程：身高与体宽决定拳头够多远。
 *   collisionRadius 拳面判定：身高派生。
 *   jab/tempo/aftercast/recharge：速度决定出拳延迟、起手、收招与冷却。
 *   shards      冰屑数：特攻派生，表现按它发射。
 *
 * 配置 `deepfreeze`（深冻式）双向取舍：开启＝冻结时长 ×1.4、寒霜更久（×1.2），但拳威 ×0.9、冷却 +5 刻；
 * 关闭（急冻式）＝拳更重、循环更快，但控制更短。两者各有局面：锁住关键目标 / 快速循环。
 *
 * 伤害段 `frost` 走共享换算；寒霜与冻结经 `CombatStatus` 的路由落到任何战斗者身上。
 */
namespace PokemonSkills {
    actionParameters.define("icepunch", {
        /** 拳威：70 + 物攻偏移[−14,38] + 特攻偏移[−4,10]；深冻 ×0.9；夹 48..145。 */
        frost: formula(
            F.base(70).plus(F.stat("attack").minus(60).times(0.44).clamp(-14, 38))
                .plus(F.stat("specialAttack").minus(60).times(0.1).clamp(-4, 10))
                .times(F.when(F.pref("deepfreeze", text("worldcombat.skill.icepunch.preference.deepfreeze")), F.const(0.9), F.const(1)))
                .clamp(48, 145).round(1),
            "拳威", {
                unit: "威力",
                description: "这一记寒拳命中的基础威力；物攻定拳劲，特攻定寒气，深冻式把每一拳摊薄。对手防御、相性与暴击在命中时另算。"
            }),
        /** 寒霜时长：160 + 特攻偏移[−24,70] + 等级偏移[0,40]；深冻 ×1.2；夹 90..320。 */
        chillTicks: seconds(
            F.base(160).plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-24, 70))
                .plus(F.level().minus(30).times(1).clamp(0, 40))
                .times(F.when(F.pref("deepfreeze", text("worldcombat.skill.icepunch.preference.deepfreeze")), F.const(1.2), F.const(1)))
                .clamp(90, 320).round(0),
            "寒霜时长", "第一拳留下的寒霜拖慢目标的时长；特攻越高、等级越高越久，深冻式更久。"),
        /** 冻结时长：70 + 特攻偏移[−10,40] + 等级偏移[0,30]；深冻 ×1.4；夹 40..190。 */
        freezeTicks: seconds(
            F.base(70).plus(F.stat("specialAttack").minus(60).times(0.35).clamp(-10, 40))
                .plus(F.level().minus(30).times(0.75).clamp(0, 30))
                .times(F.when(F.pref("deepfreeze", text("worldcombat.skill.icepunch.preference.deepfreeze")), F.const(1.4), F.const(1)))
                .clamp(40, 190).round(0),
            "冻结时长", "目标已带寒霜、或正浸在水里时被冻结的时长（水中结算再 ×1.5）；特攻与等级派生，深冻式更久。"),
        /** 拳程：2.2 + 身高偏移[−0.2,0.6] + 体宽偏移[−0.1,0.4]；夹 2.1..3.2。 */
        fistReach: formula(
            F.base(2.2).plus(F.body("height").minus(1.4).times(0.45).clamp(-0.2, 0.6))
                .plus(F.body("width").minus(0.9).times(0.35).clamp(-0.1, 0.4))
                .clamp(2.1, 3.2).round(2),
            "拳程", {
                unit: "格",
                description: "这一记寒拳能探到的距离；臂展与身板越大够得越远。它也是本招的实际射程来源。"
            }),
        /** 拳面判定：0.45 + 身高偏移[−0.05,0.3]；夹 0.36..0.8。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.3)).clamp(0.36, 0.8).round(2),
            "拳面判定", {
                unit: "格",
                description: "出拳时拳面能扫到多大范围；个子越大判定越宽。"
            }),
        /** 出拳延迟：4 − 速度偏移[−1,2]；夹 2..7。 */
        jab: seconds(
            F.base(4).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 2)).clamp(2, 7).round(0),
            "出拳延迟", "提交到真正出拳之间的凝霜时间；速度越快出拳越急。"),
        /** 起手：6 − 速度偏移[−1.5,2.5] + 深冻 2 / 急冻 −1；夹 3..11。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("deepfreeze", text("worldcombat.skill.icepunch.preference.deepfreeze")), F.const(2), F.const(-1)))
                .clamp(3, 11).round(0),
            "起手", "拳面凝起寒霜、蓄到能提交的时间；速度越快越短，深冻式要多凝一拍。"),
        /** 收招：6 − 速度偏移[−1,2]；夹 3..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(3, 10).round(0),
            "收招", "打完这一拳后收势的时间；速度越快越短。"),
        /** 冷却：24 − 速度偏移[−4,6] + 深冻 5；夹 15..36。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("deepfreeze", text("worldcombat.skill.icepunch.preference.deepfreeze")), F.const(5), F.const(0)))
                .clamp(15, 36).round(0),
            "冷却", "两拳之间的等待；速度越快回得越快，深冻式要缓一拍。"),
        /** 冰屑数：6 + 特攻偏移[−1,6]；夹 5..14。 */
        shards: formula(
            F.base(6).plus(F.stat("specialAttack").minus(60).times(0.08).clamp(-1, 6)).clamp(5, 14).round(0),
            "冰屑数", {
                unit: "片",
                description: "结霜与冻结时迸出的冰屑数量，随特攻增长；表现按它发射，画面里的冰屑数与机制一致。"
            })
    });

    stages("icepunch", [
        { level: 32, values: { frost: 80 } },
        { level: 50, values: { frost: 92, freezeTicks: 90 } }
    ]);

    defineDamage("icepunch", "frost", {}, { contact: true, punch: true });

    describe("icepunch", [
        { key: "description.0", values: ["frost", "fistReach"] },
        { key: "description.1", values: ["chillTicks"] },
        { key: "description.2", values: ["freezeTicks"] },
        { key: "deepfreeze.on", values: [], when: function (context) { return read(context.detail.values, ["deepfreeze"]) === true; } },
        { key: "deepfreeze.off", values: [], when: function (context) { return read(context.detail.values, ["deepfreeze"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.frost"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.frost", "tier.1.freezeTicks"] }
    ]);
}
