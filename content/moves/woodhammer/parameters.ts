/**
 * 木槌 / woodhammer 的参数与伤害段。
 *
 * 原生事实：草、物理、威力 120、命中 100、PP 15、接触、反作用力 1/3（Cobblemon 1.8，16 位学习者）。
 * 翻译：把“用坚硬的躯体撞击对手”落成一次**把身体硬化成木槌、从上方砸下的重击**——
 * 起手把躯体绷硬、抬起，提交后整个人向目标砸下去，落地的一刻把地面也震裂；
 * 被砸实的人被压得踉跄（速度下降），代价是那一震顺着坚硬的身体回到自己身上。
 *
 * 与同族分开：舍身冲撞是横向猛撞、撞完双方被弹开；勇鸟猛攻是一条长俯冲线穿过目标；
 * 波动冲裹水撞人。木槌是这一族里**最慢、最重、唯一把地面砸裂**的一招，也是唯一按“坚硬躯体”让防御
 * 直接参与威力的：身体越硬砸得越狠、反震却越轻。玩家凭“砸出一圈碎石与地裂”认出它。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   timber          砸击威力：物攻给狠度，防御把“坚硬躯体”压进去；扎根式再抬一档。
 *   reach           砸击距离：碰撞箱高度决定身体前倾能够到多远；也是本招射程基准。
 *   rise            抬身高度：碰撞箱高度与体重决定抬起多高；扎根式抬得更高。
 *   pace            下砸速度：速度决定砸下多快。
 *   collisionRadius 判定半径：碰撞箱高度决定砸面多大。
 *   recoil          反伤比例：防御越高越轻（硬体吸震）、体重越大越沉；扎根式把冲击全吃下。
 *   shove           击退：体重与物攻决定把人砸飞多远；扎根式更远。
 *   stagger         踉跄级数：基础 1，等级 55 台阶 2。
 *   splinters       木屑数量：物攻与体重派生，表现按它发射。
 *   cracks/crackTicks  地裂数量与寿命：体重与等级决定砸裂多大一片、留多久。
 *   tempo/aftercast/recharge  速度决定起手/收招/冷却；扎根式更慢。
 * 配置 root（扎根式）双向取舍：开启＝威力、击退与地裂都更大，但反伤更重、起手与收招更慢；
 * 关闭（开山式）＝更快的挥砸，威力与地裂收一档。两个方向各有适用局面（重击+威慑 vs 见效+追击）。
 *
 * 伤害段 timber：这一砸随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("woodhammer", {
        /** 砸击威力：基础 120，物攻每比 60 多 1 加 0.45（上限 +50），防御每比 60 多 1 加 0.35（上限 +42）；扎根 ×1.1；夹在 70..240。 */
        timber: formula(
            F.base(120).plus(F.stat("attack").minus(60).times(0.45).clamp(-28, 50))
                .plus(F.stat("defence").minus(60).times(0.35).clamp(-20, 42))
                .times(F.when(F.pref("root", text("worldcombat.skill.woodhammer.preference.root")), F.const(1.1), F.const(1)))
                .clamp(70, 240).round(1),
            "砸击威力", {
                unit: "威力",
                description: "硬化躯体砸实这一下的基础威力；物攻越高越狠，而“坚硬躯体”让防御也直接参与威力，扎根式再抬一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 砸击距离：基础 2.6 格，高度每比 1.4 高 1 格加 0.35；夹在 2.0..4.2。 */
        reach: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.35).clamp(-0.25, 0.9)).clamp(2.0, 4.2).round(2),
            "砸击距离", {
                unit: "格",
                description: "抬起身体前倾能够到的距离，也是本招的射程基准；身架越高大够得越远。"
            }),
        /** 抬身高度：基础 1.0 格，高度每比 1.4 高 1 格加 0.35，体重每比 60 多 1 加 0.002；扎根 ×1.15；夹在 0.6..1.8。 */
        rise: formula(
            F.base(1.0).plus(F.body("height").minus(1.4).times(0.35).clamp(-0.2, 0.7))
                .plus(F.body("weight").minus(60).times(0.002).clamp(-0.1, 0.3))
                .times(F.when(F.pref("root", text("worldcombat.skill.woodhammer.preference.root")), F.const(1.15), F.const(1)))
                .clamp(0.6, 1.8).round(2),
            "抬身高度", {
                unit: "格",
                description: "把硬化躯体抬起多高再砸下；抬得越高落得越沉，扎根式抬得更高。"
            }),
        /** 下砸速度：基础 0.9 格/刻，速度每比 60 快 1 加 0.005；夹在 0.65..1.4。 */
        pace: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.2, 0.5)).clamp(0.65, 1.4).round(2),
            "下砸速度", {
                unit: "格/刻",
                description: "躯体砸下时每刻的位移；越快越难被让开。"
            }),
        /** 判定半径：基础 0.62 格加碰撞箱高度 ×0.2；夹在 0.5..1.1。 */
        collisionRadius: formula(
            F.base(0.62).plus(F.body("height").minus(1.4).times(0.2)).clamp(0.5, 1.1).round(2),
            "判定半径", {
                unit: "格",
                description: "整副躯体砸下的横向判定半径；身架越大砸面越宽。"
            }),
        /** 反伤比例：基础 0.32，防御每比 60 多 1 少 0.0007（上限 −0.16），体重每比 60 多 1 加 0.0008（上限 +0.1）；扎根 ×1.1；夹在 0.16..0.5。 */
        recoil: formula(
            F.base(0.32).minus(F.stat("defence").minus(60).times(0.0007).clamp(0, 0.16))
                .plus(F.body("weight").minus(60).times(0.0008).clamp(-0.04, 0.1))
                .times(F.when(F.pref("root", text("worldcombat.skill.woodhammer.preference.root")), F.const(1.1), F.const(1)))
                .clamp(0.16, 0.5).round(3),
            "反伤比例", {
                unit: "比例",
                description: "命中后按实际伤害反震自己的比例；坚硬的躯体吸震，防御越高越轻，体重越大越沉，扎根式把冲击全吃下。"
            }),
        /** 击退：基础 0.7 格，体重每比 60 多 1 加 0.004（上限 +0.8），物攻每比 60 多 1 加 0.002（上限 +0.4）；扎根 ×1.15；夹在 0.35..2.2。 */
        shove: formula(
            F.base(0.7).plus(F.body("weight").minus(60).times(0.004).clamp(-0.25, 0.8))
                .plus(F.stat("attack").minus(60).times(0.002).clamp(-0.15, 0.4))
                .times(F.when(F.pref("root", text("worldcombat.skill.woodhammer.preference.root")), F.const(1.15), F.const(1)))
                .clamp(0.35, 2.2).round(2),
            "击退", {
                unit: "格",
                description: "命中后把目标砸飞多远；越重、物攻越高砸得越远，扎根式更狠。"
            }),
        /** 踉跄级数：基础 1，夹 1..2；等级 55 台阶抬到 2。 */
        stagger: formula(F.base(1).clamp(1, 2).round(0), "踉跄级数", {
            unit: "级",
            description: "命中后被砸得踉跄、速度下降的等级；高等级个体一记就能压两级。脱战后同样消退。"
        }),
        /** 木屑数量：基础 24，物攻每比 60 多 1 加 0.2（夹 -6..16），体重每比 60 多 1 加 0.15（夹 -5..14）；夹在 16..72。 */
        splinters: formula(
            F.base(24).plus(F.stat("attack").minus(60).times(0.2).clamp(-6, 16))
                .plus(F.body("weight").minus(60).times(0.15).clamp(-5, 14))
                .clamp(16, 72).round(0),
            "木屑数量", {
                unit: "个",
                description: "砸击与地裂扬起的木屑碎石数量，随物攻与体重增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 地裂数量：基础 10，体重每比 60 多 1 加 0.08（夹 -2..10），等级每比 40 高 1 加 0.08（夹 -2..12）；夹在 6..26。 */
        cracks: formula(
            F.base(10).plus(F.body("weight").minus(60).times(0.08).clamp(-2, 10))
                .plus(F.level().minus(40).times(0.08).clamp(-2, 12))
                .clamp(6, 26).round(0),
            "地裂数量", {
                unit: "块",
                description: "落点周围被砸裂的地表方块数量；身体越沉、等级越高砸裂得越广。地裂会停留一会儿再恢复。"
            }),
        /** 地裂寿命：基础 80 刻，体重每比 60 多 1 加 0.6 刻，扎根 +20 刻；夹在 60..160。 */
        crackTicks: seconds(
            F.base(80).plus(F.body("weight").minus(60).times(0.6).clamp(-10, 30))
                .plus(F.when(F.pref("root", text("worldcombat.skill.woodhammer.preference.root")), F.const(20), F.const(0)))
                .clamp(60, 160).round(0),
            "地裂寿命", "砸裂的地表停留多久；越沉、扎根式留得越久。"),
        /** 起手：基础 12 刻，速度每比 60 快 1 减 0.02 刻，扎根 +3 刻；夹在 8..18。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("root", text("worldcombat.skill.woodhammer.preference.root")), F.const(3), F.const(0)))
                .clamp(8, 18).round(0),
            "起手", "把躯体绷硬、抬起的时长；这一招最慢，但每一记也最重，扎根式还要多蓄一点。"),
        /** 收招：基础 12 刻，速度每比 60 快 1 减 0.03 刻，扎根 +3 刻；夹在 8..20。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-4, 5))
                .plus(F.when(F.pref("root", text("worldcombat.skill.woodhammer.preference.root")), F.const(3), F.const(0)))
                .clamp(8, 20).round(0),
            "收招", "把砸进地面的身体拔起来、站稳的收势；扎根式更慢。"),
        /** 冷却：基础 50 刻，速度每比 60 快 1 减 0.05 刻，扎根 +8 刻；夹在 34..78。 */
        recharge: seconds(
            F.base(50).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 10))
                .plus(F.when(F.pref("root", text("worldcombat.skill.woodhammer.preference.root")), F.const(8), F.const(0)))
                .clamp(34, 78).round(0),
            "冷却", "再次抬身前的间隔；速度越快回得越快，扎根式缓得更久。"),
        minimumMove: hidden(0.05)
    });

    stages("woodhammer", [
        { level: 40, values: { timber: 132 } },
        { level: 55, values: { timber: 150, stagger: 2 } }
    ]);

    defineDamage("woodhammer", "timber", { defenceCoefficient: 0.0056,
        rationale: "钝重的木槌把力量压过护甲，防御减伤更弱，让体型与等级差更明显。" }, { contact: true });

    describe("woodhammer", [
        { key: "description.0", values: ["timber", "reach", "rise", "collisionRadius"] },
        { key: "description.1", values: ["recoil", "shove", "stagger", "cracks"] },
        { key: "root.on", values: [], when: function (context) { return read(context.detail.values, ["root"]) === true; } },
        { key: "root.off", values: [], when: function (context) { return read(context.detail.values, ["root"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.timber"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.timber", "tier.1.stagger"] }
    ]);
}
