/**
 * 岩石爆击 / rockblast 的参数与伤害段。本族「2～5 连发硬物」的岩石型。
 *
 * 原生事实：Rock／物理／单发威力 25／命中 90／PP 10／优先度 0／非接触，带 `bullet` 标记／
 *   `multihit: [2, 5]`（连续攻击 2～5 次）；114 位学习者（Cobblemon 1.8 / Showdown）。
 *   描述「向对手发射坚硬的岩石进行攻击。连续攻击2～5次」。
 *
 * 翻译：把回合制的「2～5 连击」翻成**掀地碎岩、霰弹齐射**——施法者从脚下的地里掰出石块，
 *   一块接一块按弧线抛向目标；每块落地砸一次 `shard` 物理伤害，并把落点那格地面崩成碎石。
 *   90 的命中翻成「散布」：石块抛得越散，远处的目标越容易被漏掉，贴脸打才吃得满一梭。
 *   岩石取自施法者脚下的方块（`skill.ts` 的 `rockblastGroundMaterial`），站在沙地抛沙岩、
 *   站在深板岩抛碎深板岩——同一招在不同地面出手长得不一样，这是它把世界当材料的地方。
 *
 * 与同族／同侪分开：
 *   种子机关枪 —— 贴地直飞的小籽，无弧线、无残留；
 *   飞弹针     —— 快而细的追身针，钉在目标身上；
 *   冰锥       —— 直飞的冰晶，碎在目标身上、冻住脚下地面；
 *   尖刺加农炮 —— 直线重钉，穿一排、把人顶开；
 *   岩石爆击   —— 唯一走弧线、唯一把落点砸成碎石堆的一发发重石。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   shard  单石威力：物攻定石头的分量，体重让重精灵掰的石更沉。
 *   shots  投石数：物攻与等级决定这一梭有几块，体重越大越少（掰大块）；夹 2..5（巨岩收在 3）。
 *   gap    间隔：速度决定石块一块接一块抛得多密。
 *   velocity 石速：物攻定抛得多快。
 *   arc    弧坠：体重定石头落得快不快，重精灵抛得更平。
 *   radius 石块判定：体型高度定单块石头的碰撞大小。
 *   reach  射程：物攻与等级决定能抛多远，也是本招的实际射程来源。
 *   spread 散布：速度与配置决定石块散多开（原生 90 命中的翻译）。
 *   chips  碎岩量：物攻换算的碎屑量，驱动命中表现。
 *   rubble 碎石存续：等级与配置决定落点碎石留多久。
 *   tempo／aftercast／recharge：速度定节奏，巨岩更慢更长。
 *
 * 配置 `boulder`（巨岩式）双向取舍（默认关）：
 *   开＝单石威力 ×1.4、石块更大、散布收 0.6 倍、弧更陡；代价是投石数收在 3、间隔 +2 刻、弧坠略高、起手 +3 刻、冷却 +5 刻。
 *   关（碎岩霰弹）＝投石数可到 5、间隔更密、抛得更快；代价是单石威力 ×0.85、石块更小、散布 ×1.2。
 *
 * 伤害段 `shard` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在每块命中时另算。
 * `bullet` 标记随本段声明，和原生的子弹类招式一致。
 */
namespace PokemonSkills {
    actionParameters.define("rockblast", {
        /** 单石威力：基础 25；物攻每比 55 多 1 加 0.18（夹 −5..15）；等级每比 25 多 1 加 0.28（夹 0..8）；
         *  体重每比 40kg 多 1kg 加 0.02（夹 −0.6..4）；巨岩 ×1.4 / 霰弹 ×0.85；夹 14..62。 */
        shard: formula(
            F.base(25)
                .plus(F.stat("attack").minus(55).times(0.18).clamp(-5, 15))
                .plus(F.level().minus(25).times(0.28).clamp(0, 8))
                .plus(F.body("weight").minus(40).times(0.02).clamp(-0.6, 4))
                .times(F.when(F.pref("boulder", text("worldcombat.skill.rockblast.preference.boulder")), F.const(1.4), F.const(0.85)))
                .clamp(14, 62).round(1),
            "单石威力", {
                unit: "威力",
                description: "每一块石头砸上去的威力；总数乘起来才是这一梭的分量。物攻定分量，体重让重精灵掰的石更沉。巨岩式更重。对手防御、相性与暴击在每块命中时另算。"
            }),
        /** 投石数：基础 2 + 物攻偏移[0,1.5] + 等级(≥25)偏移[0,1] − 体重偏移(重精灵少抛)[−1,0.6]；向下取整；
         *  巨岩上限 3、霰弹上限 5；夹 2..5。 */
        shots: formula(
            F.base(2)
                .plus(F.stat("attack").minus(55).times(0.012).clamp(0, 1.5))
                .plus(F.const(40).minus(F.body("weight")).times(0.006).clamp(-1, 0.6))
                .plus(F.level().minus(25).times(0.02).clamp(0, 1))
                .floor()
                .clamp(F.when(F.pref("boulder", text("worldcombat.skill.rockblast.preference.boulder")), F.const(2), F.const(2)),
                    F.when(F.pref("boulder", text("worldcombat.skill.rockblast.preference.boulder")), F.const(3), F.const(5))),
            "投石数", {
                unit: "块",
                description: "这一梭掰出几块石头；物攻与等级越高越多，体格越重越少（掰的是大块，原生 2～5）。巨岩式收在 3 块，霰弹式可到 5 块。"
            }),
        /** 间隔：基础 6 刻，速度每比 55 快 1 减 0.02（夹 −1..1.5）；巨岩 +2 / 霰弹 −1；夹 3..9。 */
        gap: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5))
                .plus(F.when(F.pref("boulder", text("worldcombat.skill.rockblast.preference.boulder")), F.const(2), F.const(-1)))
                .clamp(3, 9).round(0),
            "间隔", "两块石头之间隔多久抛出；速度越快越密，巨岩更从容、霰弹更急。"),
        /** 石速：基础 1.15，物攻每比 55 多 1 加 0.004（夹 −0.08..0.2）；巨岩 ×0.92；夹 0.9..1.5。 */
        velocity: formula(
            F.base(1.15).plus(F.stat("attack").minus(55).times(0.004).clamp(-0.08, 0.2))
                .times(F.when(F.pref("boulder", text("worldcombat.skill.rockblast.preference.boulder")), F.const(0.92), F.const(1.0)))
                .clamp(0.9, 1.5).round(2),
            "石速", {
                unit: "格/刻",
                description: "每块石头抛出的速度；物攻高的个体抛得更急。巨岩更沉、稍慢。"
            }),
        /** 弧坠：基础 0.024，体重每比 40kg 多 1kg 加 0.00008（夹 −0.006..0.012）；夹 0.016..0.04。 */
        arc: formula(
            F.base(0.024).plus(F.body("weight").minus(40).times(0.00008).clamp(-0.006, 0.012)).clamp(0.016, 0.04).round(4),
            "弧坠", {
                unit: "格/刻²",
                description: "石头抛出后落得多快；重精灵抛得平、轻精灵抛得吊。它决定画面里的弧线高度。"
            }),
        /** 石块判定：基础 0.28 格，碰撞箱每比 1.4 高 0.06（夹 −0.05..0.18）；巨岩 ×1.3；夹 0.2..0.55。 */
        radius: formula(
            F.base(0.28).plus(F.body("height").minus(1.4).times(0.06).clamp(-0.05, 0.18))
                .times(F.when(F.pref("boulder", text("worldcombat.skill.rockblast.preference.boulder")), F.const(1.3), F.const(1.0)))
                .clamp(0.2, 0.55).round(2),
            "石块判定", {
                unit: "格",
                description: "单块石头飞行与命中的判定大小；体型越高石头越大，巨岩更大。画出的石块大小与它一致。"
            }),
        /** 射程：基础 7，物攻每比 55 多 1 加 0.03（夹 −1..2.5），等级每比 25 多 1 加 0.06（夹 0..2）；夹 5..12。 */
        reach: formula(
            F.base(7)
                .plus(F.stat("attack").minus(55).times(0.03).clamp(-1, 2.5))
                .plus(F.level().minus(25).times(0.06).clamp(0, 2))
                .clamp(5, 12).round(1),
            "射程", {
                unit: "格",
                description: "石头能抛到多远；物攻与等级越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 散布：基础 3.4°，速度每比 55 快 1 加 0.03°（夹 0..2.4）；巨岩 ×0.6 / 霰弹 ×1.2；夹 1.5..9。 */
        spread: formula(
            F.base(3.4).plus(F.stat("speed").minus(55).times(0.03).clamp(0, 2.4))
                .times(F.when(F.pref("boulder", text("worldcombat.skill.rockblast.preference.boulder")), F.const(0.6), F.const(1.2)))
                .clamp(1.5, 9).round(1),
            "散布", {
                unit: "°",
                description: "每块石头抛出时的随机偏角；速度快的个体抛得散。这就是原生 90 命中的翻译：散得越开，远处的目标越容易被漏掉，贴脸才吃得满。巨岩收得更紧、霰弹更开。"
            }),
        /** 碎岩量：基础 10，物攻每比 55 多 1 加 0.14（夹 −3..12）；巨岩 ×1.6；夹 8..30。 */
        chips: formula(
            F.base(10).plus(F.stat("attack").minus(55).times(0.14).clamp(-3, 12))
                .times(F.when(F.pref("boulder", text("worldcombat.skill.rockblast.preference.boulder")), F.const(1.6), F.const(1.0)))
                .clamp(8, 30).round(0),
            "碎岩量", {
                unit: "片",
                description: "每块石头撞碎时崩出的岩屑数量，由物攻换算；它驱动命中的碎屑表现，不是独立伤害。"
            }),
        /** 碎石存续：基础 80 刻，等级每比 25 多 1 加 1.2（夹 0..60）；巨岩 ×1.4；夹 60..220。 */
        rubble: seconds(
            F.base(80).plus(F.level().minus(25).times(1.2).clamp(0, 60))
                .times(F.when(F.pref("boulder", text("worldcombat.skill.rockblast.preference.boulder")), F.const(1.4), F.const(1.0)))
                .clamp(60, 220).round(0),
            "碎石存续", "落点崩出的碎石留多久；等级越高、巨岩式留得越久，到期原方块回来。"),
        /** 起手：基础 9 刻，速度每比 55 快 1 减 0.04（夹 −1.5..2.5）；巨岩 +3；夹 4..14。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("boulder", text("worldcombat.skill.rockblast.preference.boulder")), F.const(3), F.const(0)))
                .clamp(4, 14).round(0),
            "起手", "从脚下掰出第一块石头、掀开地面的时间；速度越快越短，巨岩要多掰一下。"),
        /** 收招：基础 8 刻，速度每比 55 快 1 减 0.03（夹 −1..2）；夹 4..11。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(4, 11).round(0),
            "收招", "这一梭抛完、甩掉手上的碎石的时间；快的个体更利落。"),
        /** 冷却：基础 28 刻，速度每比 55 快 1 减 0.05（夹 −3..5）；巨岩 +5 / 霰弹 −3；夹 16..44。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 5))
                .plus(F.when(F.pref("boulder", text("worldcombat.skill.rockblast.preference.boulder")), F.const(5), F.const(-3)))
                .clamp(16, 44).round(0),
            "冷却", "再掰一梭石头前等待多久；巨岩更长、霰弹更短。")
    });

    stages("rockblast", [
        { level: 30, values: { shard: 32, shots: 3 } },
        { level: 46, values: { shard: 40, reach: 10 } }
    ]);

    defineDamage("rockblast", "shard", {}, { flags: { bullet: true } });

    describe("rockblast", [
        { key: "description.0", values: ["shard", "shots"] },
        { key: "description.1", values: ["gap", "velocity", "reach", "spread"] },
        { key: "description.2", values: ["radius", "arc"] },
        { key: "boulder.on", values: [], when: function (context) { return read(context.detail.values, ["boulder"]) === true; } },
        { key: "boulder.off", values: [], when: function (context) { return read(context.detail.values, ["boulder"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shard", "tier.0.shots"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shard", "tier.1.reach"] }
    ]);
}
