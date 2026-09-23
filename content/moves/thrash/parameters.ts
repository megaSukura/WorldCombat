/**
 * 大闹一番 / thrash 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：一般／物理／威力 120／命中 100／PP 10／接触，
 *   目标 randomNormal，自身获得 volatile lockedmove；锁定 2～3 回合乱打一气，大闹完自己陷入混乱。
 *
 * 翻译：把回合制的「锁住 2～3 回合乱打、然后混乱」落成**一次自驱动作里的原地乱挥**——
 *   站在原地转着圈乱打，每一挥都罩住身边一圈敌人，把它们朝外震开；越闹越失控，最后一下是最重的一跺。
 *   闹完自己晕头转向（共享身份 world_combat:status/confusion，载体本单元自己的 *_daze）。
 *   大闹一番独有的读法是**不看目标、罩住一圈**：它不追谁，谁站在旁边谁挨打；转着打，方向每一下都不一样。
 *
 * 与同族分开：逆鳞只认一个对手、还会追上去撞；花瓣舞是散落花瓣的范围特攻；大愤慨是一路喷火在地面留火场。
 *   大闹一番是唯一**原地转圈、同时罩住身边所有人**的物理乱挥。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   bash     每挥威力：物攻给狠度，体重把份量压进去；狂乱式略收单次换更大范围。
 *   strikes  连挥次数：2～3 次，物攻越高越可能多挥一次。
 *   radius   乱挥半径：身高与碰撞箱决定够到多大一圈，也是本招实际射程来源；狂乱式更宽。
 *   push     震开距离：物攻与体重决定把圈里的人往外推多远；狂乱式推得更狠。
 *   finisher 末挥倍率：最后一记重跺的额外倍率。
 *   recoil   自伤比例：狂乱式下每挥磕到自己多少（按自身最大生命），体重越大磕得越沉；非狂乱式为 0。
 *   step     踉跄步：速度决定每一挥自己随机挪开多少，越乱越站不稳。
 *   dust     尘土数：体重与速度派生，表现按它发射。
 *   dazeTicks 恍惚时长：物攻与等级决定闹完晕多久，狂乱式更久。
 *   fumble   恍惚失手率：物攻决定这段时间出手被打散的概率，存进载体振幅。
 *   tempo／recover／recharge：速度决定起手／收招／冷却，狂乱式更慢。
 *
 * 配置 wild（狂乱）双向取舍：开启＝罩得更宽、推得更狠、末挥更重，但每一挥都会磕伤自己、冷却更久、恍惚更长；
 *   关闭（乱打）＝只震不伤己、收放更快，代价是范围与击退都收窄。两个方向各有适用局面。
 *
 * 伤害段 bash：这一挥随精灵数据变化的那部分，走共享换算（对手防御、相性与暴击在命中时另算）。
 */
namespace PokemonSkills {
    export const thrashId = "thrash";
    export const thrashScene = "world_combat:move_thrash";
    export const thrashDaze = "world_combat:thrash_daze";
    export const thrashFlailText = "world_combat.move.thrash.text.flail";
    export const thrashStompText = "world_combat.move.thrash.text.stomp";
    export const thrashDazeText = "world_combat.move.thrash.text.daze";
    export const thrashChipText = "world_combat.move.thrash.text.chip";

    actionParameters.define(thrashId, {
        /** 每挥威力：基础 22，物攻每比 60 多 1 加 0.24（夹 -8..26），体重每比 60 多 1 加 0.08（夹 -3..14）；狂乱 ×0.96；夹 12..70。 */
        bash: formula(
            F.base(22)
                .plus(F.stat("attack").minus(60).times(0.24).clamp(-8, 26))
                .plus(F.body("weight").minus(60).times(0.08).clamp(-3, 14))
                .times(F.when(F.pref("wild", text("worldcombat.skill.thrash.preference.wild")), F.const(0.96), F.const(1)))
                .clamp(12, 70).round(1),
            "每挥威力", {
                unit: "威力",
                description: "一次乱挥罩住一圈敌人的基础威力；物攻越高、身体越沉砸得越重，但每次要摊给一圈人。末挥另乘末挥倍率。对手防御、相性与暴击在命中时另算。"
            }),
        /** 连挥次数：2 + (物攻 − 75) × 0.02，夹 2..3。 */
        strikes: formula(
            F.base(2).plus(F.stat("attack").minus(75).times(0.02).clamp(0, 1)).clamp(2, 3).round(0),
            "连挥次数", {
                unit: "次",
                description: "这一阵乱挥一共挥几次；物攻越高的个体越容易多挥一次。最后一次是重跺。"
            }),
        /** 乱挥半径：基础 3.4，身高每比 1.4 高 1 加 0.5（夹 -0.4..1.3），碰撞箱每比 0.9 宽 1 加 0.4（夹 -0.2..0.9）；狂乱 ×1.18；夹 2.4..5.2。 */
        radius: formula(
            F.base(3.4)
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.4, 1.3))
                .plus(F.body("width").minus(0.9).times(0.4).clamp(-0.2, 0.9))
                .times(F.when(F.pref("wild", text("worldcombat.skill.thrash.preference.wild")), F.const(1.18), F.const(1)))
                .clamp(2.4, 5.2).round(2),
            "乱挥半径", {
                unit: "格",
                description: "原地乱挥能罩住多大一圈，也是本招的实际射程来源；身高的个体臂展更长，狂乱式罩得更宽。"
            }),
        /** 震开距离：基础 0.7，物攻每比 60 多 1 加 0.004（夹 -0.15..0.5），体重每比 60 多 1 加 0.005（夹 -0.2..0.6）；狂乱 ×1.25；夹 0.35..1.9。 */
        push: formula(
            F.base(0.7)
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.15, 0.5))
                .plus(F.body("weight").minus(60).times(0.005).clamp(-0.2, 0.6))
                .times(F.when(F.pref("wild", text("worldcombat.skill.thrash.preference.wild")), F.const(1.25), F.const(1)))
                .clamp(0.35, 1.9).round(2),
            "震开距离", {
                unit: "格",
                description: "每一挥把圈里的人朝外震开多远；物攻越高、身体越沉推得越远，狂乱式推得更狠。"
            }),
        /** 末挥倍率：基础 1.2，体重每比 60 多 1 加 0.001（夹 -0.05..0.2）；夹 1.05..1.5。 */
        finisher: formula(
            F.base(1.2).plus(F.body("weight").minus(60).times(0.001).clamp(-0.05, 0.2)).clamp(1.05, 1.5).round(2),
            "末挥倍率", {
                unit: "倍",
                description: "最后一记重跺的额外倍率；身体越沉跺得越重。"
            }),
        /** 自伤比例：基础 1.4%，体重每比 60 多 1 加 0.01%（夹 -0.4%..0.8%）；仅狂乱式生效（非狂乱 ×0）；夹 0..4%。 */
        recoil: percent(
            F.base(0.014).plus(F.body("weight").minus(60).times(0.0001).clamp(-0.004, 0.008))
                .times(F.when(F.pref("wild", text("worldcombat.skill.thrash.preference.wild")), F.const(1), F.const(0)))
                .clamp(0, 0.04).round(4),
            "自伤比例", "狂乱式下每一次乱挥磕到自己的最大生命比例；身体越沉磕得越重，非狂乱式为 0。"),
        /** 踉跄步：基础 0.35 格，速度每比 60 快 1 加 0.004（夹 -0.1..0.35）；夹 0.15..0.8。 */
        step: formula(
            F.base(0.35).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.1, 0.35)).clamp(0.15, 0.8).round(2),
            "踉跄步", {
                unit: "格",
                description: "每一挥自己随机踉跄挪开的距离；速度快的个体闹起来更站不稳，画面里的人也真的在晃。"
            }),
        /** 尘土数：基础 14，体重每比 60 多 1 加 0.1（夹 -3..12），速度每比 60 快 1 加 0.2（夹 -4..10）；夹 10..44。 */
        dust: formula(
            F.base(14).plus(F.body("weight").minus(60).times(0.1).clamp(-3, 12))
                .plus(F.stat("speed").minus(60).times(0.2).clamp(-4, 10))
                .clamp(10, 44).round(0),
            "尘土数", {
                unit: "点",
                description: "乱挥扬起的尘土数量，随体重与速度增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 连挥间隔：基础 12 刻，速度每比 60 快 1 减 0.05 刻（夹 -3..6）；夹 7..20。 */
        gap: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 6)).clamp(7, 20).round(0),
            "连挥间隔", "两次乱挥之间隔多久；速度快的个体挥得更密。"),
        /** 恍惚时长：基础 130 刻，物攻每比 60 多 1 加 0.4 刻（夹 -15..60），等级每比 25 高 1 加 1.1 刻（夹 0..45）；狂乱 ×1.1；夹 90..280。 */
        dazeTicks: seconds(
            F.base(130)
                .plus(F.stat("attack").minus(60).times(0.4).clamp(-15, 60))
                .plus(F.level().minus(25).times(1.1).clamp(0, 45))
                .times(F.when(F.pref("wild", text("worldcombat.skill.thrash.preference.wild")), F.const(1.1), F.const(1)))
                .clamp(90, 280).round(0),
            "恍惚时长", "大闹之后自己晕头转向的时长；物攻越高、等级越高闹得越久，狂乱式更久。"),
        /** 恍惚失手率：基础 29%，物攻每比 60 多 1 加 0.12%（夹 -5%..12%）；夹 20%..50%。 */
        fumble: percent(
            F.base(0.29).plus(F.stat("attack").minus(60).times(0.0012).clamp(-0.05, 0.12)).clamp(0.20, 0.50).round(3),
            "恍惚失手率", "恍惚期间每次想出手被打散的概率；物攻越高闹得越凶，越容易在晕眩里打空。"),
        /** 起手：基础 7 刻，速度每比 60 快 1 减 0.02 刻（夹 -2..3），狂乱 +2；夹 4..13。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("wild", text("worldcombat.skill.thrash.preference.wild")), F.const(2), F.const(0)))
                .clamp(4, 13).round(0),
            "起手", "踏地、抡起手臂的时间；速度越快越短，狂乱式多蓄一下。"),
        /** 收招：基础 9 刻，速度每比 60 快 1 减 0.02 刻（夹 -3..4）；夹 5..15。 */
        recover: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4)).clamp(5, 15).round(0),
            "收招", "闹完站稳的收势；速度越快收得越快。"),
        /** 冷却：基础 38 刻，速度每比 60 快 1 减 0.05 刻（夹 -5..9），狂乱 +8；夹 24..58。 */
        recharge: seconds(
            F.base(38).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 9))
                .plus(F.when(F.pref("wild", text("worldcombat.skill.thrash.preference.wild")), F.const(8), F.const(0)))
                .clamp(24, 58).round(0),
            "冷却", "两次大闹之间的间隔；速度越快回得越快，狂乱式更费。PP 10 的代价。")
    });

    defineDamage(thrashId, "bash", {}, { contact: true });

    stages(thrashId, [
        { level: 38, values: { bash: 30 } },
        { level: 56, values: { bash: 40, finisher: 1.35 } }
    ]);

    describe(thrashId, [
        { key: "description.0", values: ["bash","strikes","finisher"] },
        { key: "description.1", values: ["radius","gap","push","step"] },
        { key: "description.2", values: ["dazeTicks","fumble"] },
        { key: "wild.on", values: ["recoil"], when: function (context) { return read(context.detail.values, ["wild"]) === true; } },
        { key: "wild.off", values: [], when: function (context) { return read(context.detail.values, ["wild"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bash", "tier.1.finisher"] }
    ]);
}
