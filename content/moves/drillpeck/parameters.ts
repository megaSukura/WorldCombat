/**
 * 啄钻 / drillpeck 的参数与伤害段。
 *
 * 原生事实：Flying／物理／威力 80／命中 100／PP 20／优先度 0／接触／distance，无追加效果（Cobblemon 1.8，23 位学习者）。
 * 描述「一边旋转，一边将尖喙刺入对手进行攻击」；原生可命中空中目标。
 *
 * 翻译：把「一边旋转一边刺入」翻成**原地旋起来，把身体拧成一支钻，贴着身前一条短轴一下一下地把尖喙钻进去**——
 * 不是一记，而是连续几口，每一口都把对手往后顶一点；伤害是一条速率而不是一次爆发。对手离地时（尖喙专钻空中的破绽）
 * 每一口更狠，这是原生「可命中空中」的落点。它是全族唯一的持续接触钻孔。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   bite       每一口的深浅：物攻定喙尖，等级给拧劲；深钻摊薄、快钻更重。
 *   bites      口数：速度决定转起来能连钻几口；深钻更多口、总伤害更高。
 *   gap        两口之间：速度越快越密；深钻更慢。
 *   reach      喙程：身高给颈长与探身，也是实际射程。
 *   bore       钻头判定半径：体宽定喙身多粗。
 *   lunge      起钻时垫前的一步：速度给冲量。
 *   push       每一口顶开的距离：体重给推力；深钻摊薄。
 *   airBonus   对离地目标的加成：速度让旋得快的个体钻得更狠；深钻再抬一点。
 *   shavings   命中崩屑量：物攻换算，驱动表现。
 *   spinUp／aftercast／recharge：速度与等级定旋起、收势与循环；深钻式更费。
 *
 * 配置 `deep`（深钻式，默认关）双向取舍：开启＝口数 +3、总伤害更高、对空中目标加成更大，代价是每一口威力 ×0.84、
 * 口间隔 +1 刻、起手 +3 刻、冷却 +6 刻、顶开更少（钻得更久）。关闭（快钻式）＝三口较重、起手快、循环短。
 *
 * 伤害段 `bite` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("drillpeck", {
        /** 每一口：16 + 物攻偏移[−4,12] ×0.28 + 等级偏移[−3,7] ×0.2；快钻 ×1.18 / 深钻 ×0.84；夹 8..40。 */
        bite: formula(
            F.base(16).plus(F.stat("attack").minus(60).times(0.28).clamp(-4, 12))
                .plus(F.level().minus(25).times(0.2).clamp(-3, 7))
                .times(F.when(F.pref("deep", text("worldcombat.skill.drillpeck.preference.deep")), F.const(0.84), F.const(1.18)))
                .clamp(8, 40).round(1),
            "每一口", {
                unit: "威力",
                description: "尖喙每钻进一次造成的基础威力；物攻定喙尖、等级给拧劲。这一记是连续几口，真正结算的次数就是口数。对手防御、相性与暴击在命中时另算。"
            }),
        /** 口数：3 + 速度偏移[−1,3] ×0.02 + 深钻 +3；夹 2..8。 */
        bites: formula(
            F.base(3).plus(F.stat("speed").minus(60).times(0.02).clamp(-1, 3))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.drillpeck.preference.deep")), F.const(3), F.const(0)))
                .clamp(2, 8).round(0),
            "口数", {
                unit: "口",
                description: "这一记钻进去连续咬几口；速度快的个体转起来能多钻一口。口数是真实判定次数，画面里每响一次就是一口。"
            }),
        /** 口间隔：3 − 速度偏移[−1,1] ×0.01 + 深钻 +1；夹 2..5。 */
        gap: formula(
            F.base(3).minus(F.stat("speed").minus(60).times(0.01).clamp(-1, 1))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.drillpeck.preference.deep")), F.const(1), F.const(0)))
                .clamp(2, 5).round(0),
            "口间隔", {
                unit: "刻",
                description: "两口之间隔多久；速度越快钻得越密，深钻式慢而长。"
            }),
        /** 喙程：2.5 + 身高偏移[−0.3,0.9] ×0.5；深钻 ×0.95；夹 2.1..3.4。 */
        reach: formula(
            F.base(2.5).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 0.9))
                .times(F.when(F.pref("deep", text("worldcombat.skill.drillpeck.preference.deep")), F.const(0.95), F.const(1)))
                .clamp(2.1, 3.4).round(2),
            "喙程", {
                unit: "格",
                description: "尖喙能钻到多远；身高给颈长与探身。它也是本招的实际射程来源。"
            }),
        /** 钻头判定半径：0.36 + 体宽偏移[−0.05,0.2] ×0.14；夹 0.3..0.62。 */
        bore: formula(
            F.base(0.36).plus(F.body("width").minus(0.9).times(0.14).clamp(-0.05, 0.2)).clamp(0.3, 0.62).round(2),
            "钻头判定", {
                unit: "格",
                description: "钻头（喙身）的判定半径；身板越宽喙身越粗，多宽的对手会被钻中。画面里螺旋的粗细与它一致。"
            }),
        /** 起钻垫步：0.5 + 速度偏移[−0.15,0.5] ×0.004；深钻 ×0.9；夹 0.2..1.0。 */
        lunge: formula(
            F.base(0.5).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.15, 0.5))
                .times(F.when(F.pref("deep", text("worldcombat.skill.drillpeck.preference.deep")), F.const(0.9), F.const(1)))
                .clamp(0.2, 1.0).round(2),
            "起钻垫步", {
                unit: "格",
                description: "旋起来后朝目标垫进的一小步；速度给的冲量。垫步只到判定边缘，不会穿过目标。"
            }),
        /** 每口顶开：0.16 + 体重偏移[0,0.25] ×0.001；深钻 ×0.8；夹 0.05..0.4。 */
        push: formula(
            F.base(0.16).plus(F.body("weight").minus(60).times(0.001).clamp(0, 0.25))
                .times(F.when(F.pref("deep", text("worldcombat.skill.drillpeck.preference.deep")), F.const(0.8), F.const(1)))
                .clamp(0.05, 0.4).round(2),
            "每口顶开", {
                unit: "格",
                description: "每一口把目标往后顶开多远；体重给的推力，深钻式每口顶得少、但钻得久。"
            }),
        /** 离地加成：1.25 + 速度偏移[−0.1,0.25] ×0.002 + 深钻 +0.1；夹 1.05..1.6。 */
        airBonus: formula(
            F.base(1.25).plus(F.stat("speed").minus(60).times(0.002).clamp(-0.1, 0.25))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.drillpeck.preference.deep")), F.const(0.1), F.const(0)))
                .clamp(1.05, 1.6).round(2),
            "离地加成", {
                unit: "倍",
                description: "目标不在空中时不吃，离地时每一口的伤害乘上它——尖喙专钻空中的破绽，这也是原生「可命中空中」的落点；旋得快的个体加成更高。"
            }),
        /** 崩屑量：15 + 物攻偏移[−4,12] ×0.12 + 深钻 +4；夹 10..40。 */
        shavings: formula(
            F.base(15).plus(F.stat("attack").minus(60).times(0.12).clamp(-4, 12))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.drillpeck.preference.deep")), F.const(4), F.const(0)))
                .clamp(10, 40).round(0),
            "崩屑量", {
                unit: "个",
                description: "每一口崩出的羽毛与碎屑数量，由物攻换算；表现按它发射，不是独立伤害。"
            }),
        /** 旋起：10 − 速度偏移[−2,3] ×0.03 + 深钻 +3；夹 6..18。 */
        spinUp: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.drillpeck.preference.deep")), F.const(3), F.const(0)))
                .clamp(6, 18).round(0),
            "旋起", "原地转起来、把身体拧成一支钻的时间；速度越快越短，深钻式多拧几圈。"),
        /** 收势：8 − 速度偏移[−1.5,2.5] ×0.02 + 深钻 +2；夹 5..14。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.drillpeck.preference.deep")), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "收势", "钻完把身体摊回来、重新站稳的时间；速度越快越短。"),
        /** 冷却：30 − 等级偏移[0,6] ×0.15 + 深钻 +6；夹 18..44。 */
        recharge: seconds(
            F.base(30).minus(F.level().minus(25).times(0.15).clamp(0, 6))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.drillpeck.preference.deep")), F.const(6), F.const(0)))
                .clamp(18, 44).round(0),
            "冷却", "两次啄钻之间等多久；等级越高回得越快，深钻式更费。")
    });

    stages("drillpeck", [
        { level: 28, values: { bite: 18 } },
        { level: 46, values: { bite: 20, bites: 5 } }
    ]);

    defineDamage("drillpeck", "bite", {}, { contact: true });

    describe("drillpeck", [
        { key: "description.0", values: ["bite", "bites", "gap"] },
        { key: "description.1", values: ["reach", "bore", "push"] },
        { key: "description.2", values: ["airBonus"] },
        { key: "description.3", values: ["lunge"] },
        { key: "deep.on", values: ["bites", "bite"], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: ["bites", "bite"], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bite"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bite", "tier.1.bites"] }
    ]);
}
