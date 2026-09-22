/**
 * 火焰踢 / blazekick 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Fire／物理／威力 85／命中 90／PP 10／接触／critRatio 2／10% 使目标灼伤；
 *   17 位学习者。原生描述：「攻击对手后，有时会使其陷入灼伤状态。也容易击中要害。」
 *
 * 翻译：把「一记火焰踢」落成**拧身而起的一记上挑回旋踢**——施法者把身体拧起来，裹火的腿沿一条上扬的弧线挑过去，
 *   把对手**踢得离地**，火顺着弧线舔上伤口。它是本族唯一**把人踢起来**的：命中的人被挑到空中一小段，
 *   在落地前动不了手；火则按概率留在身上持续掉血并减攻。
 *
 * 与同族分开：火焰拳是直拳点火、火会蔓延到旁边的人；闪焰冲锋是整身撞过去、自己也受反震；火焰踢是单腿的上挑弧线，
 *   形状是那道从身后挑到身前的火弧，代价是这一脚不重、把人挑起来才是它的价值。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   kick       踢击威力：物攻定腿劲，速度把拧身的势能加进去；烈焰式把每一脚摊薄。
 *   reach      踢程：速度与身高决定腿能挑多远；也是本招射程基准。
 *   arc        火弧张开：碰撞箱高度与宽度决定那道弧线有多大。
 *   burnChance 点燃概率：特攻（火候）与物攻（踢得实）派生；烈焰式更高。
 *   burnTicks  灼伤时长：特攻与等级派生。
 *   launch     踢起高度：速度决定挑得多高；烈焰式再抬一档。
 *   embers     火星数：特攻派生，表现按它发射。
 *   tempo/settle/recharge：速度与等级决定起手、收招与冷却。
 * 配置 ignite（烈焰式）双向取舍：开启＝点燃概率 +12%%、灼伤 ×1.2、踢起更高，但踢击 ×0.88、冷却 +4 刻；
 * 关闭（重踢式）＝踢得更重、循环更快，但火更难留、挑得略低。
 *
 * 伤害段 kick：这一脚随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("blazekick", {
        /** 踢击威力：基础 85，物攻每比 60 多 1 加 0.38（夹 -12..30），速度每比 60 快 1 加 0.16（夹 -6..16）；烈焰 ×0.88；夹 58..150。 */
        kick: formula(
            F.base(85).plus(F.stat("attack").minus(60).times(0.38).clamp(-12, 30))
                .plus(F.stat("speed").minus(60).times(0.16).clamp(-6, 16))
                .times(F.when(F.pref("ignite", text("worldcombat.skill.blazekick.preference.ignite")), F.const(0.88), F.const(1)))
                .clamp(58, 150).round(1),
            "踢击威力", {
                unit: "威力",
                description: "这一脚踢实在目标身上的基础威力；物攻定腿劲、速度加拧身的势能，烈焰式把每一脚摊薄。对手防御、相性与暴击在命中时另算。"
            }),
        /** 踢程：基础 2.4 格，速度每比 60 快 1 加 0.012（夹 -0.3..0.55），身高每比 1.4 高 1 加 0.18（夹 -0.12..0.45）；夹 2.1..3.4。 */
        reach: formula(
            F.base(2.4).plus(F.stat("speed").minus(60).times(0.012).clamp(-0.3, 0.55))
                .plus(F.body("height").minus(1.4).times(0.18).clamp(-0.12, 0.45))
                .clamp(2.1, 3.4).round(2),
            "踢程", {
                unit: "格",
                description: "裹火的腿能挑到的距离；速度与身高决定腿能伸多远。它也是本招的实际射程。"
            }),
        /** 火弧张开：基础 0.75 格，高度每比 1.4 高 1 加 0.25（夹 -0.15..0.6），体宽每比 0.9 宽 1 加 0.2（夹 -0.1..0.4）；夹 0.6..1.5。 */
        arc: formula(
            F.base(0.75).plus(F.body("height").minus(1.4).times(0.25).clamp(-0.15, 0.6))
                .plus(F.body("width").minus(0.9).times(0.2).clamp(-0.1, 0.4))
                .clamp(0.6, 1.5).round(2),
            "火弧张开", {
                unit: "格",
                description: "腿挑出的那道火弧张开多大；身架越大弧线越张，画面里的火带也越宽。"
            }),
        /** 点燃概率：基础 0.10，特攻每比 60 多 1 加 0.0018（夹 -0.04..0.22），物攻每比 60 多 1 加 0.0008（夹 -0.02..0.1）；烈焰 +0.12；夹 0.06..0.6。 */
        burnChance: percent(
            F.base(0.10).plus(F.stat("specialAttack").minus(60).times(0.0018).clamp(-0.04, 0.22))
                .plus(F.stat("attack").minus(60).times(0.0008).clamp(-0.02, 0.1))
                .plus(F.when(F.pref("ignite", text("worldcombat.skill.blazekick.preference.ignite")), F.const(0.12), F.const(0)))
                .clamp(0.06, 0.6),
            "点燃概率", "命中后把目标点着的概率；特攻越高火候越足、物攻越高踢得越实，烈焰式高出一截。"),
        /** 灼伤时长：基础 160 刻，特攻每比 60 多 1 加 0.5（夹 -20..70），等级每比 30 高 1 加 1.6（夹 0..70）；烈焰 ×1.2；夹 100..320。 */
        burnTicks: seconds(
            F.base(160).plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-20, 70))
                .plus(F.level().minus(30).times(1.6).clamp(0, 70))
                .times(F.when(F.pref("ignite", text("worldcombat.skill.blazekick.preference.ignite")), F.const(1.2), F.const(1)))
                .clamp(100, 320).round(0),
            "灼伤时长", "目标被点着后持续燃烧的时长；特攻越高、等级越高烧得越久，烈焰式更久。"),
        /** 踢起高度：基础 0.8 格，速度每比 60 快 1 加 0.01（夹 -0.2..0.4）；烈焰 ×1.1；夹 0.4..1.6。 */
        launch: formula(
            F.base(0.8).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.2, 0.4))
                .times(F.when(F.pref("ignite", text("worldcombat.skill.blazekick.preference.ignite")), F.const(1.1), F.const(1)))
                .clamp(0.4, 1.6).round(2),
            "踢起高度", {
                unit: "格",
                description: "这一脚把目标挑离地面多高；速度越快挑得越高，落地前它动不了手。烈焰式再抬一档。"
            }),
        /** 火星数：基础 14，特攻每比 60 多 1 加 0.16（夹 -4..18）；夹 10..36。 */
        embers: formula(
            F.base(14).plus(F.stat("specialAttack").minus(60).times(0.16).clamp(-4, 18)).clamp(10, 36).round(0),
            "火星数", {
                unit: "颗",
                description: "踢中时甩出的火星数量，随特攻增长；表现按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 7 刻，速度每比 60 快 1 减 0.03（夹 -1..2.5），烈焰 +2；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 2.5))
                .plus(F.when(F.pref("ignite", text("worldcombat.skill.blazekick.preference.ignite")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "拧身、把火裹上腿再踢出去的时间；速度越快越短，烈焰式多烧一拍。"),
        /** 收招：基础 7 刻，速度每比 60 快 1 减 0.02（夹 -1..2）；夹 4..11。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(4, 11).round(0),
            "收招", "踢完落回架势的时间。"),
        /** 冷却：基础 22 刻，速度每比 60 快 1 减 0.05（夹 -2..4），烈焰 +4；夹 13..34。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.05).clamp(-2, 4))
                .plus(F.when(F.pref("ignite", text("worldcombat.skill.blazekick.preference.ignite")), F.const(4), F.const(0)))
                .clamp(13, 34).round(0),
            "冷却", "两次火焰踢之间的等待；速度越快回得越快，烈焰式缓得更久。")
    });

    defineDamage("blazekick", "kick", {}, { contact: true });

    stages("blazekick", [
        { level: 30, values: { kick: 94 } },
        { level: 48, values: { kick: 106, burnChance: 0.22 } }
    ]);

    describe("blazekick", [
        { key: "description.0", values: ["kick", "reach"] },
        { key: "description.1", values: ["launch", "arc"] },
        { key: "description.2", values: ["burnChance", "burnTicks", "embers"] },
        { key: "ignite.on", values: [], when: function (context) { return read(context.detail.values, ["ignite"]) === true; } },
        { key: "ignite.off", values: [], when: function (context) { return read(context.detail.values, ["ignite"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.kick"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.kick", "tier.1.burnChance"] }
    ]);
}
