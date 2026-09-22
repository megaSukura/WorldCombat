/**
 * 烈焰溅射 / flameburst 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Fire／特殊／威力 70／命中 100／PP 15／优先度 0／非接触／单体；
 *   `onHit` 让目标**旁边**的宝可梦各受其最大生命 1/16 的固定伤害（`isNonstandard: "Past"`，本世界不设立场，
 *   按现代战斗翻译）。34 位学习者。原生描述「如果击中，爆裂的火焰会攻击到对手。爆裂出的火焰还会飞溅到旁边的对手」。
 *
 * 翻译：把「爆裂的火焰还会飞溅到旁边的对手」落成一记**会溢出的火焰弹**——它是一颗拖焰飞出的火球，
 *   命中点炸开的同时，火不是停在那里，而是从爆点甩出几滴沿弧线落到**旁边每个对手**身上，各自绽开一小簇火。
 *   这就是它和同族（火花、喷射火焰、大字爆炎、火焰球）的分界：那些招把能量收在一个点或一条线上，
 *   烈焰溅射的能量在命中之后**往外分**，画面里的溅射轨迹就是它的判定范围。
 *
 * 与同族分开：火花是一粒点、喷射火焰是一道会变长的墙、大字爆炎是一幅字、火焰球是踢出的实心火石；
 *   烈焰溅射是唯一把命中能量主动分给旁边的人的远程火，且原生没有灼伤概率——它的代价与身份都在「分出去」。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   burst        爆裂威力：特攻给火力，等级拾级抬升；扇溅式分薄、直爆式更集中。
 *   splash       溅射威力：特攻决定分出去的那份有多重；扇溅式分得更多。
 *   splashRadius 溅射半径：特攻决定火甩得多远、身高给出爆点高度；它就是画面里那圈火环的半径。
 *   drops        火滴数：特攻与等级换算出的火滴数量，决定溅射轨迹的条数与粒子量。
 *   embers       焰尾火星：特攻换算，驱动飞行途中的火星。
 *   velocity     弹速：速度决定火球飞得多急。
 *   radius       弹体判定：体型高度决定火球大小。
 *   reach        射程：特攻决定能把火球送多远；扇溅式收得更近。
 *   tempo／aftercast／recharge：速度定节奏；扇溅式更慢更贵。
 *
 * 配置 `spread`（扇溅式，默认开）双向取舍：
 *   开（扇溅式）：溅射半径 ×1.35、溅射威力 ×1.15、火滴更多更远，代价是爆裂威力 ×0.92、射程 −1.5 格。
 *   关（直爆式）：爆裂威力 ×1.08、射程 +1.5 格，代价是溅射半径 ×0.75、溅射威力 ×0.85。
 *
 * 伤害段 `burst`（主爆）与 `splash`（溅射）各成一节，原始类别 Special（Fire）；对手特防、相性与暴击在命中时另算。
 * 原生「旁边宝可梦固定 1/16 最大生命」的只取不分敌我，在这里落成一个独立的 `splash` 段：这份伤害随特攻缩放，
 * 仍然只落到爆点旁边的对手身上。
 */
namespace PokemonSkills {
    export const flameburstId = "flameburst";
    export const flameburstScene = "world_combat:move_flameburst";
    export const flameburstDropText = "world_combat.move.flameburst.text.drop";
    export const flameburstMissText = "world_combat.move.flameburst.text.miss";
    /** 表现里溅射火环的参考半径（格）；服务端传 scale = 实际溅射半径 / 这个值。 */
    export const flameburstReference = 2.0;

    actionParameters.define(flameburstId, {
        /** 爆裂威力：基础 70；特攻每比 55 多 1 加 0.32（夹 −16..48）；等级每比 20 高 1 加 0.25（夹 0..14）；
         *  扇溅 ×0.92 / 直爆 ×1.08；夹 44..150。 */
        burst: formula(
            F.base(70).plus(F.stat("specialAttack").minus(55).times(0.32).clamp(-16, 48))
                .plus(F.level().minus(20).times(0.25).clamp(0, 14))
                .times(F.when(F.pref("spread", text("worldcombat.skill.flameburst.preference.spread")), F.const(0.92), F.const(1.08)))
                .clamp(44, 150).round(1),
            "爆裂威力", {
                unit: "威力",
                description: "火球在命中点炸开这一下的基础威力；特攻越高火越盛、等级越高越沉。扇溅式把力分给溅射，直爆式把力全留在主爆。对手防御、相性与暴击在命中时另算。"
            }),
        /** 溅射威力：基础 22；特攻每比 55 多 1 加 0.12（夹 −6..18）；等级每比 20 高 1 加 0.1（夹 0..6）；
         *  扇溅 ×1.15 / 直爆 ×0.85；夹 14..60。 */
        splash: formula(
            F.base(22).plus(F.stat("specialAttack").minus(55).times(0.12).clamp(-6, 18))
                .plus(F.level().minus(20).times(0.1).clamp(0, 6))
                .times(F.when(F.pref("spread", text("worldcombat.skill.flameburst.preference.spread")), F.const(1.15), F.const(0.85)))
                .clamp(14, 60).round(1),
            "溅射威力", {
                unit: "威力",
                description: "从爆点甩出去、落到旁边每个对手身上的那一份威力；特攻越高分得越重，扇溅式分得更多。它只打到主目标之外的对手。"
            }),
        /** 溅射半径：基础 2.0 格；特攻每比 55 多 1 加 0.012（夹 −0.3..0.8）；身高每比 1.4 高 1 加 0.5（夹 −0.2..0.9）；
         *  扇溅 ×1.35 / 直爆 ×0.75；夹 1.6..4.2。 */
        splashRadius: formula(
            F.base(2.0).plus(F.stat("specialAttack").minus(55).times(0.012).clamp(-0.3, 0.8))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 0.9))
                .times(F.when(F.pref("spread", text("worldcombat.skill.flameburst.preference.spread")), F.const(1.35), F.const(0.75)))
                .clamp(1.6, 4.2).round(2),
            "溅射半径", {
                unit: "格",
                description: "火从爆点甩出去、能溅到多远的对手；特攻越高甩得越远、个子越高爆点越高。画面里那圈火环就是这个半径，站得离目标太近的人会被溅到。"
            }),
        /** 火滴数：基础 12；特攻每比 55 多 1 加 0.16（夹 −4..18）；等级每比 20 高 1 加 0.2（夹 0..8）；夹 10..44。 */
        drops: formula(
            F.base(12).plus(F.stat("specialAttack").minus(55).times(0.16).clamp(-4, 18))
                .plus(F.level().minus(20).times(0.2).clamp(0, 8)).clamp(10, 44).round(0),
            "火滴数", {
                unit: "个",
                description: "炸开时从爆点甩出的火滴数量，决定每道溅射轨迹的粒子量与画面密度；特攻与等级越高越密。"
            }),
        /** 焰尾火星：基础 16；特攻每比 55 多 1 加 0.2（夹 −5..22）；夹 12..48。 */
        embers: formula(
            F.base(16).plus(F.stat("specialAttack").minus(55).times(0.2).clamp(-5, 22)).clamp(12, 48).round(0),
            "焰尾火星", {
                unit: "个",
                description: "火球飞行途中拖出的火星数量；特攻越高越密。它驱动飞行阶段的粒子。"
            }),
        /** 弹速：基础 1.15 格/刻；速度每比 55 快 1 加 0.006（夹 −0.2..0.45）；夹 0.8..1.8。 */
        velocity: formula(
            F.base(1.15).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.2, 0.45)).clamp(0.8, 1.8).round(2),
            "弹速", {
                unit: "格/刻",
                description: "火球离开掌心的速度；速度快的个体射得更急，目标更难走位躲开。"
            }),
        gravity: formula(F.const(0.006), "下坠", {
            unit: "格/刻²",
            description: "火球沿一道很浅的低弧飞行的轻微下坠；比直线弹道稍微飘一点。"
        }),
        /** 弹体判定：基础 0.24 格；身高每比 1.4 高 1 加 0.05（夹 −0.03..0.14）；夹 0.18..0.42。 */
        radius: formula(
            F.base(0.24).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.03, 0.14)).clamp(0.18, 0.42).round(2),
            "弹体判定", {
                unit: "格",
                description: "火球飞行途中的判定半径；体型越高越大。"
            }),
        /** 射程：基础 12 格；特攻每比 55 多 1 加 0.05（夹 −2..4）；扇溅 −1.5；夹 9..17。 */
        reach: formula(
            F.base(12).plus(F.stat("specialAttack").minus(55).times(0.05).clamp(-2, 4))
                .minus(F.when(F.pref("spread", text("worldcombat.skill.flameburst.preference.spread")), F.const(1.5), F.const(0)))
                .clamp(9, 17).round(1),
            "射程", {
                unit: "格",
                description: "能把火球送到多远；特攻高送得远。扇溅式为了把火分出去，火球收得更近。它也是本招的实际射程来源。"
            }),
        /** 起手：基础 11 刻；速度每比 55 快 1 减 0.04（夹 −1.5..3）；夹 6..16。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 3)).clamp(6, 16).round(0),
            "起手", "掌心凝出火球、拨到身前的时间；速度越快越短。"),
        /** 收招：基础 8 刻；速度每比 55 快 1 减 0.02（夹 −1..1.5）；夹 4..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5)).clamp(4, 12).round(0),
            "收招", "射完火球后收回站姿的时间；速度越快越利落。"),
        /** 冷却：基础 34 刻；速度每比 55 快 1 减 0.05（夹 −4..7）；夹 22..50。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 7)).clamp(22, 50).round(0),
            "冷却", "再次凝火前的等待；速度越快回得越快。")
    });

    stages(flameburstId, [
        { level: 34, values: { burst: 82, splash: 26 } },
        { level: 55, values: { burst: 96, splashRadius: 2.5, drops: 26 } }
    ]);

    defineDamage(flameburstId, "burst", {});
    defineDamage(flameburstId, "splash", {});

    describe(flameburstId, [
        { key: "description.0", values: ["burst", "splash"] },
        { key: "description.1", values: ["splashRadius", "drops"] },
        { key: "description.2", values: ["reach", "velocity", "radius", "embers"] },
        { key: "spread.on", values: [], when: function (context) { return read(context.detail.values, ["spread"]) === true; } },
        { key: "spread.off", values: [], when: function (context) { return read(context.detail.values, ["spread"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.burst", "tier.0.splash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.burst", "tier.1.splashRadius", "tier.1.drops"] }
    ]);
}
