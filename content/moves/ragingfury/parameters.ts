/**
 * 大愤慨 / ragingfury 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：火／物理／威力 120／命中 100／PP 10（无接触标记），
 *   目标 randomNormal，自身获得 volatile lockedmove；锁定 2～3 回合一边喷火一边乱打，大闹完自己陷入混乱。
 *
 * 翻译：把回合制的「锁住 2～3 回合一边喷火一边乱打、然后混乱」落成**一次自驱动作里的喷火冲锋**——
 *   一次一次朝前猛冲，沿途喷出一条火线：走廊里所有敌人都被火焰割伤并被点着，冲过的地面在落点留下一片余烬
 *   （共享 field 规则，站在里面的人持续被点燃）。冲完自己晕头转向（共享身份 world_combat:status/confusion，
 *   载体本单元自己的 *_daze）。大愤慨独有的读法是**在地面留下一片会继续烧的火场**：它不像逆鳞只认一个人，
 *   也不像花瓣舞留下无害的花瓣——留下的东西真的会伤人。
 *
 * 与同族分开：逆鳞锁定一人猛撞；大闹一番贴身乱挥把人震开；花瓣舞是留下花瓣的范围特攻。
 *   大愤慨是唯一**一路喷火、还在地上留火场**的一招。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   blaze      每段火线威力：物攻给狠度，等级让火更旺；烈焰式略收单次换更大火场。
 *   strikes    冲锋段数：2～3 段，物攻越高越可能多冲一段。
 *   reach      冲锋距离：速度决定冲多远，也是本招实际射程来源；烈焰式收得更短。
 *   lunge      冲进距离：速度决定每一步垫多少。
 *   radius     火线半宽：碰撞箱宽高决定火舌多宽。
 *   push       冲撞推挤：物攻决定把火线里的人往外推多远。
 *   emberRadius 余烬半径：物攻与身高决定落点火场多大；烈焰式更大。
 *   emberTicks 余烬时长：等级决定火场烧多久；烈焰式更久。
 *   igniteTicks 点燃时长：火线命中与火场里的人被点着多久；烈焰式更久。
 *   sparks     火星数：物攻与等级派生，表现按它发射。
 *   dazeTicks  恍惚时长：物攻与等级决定冲完晕多久，烈焰式更久。
 *   fumble     恍惚失手率：物攻决定这段时间出手被打散的概率，存进载体振幅。
 *   tempo／recover／recharge：速度决定起手／收招／冷却，烈焰式更慢。
 *
 * 配置 inferno（烈焰）双向取舍：开启＝火场更大更久、点燃更久，但冲锋更短、起手与冷却更久、恍惚更长；
 *   关闭（奔袭）＝冲得更远、节奏更快、失控更短，代价是留下的火场更小更短。两个方向各有适用局面。
 *
 * 伤害段 blaze：每一段火线随精灵数据变化的那部分，走共享换算（对手防御、相性与暴击在命中时另算）。
 */
namespace PokemonSkills {
    export const ragingfuryId = "ragingfury";
    export const ragingfuryScene = "world_combat:move_ragingfury";
    export const ragingfuryDaze = "world_combat:ragingfury_daze";
    export const ragingfuryField = "world_combat:ragingfury/ember";
    export const ragingfuryChargeText = "world_combat.move.ragingfury.text.charge";
    export const ragingfuryEmberText = "world_combat.move.ragingfury.text.ember";
    export const ragingfuryDazeText = "world_combat.move.ragingfury.text.daze";
    export const ragingfuryChipText = "world_combat.move.ragingfury.text.chip";

    actionParameters.define(ragingfuryId, {
        /** 每段威力：基础 26，物攻每比 60 多 1 加 0.26（夹 -8..28），等级每比 20 高 1 加 0.22（夹 0..8）；烈焰 ×0.96；夹 16..76。 */
        blaze: formula(
            F.base(26)
                .plus(F.stat("attack").minus(60).times(0.26).clamp(-8, 28))
                .plus(F.level().minus(20).times(0.22).clamp(0, 8))
                .times(F.when(F.pref("inferno", text("worldcombat.skill.ragingfury.preference.inferno")), F.const(0.96), F.const(1)))
                .clamp(16, 76).round(1),
            "每段威力", {
                unit: "威力",
                description: "一次喷火冲锋在火线里造成的基础威力；物攻越高火越狠，等级让火烧得更旺。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲锋段数：2 + (物攻 − 75) × 0.02，夹 2..3。 */
        strikes: formula(
            F.base(2).plus(F.stat("attack").minus(75).times(0.02).clamp(0, 1)).clamp(2, 3).round(0),
            "冲锋段数", {
                unit: "段",
                description: "这一阵一共朝前喷火冲几次；物攻越高的个体越容易多冲一段。"
            }),
        /** 冲锋距离：基础 4.4，速度每比 60 快 1 加 0.02（夹 -1.2..2.2），身高每比 1.4 高 1 加 0.1（夹 -0.2..0.5）；烈焰 ×0.9；夹 3.0..6.2。 */
        reach: formula(
            F.base(4.4)
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-1.2, 2.2))
                .plus(F.body("height").minus(1.4).times(0.1).clamp(-0.2, 0.5))
                .times(F.when(F.pref("inferno", text("worldcombat.skill.ragingfury.preference.inferno")), F.const(0.9), F.const(1)))
                .clamp(3.0, 6.2).round(2),
            "冲锋距离", {
                unit: "格",
                description: "一次喷火冲锋能覆盖多远，也是本招的实际射程来源；速度与身量决定冲得远不远，烈焰式冲得短一些。"
            }),
        /** 冲进距离：基础 1.3，速度每比 60 快 1 加 0.01（夹 -0.4..0.8）；夹 0.9..2.4。 */
        lunge: formula(
            F.base(1.3).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.4, 0.8)).clamp(0.9, 2.4).round(2),
            "冲进距离", {
                unit: "格",
                description: "每一段冲锋前先垫进去的短距；速度快的个体贴得更紧。"
            }),
        /** 火线半宽：基础 0.7，碰撞箱每比 0.9 宽 1 加 0.4（夹 -0.1..0.4），身高每比 1.4 高 1 加 0.12（夹 -0.05..0.25）；夹 0.55..1.15。 */
        radius: formula(
            F.base(0.7)
                .plus(F.body("width").minus(0.9).times(0.4).clamp(-0.1, 0.4))
                .plus(F.body("height").minus(1.4).times(0.12).clamp(-0.05, 0.25))
                .clamp(0.55, 1.15).round(2),
            "火线半宽", {
                unit: "格",
                description: "喷出的火线有多宽；身板越宽大火焰越铺得开，画面里的火舌宽度与它一致。"
            }),
        /** 冲撞推挤：基础 0.7，物攻每比 60 多 1 加 0.005（夹 -0.15..0.75）；夹 0.35..1.9。 */
        push: formula(
            F.base(0.7).plus(F.stat("attack").minus(60).times(0.005).clamp(-0.15, 0.75)).clamp(0.35, 1.9).round(2),
            "冲撞推挤", {
                unit: "格",
                description: "火线里的人被冲势往外推多远；物攻越高推得越开。"
            }),
        /** 余烬半径：基础 2.2，物攻每比 60 多 1 加 0.01（夹 -0.4..1.4），身高每比 1.4 高 1 加 0.2（夹 -0.1..0.7）；烈焰 ×1.3；夹 1.4..4.2。 */
        emberRadius: formula(
            F.base(2.2)
                .plus(F.stat("attack").minus(60).times(0.01).clamp(-0.4, 1.4))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.1, 0.7))
                .times(F.when(F.pref("inferno", text("worldcombat.skill.ragingfury.preference.inferno")), F.const(1.3), F.const(1)))
                .clamp(1.4, 4.2).round(2),
            "余烬半径", {
                unit: "格",
                description: "每一段冲锋落点留下的火场多大；物攻越高、身量越大火场越广，烈焰式更大。站在里面的敌人会被持续点燃。"
            }),
        /** 余烬时长：基础 60 刻，等级每比 25 高 1 加 1.4 刻（夹 0..55）；烈焰 ×1.4；夹 40..170。 */
        emberTicks: seconds(
            F.base(60).plus(F.level().minus(25).times(1.4).clamp(0, 55))
                .times(F.when(F.pref("inferno", text("worldcombat.skill.ragingfury.preference.inferno")), F.const(1.4), F.const(1)))
                .clamp(40, 170).round(0),
            "余烬时长", "落点火场烧多久；等级越高烧得越久，烈焰式更久。"),
        /** 点燃时长：基础 50 刻，物攻每比 60 多 1 加 0.2 刻（夹 -10..30）；烈焰 ×1.3；夹 30..120。 */
        igniteTicks: seconds(
            F.base(50).plus(F.stat("attack").minus(60).times(0.2).clamp(-10, 30))
                .times(F.when(F.pref("inferno", text("worldcombat.skill.ragingfury.preference.inferno")), F.const(1.3), F.const(1)))
                .clamp(30, 120).round(0),
            "点燃时长", "被火线命中或被火场烧到的人会着火多久；物攻越高烧得越久，烈焰式更久。"),
        /** 火星数：基础 16，物攻每比 60 多 1 加 0.16（夹 -4..22），等级每比 20 高 1 加 0.25（夹 0..9）；夹 12..52。 */
        sparks: formula(
            F.base(16)
                .plus(F.stat("attack").minus(60).times(0.16).clamp(-4, 22))
                .plus(F.level().minus(20).times(0.25).clamp(0, 9))
                .clamp(12, 52).round(0),
            "火星数", {
                unit: "点",
                description: "喷火冲锋迸出的火星数量，随物攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 连冲间隔：基础 15 刻，速度每比 60 快 1 减 0.05 刻（夹 -3..7）；夹 9..24。 */
        gap: seconds(
            F.base(15).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 7)).clamp(9, 24).round(0),
            "连冲间隔", "两段喷火冲锋之间隔多久；速度快的个体接得更紧。"),
        /** 恍惚时长：基础 140 刻，物攻每比 60 多 1 加 0.45 刻（夹 -18..65），等级每比 25 高 1 加 1.1 刻（夹 0..45）；烈焰 ×1.15；夹 95..300。 */
        dazeTicks: seconds(
            F.base(140)
                .plus(F.stat("attack").minus(60).times(0.45).clamp(-18, 65))
                .plus(F.level().minus(25).times(1.1).clamp(0, 45))
                .times(F.when(F.pref("inferno", text("worldcombat.skill.ragingfury.preference.inferno")), F.const(1.15), F.const(1)))
                .clamp(95, 300).round(0),
            "恍惚时长", "大闹之后自己晕头转向的时长；物攻越高、等级越高闹得越久，烈焰式更久。"),
        /** 恍惚失手率：基础 30%，物攻每比 60 多 1 加 0.12%（夹 -5%..12%）；夹 20%..50%。 */
        fumble: percent(
            F.base(0.30).plus(F.stat("attack").minus(60).times(0.0012).clamp(-0.05, 0.12)).clamp(0.20, 0.50).round(3),
            "恍惚失手率", "恍惚期间每次想出手被打散的概率；物攻越高闹得越凶，越容易在晕眩里打空。"),
        /** 起手：基础 8 刻，速度每比 60 快 1 减 0.02 刻（夹 -3..4），烈焰 +2；夹 5..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("inferno", text("worldcombat.skill.ragingfury.preference.inferno")), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "压低身体、喉头聚起火的时间；速度越快越短，烈焰式要先烧旺。"),
        /** 收招：基础 10 刻，速度每比 60 快 1 减 0.02 刻（夹 -3..4）；夹 6..16。 */
        recover: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4)).clamp(6, 16).round(0),
            "收招", "冲完站稳的收势；速度越快收得越快。"),
        /** 冷却：基础 44 刻，速度每比 60 快 1 减 0.05 刻（夹 -5..9），烈焰 +8；夹 28..66。 */
        recharge: seconds(
            F.base(44).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 9))
                .plus(F.when(F.pref("inferno", text("worldcombat.skill.ragingfury.preference.inferno")), F.const(8), F.const(0)))
                .clamp(28, 66).round(0),
            "冷却", "两次大愤慨之间的间隔；速度越快回得越快，烈焰式更费。PP 10 的代价。")
    });

    defineDamage(ragingfuryId, "blaze", {});

    stages(ragingfuryId, [
        { level: 42, values: { blaze: 34 } },
        { level: 60, values: { blaze: 44, emberRadius: 2.6 } }
    ]);

    describe(ragingfuryId, [
        { key: "description.0", values: ["blaze","strikes"] },
        { key: "description.1", values: ["reach","lunge","gap","radius","push"] },
        { key: "description.2", values: ["emberRadius","emberTicks","igniteTicks"] },
        { key: "description.3", values: ["dazeTicks","fumble"] },
        { key: "inferno.on", values: [], when: function (context) { return read(context.detail.values, ["inferno"]) === true; } },
        { key: "inferno.off", values: [], when: function (context) { return read(context.detail.values, ["inferno"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blaze"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blaze", "tier.1.emberRadius"] }
    ]);
}
