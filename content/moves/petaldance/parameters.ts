/**
 * 花瓣舞 / petaldance 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：草／特殊／威力 120／命中 100／PP 10／接触／dance，
 *   目标 randomNormal，自身获得 volatile lockedmove；锁定 2～3 回合散落花瓣攻击，之后自己陷入混乱。
 *
 * 翻译：把回合制的「锁住 2～3 回合散落花瓣、然后混乱」落成**一次自驱动作里的旋舞**——
 *   原地旋转起舞，每一圈都从脚下卷起一层花瓣、向外卷成风暴，卷到的一圈敌人被割伤；舞步每转一步会漂开一点，
 *   走过的地方真的落下花瓣（`minecraft:pink_petals` 短租，到期原方块回来）。舞完自己晕头转向
 *   （共享身份 world_combat:status/confusion，载体本单元自己的 *_daze）。
 *   花瓣舞独有的读法是**隔着一段距离用特攻削一圈、还会在地面留下花瓣**：它不像大闹一番那样贴身乱挥，
 *   画面本身就是一片旋转的花瓣风暴。
 *
 * 与同族分开：逆鳞锁定一个人猛撞；大闹一番贴身乱挥把人震开；大愤慨一路喷火留火场。
 *   花瓣舞是唯一的范围特攻，也是唯一真的往世界里留下东西（花瓣）的一招。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   bloom    每圈威力：特攻定花瓣有多利，等级让舞更熟；旋舞式略收单次换更大范围。
 *   strikes  旋舞圈数：2～3 圈，特攻越高越可能多转一圈。
 *   radius   风暴半径：特攻与身高决定花瓣能卷多远，也是本招实际射程来源；旋舞式更宽。
 *   drift    旋舞步：速度决定每一圈自己漂开多少，转出一段弧。
 *   push     花瓣推挤：特攻决定把圈里人往外推多远，很轻。
 *   petals   花瓣格数：特攻派生，决定每圈在地上留下几块花瓣。
 *   linger   花瓣停留：等级与特攻决定花瓣在地上留多久。
 *   motes    花瓣点数：特攻与等级派生，表现按它发射。
 *   dazeTicks 恍惚时长：特攻与等级决定舞完晕多久，旋舞式更久。
 *   fumble   恍惚失手率：特攻决定这段时间出手被打散的概率，存进载体振幅。
 *   tempo／recover／recharge：速度决定起手／收招／冷却，旋舞式更慢。
 *
 * 配置 drift（旋舞）双向取舍：开启＝漂得更远、风暴更宽、花瓣留得更久，但起手与冷却更久、恍惚更长；
 *   关闭（原地舞）＝转在原地、收放更快、失控更短，代价是范围与留痕都收窄。两个方向各有适用局面。
 *
 * 伤害段 bloom：每一圈随精灵数据变化的那部分，走共享换算（原始类别 Special，对手特防、相性与暴击在命中时另算）。
 */
namespace PokemonSkills {
    export const petaldanceId = "petaldance";
    export const petaldanceScene = "world_combat:move_petaldance";
    export const petaldanceDaze = "world_combat:petaldance_daze";
    export const petaldanceBloomText = "world_combat.move.petaldance.text.bloom";
    export const petaldanceStepText = "world_combat.move.petaldance.text.step";
    export const petaldanceDazeText = "world_combat.move.petaldance.text.daze";
    export const petaldanceChipText = "world_combat.move.petaldance.text.chip";

    actionParameters.define(petaldanceId, {
        /** 每圈威力：基础 24，特攻每比 60 多 1 加 0.24（夹 -8..28），等级每比 20 高 1 加 0.2（夹 0..7）；旋舞 ×0.96；夹 14..74。 */
        bloom: formula(
            F.base(24)
                .plus(F.stat("specialAttack").minus(60).times(0.24).clamp(-8, 28))
                .plus(F.level().minus(20).times(0.2).clamp(0, 7))
                .times(F.when(F.pref("drift", text("worldcombat.skill.petaldance.preference.drift")), F.const(0.96), F.const(1)))
                .clamp(14, 74).round(1),
            "每圈威力", {
                unit: "威力",
                description: "每一圈花瓣风暴在范围里造成的基础特攻伤害；特攻越高花瓣越利，等级让舞步更熟。对手特防、相性与暴击在命中时另算。"
            }),
        /** 旋舞圈数：2 + (特攻 − 75) × 0.02，夹 2..3。 */
        strikes: formula(
            F.base(2).plus(F.stat("specialAttack").minus(75).times(0.02).clamp(0, 1)).clamp(2, 3).round(0),
            "旋舞圈数", {
                unit: "圈",
                description: "这一支舞一共转几圈；特攻越高的个体越容易多转一圈。"
            }),
        /** 风暴半径：基础 5.0，特攻每比 60 多 1 加 0.02（夹 -0.8..1.8），身高每比 1.4 高 1 加 0.3（夹 -0.2..0.8）；旋舞 ×1.15；夹 3.6..7.4。 */
        radius: formula(
            F.base(5.0)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.8, 1.8))
                .plus(F.body("height").minus(1.4).times(0.3).clamp(-0.2, 0.8))
                .times(F.when(F.pref("drift", text("worldcombat.skill.petaldance.preference.drift")), F.const(1.15), F.const(1)))
                .clamp(3.6, 7.4).round(2),
            "风暴半径", {
                unit: "格",
                description: "花瓣风暴能卷到多远，也是本招的实际射程来源；特攻越高、身量越大卷得越开，旋舞式更宽。"
            }),
        /** 旋舞步：基础 0.5 格，速度每比 60 快 1 加 0.006（夹 -0.15..0.45）；旋舞 ×1.3；夹 0.2..1.1。 */
        drift: formula(
            F.base(0.5).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.15, 0.45))
                .times(F.when(F.pref("drift", text("worldcombat.skill.petaldance.preference.drift")), F.const(1.3), F.const(1)))
                .clamp(0.2, 1.1).round(2),
            "旋舞步", {
                unit: "格",
                description: "每转一圈自己沿弧线漂开多远；速度快的个体转得更开，旋舞式漂得更远。"
            }),
        /** 花瓣推挤：基础 0.4，特攻每比 60 多 1 加 0.003（夹 -0.1..0.35）；夹 0.2..1.2。 */
        push: formula(
            F.base(0.4).plus(F.stat("specialAttack").minus(60).times(0.003).clamp(-0.1, 0.35)).clamp(0.2, 1.2).round(2),
            "花瓣推挤", {
                unit: "格",
                description: "花瓣风暴把人朝外推开多远；很轻，主要是把贴身的对手拨开一点。"
            }),
        /** 花瓣格数：基础 6，特攻每比 60 多 1 加 0.08（夹 -2..9）；夹 4..18。 */
        petals: formula(
            F.base(6).plus(F.stat("specialAttack").minus(60).times(0.08).clamp(-2, 9)).clamp(4, 18).round(0),
            "花瓣格数", {
                unit: "块",
                description: "每一圈在地上落下几块花瓣；特攻越高撒得越多，到期原方块回来。"
            }),
        /** 花瓣停留：基础 120 刻，等级每比 25 高 1 加 1.5 刻（夹 0..60）；旋舞 ×1.3；夹 80..260。 */
        linger: seconds(
            F.base(120).plus(F.level().minus(25).times(1.5).clamp(0, 60))
                .times(F.when(F.pref("drift", text("worldcombat.skill.petaldance.preference.drift")), F.const(1.3), F.const(1)))
                .clamp(80, 260).round(0),
            "花瓣停留", "落在地上的花瓣保留多久；等级越高留得越久，旋舞式留得更长。"),
        /** 花瓣点数：基础 18，特攻每比 60 多 1 加 0.22（夹 -5..26），等级每比 20 高 1 加 0.3（夹 0..10）；夹 12..56。 */
        motes: formula(
            F.base(18)
                .plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-5, 26))
                .plus(F.level().minus(20).times(0.3).clamp(0, 10))
                .clamp(12, 56).round(0),
            "花瓣点数", {
                unit: "点",
                description: "每一圈卷起的花瓣数量，随特攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 连舞间隔：基础 15 刻，速度每比 60 快 1 减 0.05 刻（夹 -3..7）；夹 9..24。 */
        gap: seconds(
            F.base(15).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 7)).clamp(9, 24).round(0),
            "连舞间隔", "两圈之间隔多久；速度快的个体转得更密。"),
        /** 恍惚时长：基础 135 刻，特攻每比 60 多 1 加 0.45 刻（夹 -18..65），等级每比 25 高 1 加 1.1 刻（夹 0..45）；旋舞 ×1.1；夹 95..290。 */
        dazeTicks: seconds(
            F.base(135)
                .plus(F.stat("specialAttack").minus(60).times(0.45).clamp(-18, 65))
                .plus(F.level().minus(25).times(1.1).clamp(0, 45))
                .times(F.when(F.pref("drift", text("worldcombat.skill.petaldance.preference.drift")), F.const(1.1), F.const(1)))
                .clamp(95, 290).round(0),
            "恍惚时长", "舞完之后自己晕头转向的时长；特攻越高、等级越高舞得越沉，旋舞式更久。"),
        /** 恍惚失手率：基础 29%，特攻每比 60 多 1 加 0.12%（夹 -5%..12%）；夹 20%..50%。 */
        fumble: percent(
            F.base(0.29).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.05, 0.12)).clamp(0.20, 0.50).round(3),
            "恍惚失手率", "恍惚期间每次想出手被打散的概率；特攻越高舞得越乱，越容易在晕眩里打空。"),
        /** 起手：基础 9 刻，速度每比 60 快 1 减 0.02 刻（夹 -2..3），旋舞 +2；夹 6..15。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("drift", text("worldcombat.skill.petaldance.preference.drift")), F.const(2), F.const(0)))
                .clamp(6, 15).round(0),
            "起手", "屈膝起势、花瓣先在脚下聚拢的时间；速度越快越短，旋舞式多蓄一下。"),
        /** 收招：基础 10 刻，速度每比 60 快 1 减 0.02 刻（夹 -3..4）；夹 6..16。 */
        recover: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4)).clamp(6, 16).round(0),
            "收招", "舞停站定的收势；速度越快收得越快。"),
        /** 冷却：基础 40 刻，速度每比 60 快 1 减 0.05 刻（夹 -5..9），旋舞 +8；夹 26..60。 */
        recharge: seconds(
            F.base(40).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 9))
                .plus(F.when(F.pref("drift", text("worldcombat.skill.petaldance.preference.drift")), F.const(8), F.const(0)))
                .clamp(26, 60).round(0),
            "冷却", "两支花瓣舞之间的间隔；速度越快回得越快，旋舞式更费。PP 10 的代价。")
    });

    defineDamage(petaldanceId, "bloom", {});

    stages(petaldanceId, [
        { level: 40, values: { bloom: 34 } },
        { level: 58, values: { bloom: 44, petals: 10 } }
    ]);

    describe(petaldanceId, [
        { key: "description.0", values: ["bloom", "strikes"] },
        { key: "description.1", values: ["radius", "gap", "drift", "push"] },
        { key: "description.2", values: ["petals", "linger"] },
        { key: "description.3", values: ["dazeTicks", "fumble"] },
        { key: "drift.on", values: [], when: function (context) { return read(context.detail.values, ["drift"]) === true; } },
        { key: "drift.off", values: [], when: function (context) { return read(context.detail.values, ["drift"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bloom"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bloom", "tier.1.petals"] }
    ]);
}
