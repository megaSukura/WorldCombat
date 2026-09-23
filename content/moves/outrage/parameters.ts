/**
 * 逆鳞 / outrage 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：龙／物理／威力 120／命中 100／PP 10／接触，
 *   目标 randomNormal，自身获得 volatile lockedmove；锁定 2～3 回合连续出手，大闹完自己陷入混乱。
 *
 * 翻译：把回合制的「锁住 2～3 回合乱打一气、然后混乱」落成**一次自驱动作里的接连冲撞**——
 *   低头锁定一个对手，一次一次地撞过去；每撞中一次，龙气就更盛一分，最后一下是把所有怒气都压进去的终结。
 *   撞完龙自己也晕头转向（共享身份 world_combat:status/confusion，载体本单元自己的 *_daze）。
 *   逆鳞独有的读法是**锁定一个人**：它只认最初盯上的那个对手，撞飞了再追上去撞；只要目标活着，怒气就冲它去。
 *
 * 与同族分开：大闹一番是原地乱挥、罩住身边所有人；花瓣舞是散落花瓣的范围特攻；大愤慨是一路喷火、在地面留下火场。
 *   逆鳞是唯一**只打一个目标、还会把目标撞开再追上**的。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   claw     每撞威力：物攻给狠度，等级让怒气更深；配置 relentless 略收单次换更远追击。
 *   strikes  连撞次数：2～3 次，物攻越高越可能多撞一次。
 *   reach    冲撞距离：速度决定贴得多远，也是本招实际射程来源；身高加成，穷追式更远。
 *   lunge    冲进距离：速度决定这一步向前垫多少。
 *   radius   判定半径：碰撞箱宽高决定撞面大小。
 *   push     击退：物攻决定把目标顶多远；穷追式顶得更狠。
 *   finisher 终结倍率：最后一撞的额外倍率，物攻越高终结越重。
 *   dazeTicks 恍惚时长：物攻与等级决定撞完晕多久，穷追式更久。
 *   fumble   恍惚失手率：物攻决定这段时间出手被打散的概率，存进载体振幅。
 *   grains   龙气点数：物攻派生，表现按它发射。
 *   tempo／recover／recharge：速度决定起手／收招／冷却，穷追式更慢。
 *
 * 配置 relentless（穷追）双向取舍：开启＝冲得更远、把目标顶得更狠、终结更重，但起手与冷却更久、恍惚也更长；
 *   关闭（疾撞）＝贴得更近、节奏更快、失控更短，代价是够不到远处的目标。两个方向各有适用局面。
 *
 * 伤害段 claw：这一撞随精灵数据变化的那部分，走共享换算（对手防御、相性与暴击在命中时另算）。
 */
namespace PokemonSkills {
    export const outrageId = "outrage";
    export const outrageScene = "world_combat:move_outrage";
    export const outrageDaze = "world_combat:outrage_daze";
    export const outrageChargeText = "world_combat.move.outrage.text.charge";
    export const outrageHitText = "world_combat.move.outrage.text.hit";
    export const outrageFinisherText = "world_combat.move.outrage.text.finisher";
    export const outrageDazeText = "world_combat.move.outrage.text.daze";
    export const outrageChipText = "world_combat.move.outrage.text.chip";

    actionParameters.define(outrageId, {
        /** 每撞威力：基础 34，物攻每比 60 多 1 加 0.32（夹 -10..34），等级每比 20 高 1 加 0.25（夹 0..8）；穷追 ×0.97；夹 20..86。 */
        claw: formula(
            F.base(34)
                .plus(F.stat("attack").minus(60).times(0.32).clamp(-10, 34))
                .plus(F.level().minus(20).times(0.25).clamp(0, 8))
                .times(F.when(F.pref("relentless", text("worldcombat.skill.outrage.preference.relentless")), F.const(0.97), F.const(1)))
                .clamp(20, 86).round(1),
            "每撞威力", {
                unit: "威力",
                description: "一次低头冲撞撞实的基础威力；物攻越高撞得越重，等级让怒气更深。最后一次另乘终结倍率。对手防御、相性与暴击在命中时另算。"
            }),
        /** 连撞次数：2 + (物攻 − 75) × 0.02，夹 2..3。 */
        strikes: formula(
            F.base(2).plus(F.stat("attack").minus(75).times(0.02).clamp(0, 1)).clamp(2, 3).round(0),
            "连撞次数", {
                unit: "次",
                description: "这一阵乱撞一共撞几次；物攻越高的个体越容易多撞一次。最后一次是终结撞。"
            }),
        /** 冲撞距离：基础 4.6，速度每比 60 快 1 加 0.02（夹 -1.2..2.2），身高每比 1.4 高 1 加 0.1（夹 -0.2..0.5）；穷追 ×1.12；夹 3.0..7.0。 */
        reach: formula(
            F.base(4.6)
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-1.2, 2.2))
                .plus(F.body("height").minus(1.4).times(0.1).clamp(-0.2, 0.5))
                .times(F.when(F.pref("relentless", text("worldcombat.skill.outrage.preference.relentless")), F.const(1.12), F.const(1)))
                .clamp(3.0, 7.0).round(2),
            "冲撞距离", {
                unit: "格",
                description: "一次冲撞能贴到多远，也是本招的实际射程来源；速度与身量决定够不够得着，穷追式冲得更远。"
            }),
        /** 冲进距离：基础 1.2，速度每比 60 快 1 加 0.01（夹 -0.4..0.8）；夹 0.8..2.2。 */
        lunge: formula(
            F.base(1.2).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.4, 0.8)).clamp(0.8, 2.2).round(2),
            "冲进距离", {
                unit: "格",
                description: "每一撞前先垫进去的短距；速度快的个体贴得更紧。"
            }),
        /** 判定半径：基础 0.6，碰撞箱每比 0.9 宽 1 加 0.4（夹 -0.1..0.35），身高每比 1.4 高 1 加 0.12（夹 -0.05..0.2）；夹 0.5..0.95。 */
        radius: formula(
            F.base(0.6)
                .plus(F.body("width").minus(0.9).times(0.4).clamp(-0.1, 0.35))
                .plus(F.body("height").minus(1.4).times(0.12).clamp(-0.05, 0.2))
                .clamp(0.5, 0.95).round(2),
            "判定半径", {
                unit: "格",
                description: "低头撞出去时身体扫过的横向判定半径；身板越宽大撞面越宽，画面里的龙气团也越大。"
            }),
        /** 击退：基础 0.8，物攻每比 60 多 1 加 0.006（夹 -0.2..0.9）；穷追 ×1.2；夹 0.4..2.2。 */
        push: formula(
            F.base(0.8).plus(F.stat("attack").minus(60).times(0.006).clamp(-0.2, 0.9))
                .times(F.when(F.pref("relentless", text("worldcombat.skill.outrage.preference.relentless")), F.const(1.2), F.const(1)))
                .clamp(0.4, 2.2).round(2),
            "击退", {
                unit: "格",
                description: "命中后把目标沿冲撞方向顶开多远；物攻越高顶得越远，穷追式顶得更狠——顶开之后它还要再撞上去。"
            }),
        /** 终结倍率：基础 1.25，物攻每比 60 多 1 加 0.002（夹 -0.1..0.35）；夹 1.05..1.6。 */
        finisher: formula(
            F.base(1.25).plus(F.stat("attack").minus(60).times(0.002).clamp(-0.1, 0.35)).clamp(1.05, 1.6).round(2),
            "终结倍率", {
                unit: "倍",
                description: "最后一次冲撞的额外倍率：把积攒的怒气全压进去；物攻越高终结越重。"
            }),
        /** 恍惚时长：基础 140 刻，物攻每比 60 多 1 加 0.5 刻（夹 -20..70），等级每比 25 高 1 加 1.2 刻（夹 0..50）；穷追 ×1.15；夹 100..300。 */
        dazeTicks: seconds(
            F.base(140)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-20, 70))
                .plus(F.level().minus(25).times(1.2).clamp(0, 50))
                .times(F.when(F.pref("relentless", text("worldcombat.skill.outrage.preference.relentless")), F.const(1.15), F.const(1)))
                .clamp(100, 300).round(0),
            "恍惚时长", "大闹之后自己晕头转向的时长；物攻越高、等级越高闹得越久，穷追式撞得更狠也晕得更久。"),
        /** 恍惚失手率：基础 30%，物攻每比 60 多 1 加 0.12%（夹 -5%..12%）；夹 20%..50%。 */
        fumble: percent(
            F.base(0.30).plus(F.stat("attack").minus(60).times(0.0012).clamp(-0.05, 0.12)).clamp(0.20, 0.50).round(3),
            "恍惚失手率", "恍惚期间每次想出手被打散的概率；物攻越高闹得越凶，越容易在晕眩里打空。"),
        /** 连撞间隔：基础 14 刻，速度每比 60 快 1 减 0.05 刻（夹 -3..7）；夹 8..22。 */
        gap: seconds(
            F.base(14).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 7)).clamp(8, 22).round(0),
            "连撞间隔", "两次冲撞之间隔多久；速度快的个体接得更紧，敌人更难喘口气。"),
        /** 龙气点数：基础 16，物攻每比 60 多 1 加 0.14（夹 -4..20）；夹 12..48。 */
        grains: formula(
            F.base(16).plus(F.stat("attack").minus(60).times(0.14).clamp(-4, 20)).clamp(12, 48).round(0),
            "龙气点数", {
                unit: "点",
                description: "冲撞与龙气迸出的火花数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 8 刻，速度每比 60 快 1 减 0.02 刻（夹 -3..4），穷追 +2；夹 5..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("relentless", text("worldcombat.skill.outrage.preference.relentless")), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "低头蓄势、锁定对手的时间；速度越快越短，穷追式要先认准目标。"),
        /** 收招：基础 10 刻，速度每比 60 快 1 减 0.02 刻（夹 -3..4）；夹 6..16。 */
        recover: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4)).clamp(6, 16).round(0),
            "收招", "大闹结束站住、喘口气的时间；速度越快收得越快。"),
        /** 冷却：基础 42 刻，速度每比 60 快 1 减 0.05 刻（夹 -5..9），穷追 +10；夹 26..64。 */
        recharge: seconds(
            F.base(42).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 9))
                .plus(F.when(F.pref("relentless", text("worldcombat.skill.outrage.preference.relentless")), F.const(10), F.const(0)))
                .clamp(26, 64).round(0),
            "冷却", "两次逆鳞之间的间隔；速度越快回得越快，穷追式更费。PP 10 的代价。")
    });

    defineDamage(outrageId, "claw", {}, { contact: true });

    stages(outrageId, [
        { level: 40, values: { claw: 46 } },
        { level: 58, values: { claw: 58, finisher: 1.35 } }
    ]);

    describe(outrageId, [
        { key: "description.0", values: ["claw","strikes","finisher"] },
        { key: "description.1", values: ["reach","gap","radius","push","lunge"] },
        { key: "description.2", values: ["dazeTicks","fumble"] },
        { key: "relentless.on", values: [], when: function (context) { return read(context.detail.values, ["relentless"]) === true; } },
        { key: "relentless.off", values: [], when: function (context) { return read(context.detail.values, ["relentless"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.claw"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.claw", "tier.1.finisher"] }
    ]);
}
