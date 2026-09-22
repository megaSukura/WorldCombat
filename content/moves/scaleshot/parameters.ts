/**
 * 鳞射 / scaleshot 的参数与伤害段。本族「拆甲换力」的连射型。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Dragon／物理／单发威力 25／命中 90／PP 20／优先度 0／非接触；
 *   `multihit: [2, 5]`（连续攻击 2～5 次）；`selfBoost: { def: -1, spe: +1 }`；无次要效果；target normal（单体）。74 位学习者。
 *   描述「发射鳞片进行攻击。连续攻击2～5次。速度会提高但防御会降低」。
 *
 * 翻译：把「射鳞、脱鳞」翻成一梭**连珠鳞刃**——抖开背鳞，鳞片一片接一片射向目标；每片削掉一点护壳，
 *   这梭打完，身上轻了（速度 +1）但也露了底（防御 −1）。它是本族唯一的远程多段，卖的是「用脱甲换机动」。
 *
 * 与同族分开：
 *   蛮力     —— 近身单体最重的一击、砸地留坑、自身攻防双降；
 *   鳞射     —— 远距离 2～5 段小撞击，打完自身提速降防（唯一会加速的）；
 *   火焰鞭   —— 长鞭单段、剥对手甲；
 *   鳞片噪音 —— 环身特殊声爆。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   shard       单鳞威力：物攻定锐度、等级定鳞的硬度；散鳞式摊薄。
 *   shots       发数：物攻、速度与等级决定这一梭有几片（原生 2～5）。
 *   gap         间隔：速度决定鳞片喷得多密。
 *   shardSpeed  鳞速：速度决定鳞片飞得多快。
 *   spread      散布：速度与配置决定鳞片散多开。
 *   reach       射程：物攻与等级决定能打多远（也是本招射程）。
 *   shardRadius 鳞片判定：体型高度决定单片的碰撞大小。
 *   speedGain   速度提升级：原生固定 +1 级。
 *   guardLoss   防御下降级：原生 −1 级；散鳞式多降一级。
 *   maxTargets  散鳞目标数：聚鳞内定 1、散鳞放开到 3。
 *   tempo/aftercast/recharge：速度定节奏，散鳞式更慢更长。
 *
 * 配置 `spray`（散鳞式，默认关）双向取舍：
 *   开＝身前一锥内的至多 3 名敌人被分到鳞片、覆盖面广；代价是每片威力 ×0.82、自身防御多降一级、射程 ×0.9、起手 +2、间隔 +1。
 *   关（聚鳞式）＝整梭全部追打一个目标、单发更重、射程更远、出手更快。
 *
 * 伤害段 `shard` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在每片命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("scaleshot", {
        /** 单鳞威力：基础 25；物攻每比 60 多 1 加 0.2（夹 −5..14）；等级每比 25 多 1 加 0.3（夹 0..8）；
         *  散鳞 ×0.82 / 聚鳞 ×1.0；夹 15..52。 */
        shard: formula(
            F.base(25)
                .plus(F.stat("attack").minus(60).times(0.2).clamp(-5, 14))
                .plus(F.level().minus(25).times(0.3).clamp(0, 8))
                .times(F.when(F.pref("spray", text("worldcombat.skill.scaleshot.preference.spray")), F.const(0.82), F.const(1.0)))
                .clamp(15, 52).round(1),
            "单鳞威力", {
                unit: "威力",
                description: "每一片鳞刃戳进去的威力；总数乘发数才是这一梭的分量。物攻定锐度、等级定硬度，散鳞式把能量摊给更多目标。对手防御、相性与暴击在每片命中时另算。"
            }),
        /** 发数：基础 2；物攻偏移[0,1.2]；速度偏移[0,1.5]；等级(≥25)偏移[0,1]；向下取整；夹 2..5。 */
        shots: formula(
            F.base(2)
                .plus(F.stat("attack").minus(55).times(0.01).clamp(0, 1.2))
                .plus(F.stat("speed").minus(55).times(0.012).clamp(0, 1.5))
                .plus(F.level().minus(25).times(0.02).clamp(0, 1))
                .floor().clamp(2, 5),
            "发数", {
                unit: "片",
                description: "这一梭射出几片鳞；物攻、速度与等级越高越多（原生 2～5，按普通连续攻击掷次数）。"
            }),
        /** 间隔：基础 4 刻；速度每比 55 快 1 减 0.025（夹 −1..1.5）；散鳞 +1；夹 2..6。 */
        gap: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.025).clamp(-1, 1.5))
                .plus(F.when(F.pref("spray", text("worldcombat.skill.scaleshot.preference.spray")), F.const(1), F.const(0)))
                .clamp(2, 6).round(0),
            "间隔", "两片鳞之间隔多久射出；速度越快越密，散鳞式要分目标、稍慢。"),
        /** 鳞速：基础 1.7 格/刻；速度每比 55 快 1 加 0.008（夹 −0.2..0.4）；散鳞 ×0.95 / 聚鳞 ×1.08；夹 1.3..2.4。 */
        shardSpeed: formula(
            F.base(1.7).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.4))
                .times(F.when(F.pref("spray", text("worldcombat.skill.scaleshot.preference.spray")), F.const(0.95), F.const(1.08)))
                .clamp(1.3, 2.4).round(2),
            "鳞速", {
                unit: "格/刻",
                description: "每片鳞飞行的速度；速度快的个体射得更急，聚鳞式集中冲击飞得更快。"
            }),
        /** 散布：基础 2.2°；速度每比 55 快 1 加 0.03（夹 0..3）；散鳞 ×2.4 / 聚鳞 ×0.6；夹 1.0..10。 */
        spread: formula(
            F.base(2.2).plus(F.stat("speed").minus(55).times(0.03).clamp(0, 3))
                .times(F.when(F.pref("spray", text("worldcombat.skill.scaleshot.preference.spray")), F.const(2.4), F.const(0.6)))
                .clamp(1.0, 10).round(1),
            "散布", {
                unit: "°", description: "每片鳞射出的随机偏角；散鳞式明显散开、聚鳞式收成一条线。"
            }),
        /** 射程：基础 8 格；物攻每比 55 多 1 加 0.03（夹 −1..2.5）；等级每比 25 多 1 加 0.05（夹 0..1.5）；散鳞 ×0.9；夹 6..12。 */
        reach: formula(
            F.base(8)
                .plus(F.stat("attack").minus(55).times(0.03).clamp(-1, 2.5))
                .plus(F.level().minus(25).times(0.05).clamp(0, 1.5))
                .times(F.when(F.pref("spray", text("worldcombat.skill.scaleshot.preference.spray")), F.const(0.9), F.const(1.0)))
                .clamp(6, 12).round(1),
            "射程", {
                unit: "格", description: "鳞片能射到多远；物攻与等级越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 鳞片判定：基础 0.2 格；高度每比 1.4 高 1 格加 0.04（夹 −0.03..0.12）；夹 0.15..0.36。 */
        shardRadius: formula(
            F.base(0.2).plus(F.body("height").minus(1.4).times(0.04).clamp(-0.03, 0.12)).clamp(0.15, 0.36).round(2),
            "鳞片判定", {
                unit: "格", description: "单片鳞飞行与命中的判定大小；体型越高鳞片越大。画面里的鳞片大小与它一致。"
            }),
        /** 速度提升级：原生固定 +1 级；夹 1..6。 */
        speedGain: formula(
            F.const(1).clamp(1, 6).round(0),
            "速度提升", {
                unit: "级", description: "这一梭打完后自身速度上升的能力等级；原生固定 +1，是脱鳞换来的轻快。"
            }),
        /** 防御下降级：基础 1 级；散鳞式 +1；夹 1..6。 */
        guardLoss: formula(
            F.const(1).plus(F.when(F.pref("spray", text("worldcombat.skill.scaleshot.preference.spray")), F.const(1), F.const(0))).clamp(1, 6).round(0),
            "防御下降", {
                unit: "级", description: "脱鳞后自身防御下降的能力等级；原生 1 级，散鳞式露底更多、多降一级。"
            }),
        /** 散鳞目标数：散鳞式 3 / 聚鳞式 1；夹 1..4。 */
        maxTargets: formula(
            F.when(F.pref("spray", text("worldcombat.skill.scaleshot.preference.spray")), F.const(3), F.const(1)).clamp(1, 4).round(0),
            "散鳞目标数", {
                unit: "个", description: "散鳞式最多把鳞片分给身前锥形里的几个敌人；聚鳞式始终只打一个。"
            }),
        /** 起手：基础 8 刻；速度每比 55 快 1 减 0.04（夹 −1.5..2.5）；散鳞 +2；夹 4..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("spray", text("worldcombat.skill.scaleshot.preference.spray")), F.const(2), F.const(0)))
                .clamp(4, 13).round(0),
            "起手", "抖开背鳞、射出第一片的时间；速度越快越短，散鳞式要多瞄一下。"),
        /** 收招：基础 7 刻；速度每比 55 快 1 减 0.03（夹 −1..2）；散鳞 +1；夹 4..11。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2))
                .plus(F.when(F.pref("spray", text("worldcombat.skill.scaleshot.preference.spray")), F.const(1), F.const(0)))
                .clamp(4, 11).round(0),
            "收招", "这一梭射完、把身体收回架势的时间；快的个体收得利落。"),
        /** 冷却：基础 30 刻；速度每比 55 快 1 减 0.06（夹 −3..6）；散鳞 +4 / 聚鳞 −2；夹 18..44。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 6))
                .plus(F.when(F.pref("spray", text("worldcombat.skill.scaleshot.preference.spray")), F.const(4), F.const(-2)))
                .clamp(18, 44).round(0),
            "冷却", "再脱一梭鳞之前等待多久；聚鳞式更集中、回得更快，散鳞式更久。")
    });

    stages("scaleshot", [
        { level: 32, values: { shard: 31, shots: 3 } },
        { level: 50, values: { shard: 37, reach: 10 } }
    ]);

    defineDamage("scaleshot", "shard", {});

    describe("scaleshot", [
        { key: "description.0", values: ["shard", "shots"] },
        { key: "description.1", values: ["gap", "shardSpeed", "reach", "spread"] },
        { key: "description.2", values: ["shardRadius", "speedGain", "guardLoss"] },
        { key: "spray.on", values: ["maxTargets"], when: function (context) { return read(context.detail.values, ["spray"]) === true; } },
        { key: "spray.off", values: [], when: function (context) { return read(context.detail.values, ["spray"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shard", "tier.0.shots"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shard", "tier.1.reach"] }
    ]);
}
