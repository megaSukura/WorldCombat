/**
 * 苹果酸 / appleacid —— 参数与伤害段。
 *
 * 原生事实：Grass／特殊／威力 80／命中 100／PP 10／target normal／追加 100% 令目标特防 −1。
 * （Cobblemon 1.8，正式学习者：苹裹龙 / Flapple。）
 *
 * 翻译：把「从酸苹果里提取的酸性液体」落成一颗**真的酸苹果被扔出去**——它沿弧线飞过一段距离，砸中目标时
 * 爆成酸浆、溅到落点周围所有人，每人特防 −1；被酸到的人会带着一层**发酵**（共享身份
 * `world_combat:status/sour`），短时间内再挨一颗酸苹果时第二口更狠（−2），因为酸已经在身上发了。落点留下
 * 一小摊冒泡的酸浆，走进去的人会被浸到发酵、留在里面还会被反复咬；苹果核落在地上，谁都能捡。
 * 它是四式里唯一扔出真东西、唯一能对同一目标叠酸的那个：第一颗磨、第二颗狠。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core          砸击威力：特攻定酸浆的腐蚀性，等级给成长。
 *   splash        溅射威力：特攻定溅到周围人身上的酸量。
 *   patch         酸浆每跳威力：特攻定残留酸浆的腐蚀性。
 *   globSpeed     投掷速度：速度决定苹果飞得多急。
 *   globRadius    苹果判定：身高决定苹果大小。
 *   reach         施放距离：等级与身高决定能在多远扔到。
 *   splashRadius  溅射半径：体型与特攻共同决定溅开多大。
 *   patchRadius   酸浆半径：体型决定酸浆摊多开。
 *   patchTicks    酸浆时长：等级与特攻决定残留多久。
 *   patchPulse    酸浆间隔：速度决定两跳之间隔多久。
 *   sourStages    首次酸蚀级数：固定 1 级特防，与原生一致。
 *   secondStages  叠酸级数：目标已带发酵身份时，改为固定 2 级特防。
 *   sourTicks     发酵时长：等级与特攻决定发酵在目标身上留多久。
 *   cores         苹果粒数：特攻与等级派生，也驱动表现。
 *   tempo         起手：速度决定取果出手的快慢。
 *
 * 配置 `ferment`（发酵式）双向取舍：开启＝苹果飞得更慢、砸击与溅射略轻、溅射范围更小，但发酵时长 ×1.6、
 * 酸浆更久（×1.3），更容易对同一目标叠到 −2；关闭（爆汁式）＝一发砸得更痛、溅得更开、飞得更快，但酸留不久。
 * 两向分别对应「盯住一个叠酸」与「一次溅开一片」。
 *
 * 伤害段 `core`（砸击）、`splash`（溅射）、`patch`（酸浆每跳）各自成段，走共享换算（原生类别 Special）。
 * 特防下降走共享能力等级阶梯 NativeEffects.boost(..., "spd", -N)。
 */
namespace PokemonSkills {
    actionParameters.define("appleacid", {
        /** 砸击威力：62 + 特攻偏移[−12,32] + 等级(≥30)偏移[0,11]；发酵 ×0.9；夹 44..142。 */
        core: formula(
            F.base(62)
                .plus(F.stat("specialAttack").minus(55).times(0.3).clamp(-12, 32))
                .plus(F.level().minus(30).times(0.4).clamp(0, 11))
                .times(F.when(F.pref("ferment"), F.const(0.9), F.const(1)))
                .clamp(44, 142).round(1),
            "砸击威力", {
                unit: "威力",
                description: "酸苹果砸中目标时结算一次的威力；特攻越高酸浆越腐蚀、等级越高越经用，发酵式把力让给叠酸。对手特防、相性与暴击在命中时另算。"
            }),
        /** 溅射威力：24 + 特攻偏移[−5,14]；夹 14..54。 */
        splash: formula(
            F.base(24).plus(F.stat("specialAttack").minus(55).times(0.12).clamp(-5, 14)).clamp(14, 54).round(1),
            "溅射威力", {
                unit: "威力",
                description: "酸浆溅到落点周围其他敌人身上时各结算一次的威力；特攻越高溅酸越狠。"
            }),
        /** 酸浆威力：7 + 特攻偏移[−2,8]；夹 4..20。 */
        patch: formula(
            F.base(7).plus(F.stat("specialAttack").minus(55).times(0.04).clamp(-2, 8)).clamp(4, 20).round(1),
            "酸浆威力", {
                unit: "威力",
                description: "落点酸浆每跳一次对圈内每人造成的伤害；特攻越高残留越咬人。"
            }),
        /** 投掷速度：0.95 + 速度偏移[−0.12,0.4]；发酵 ×0.85；夹 0.7..1.5。 */
        globSpeed: formula(
            F.base(0.95).plus(F.stat("speed").minus(50).times(0.006).clamp(-0.12, 0.4))
                .times(F.when(F.pref("ferment"), F.const(0.85), F.const(1)))
                .clamp(0.7, 1.5).round(2),
            "投掷速度", {
                unit: "格/刻",
                description: "酸苹果脱手时的初速；速度快的个体扔得更急、目标更难躲，发酵式慢一点。"
            }),
        globGravity: hidden(0.045),
        /** 苹果判定：0.22 + 身高偏移[−0.03,0.16]；夹 0.2..0.42。 */
        globRadius: formula(
            F.base(0.22).plus(F.body("height").minus(1.4).times(0.06).clamp(-0.03, 0.16)).clamp(0.2, 0.42).round(2),
            "苹果判定", {
                unit: "格",
                description: "酸苹果飞行与落地判定的半径；体型越高苹果越大。"
            }),
        /** 施放距离：10 + 等级(≥25)偏移[0,4] + 高度偏移[−0.3,1.2]；发酵 ×0.92；夹 7..15。 */
        reach: formula(
            F.base(10)
                .plus(F.level().minus(25).times(0.08).clamp(0, 4))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.2))
                .times(F.when(F.pref("ferment"), F.const(0.92), F.const(1)))
                .clamp(7, 15).round(2),
            "施放距离", {
                unit: "格",
                description: "能把苹果扔到多远；等级与身高越高扔得越远。它也是本招的实际射程。"
            }),
        /** 溅射半径：2.2 + 高度偏移[−0.3,0.9] + 特攻偏移[−0.3,0.7]；发酵 ×0.8；夹 1.5..4.4。 */
        splashRadius: formula(
            F.base(2.2)
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 0.9))
                .plus(F.stat("specialAttack").minus(55).times(0.006).clamp(-0.3, 0.7))
                .times(F.when(F.pref("ferment"), F.const(0.8), F.const(1)))
                .clamp(1.5, 4.4).round(2),
            "溅射半径", {
                unit: "格",
                description: "酸浆能溅到落点周围多大一圈；大个子、特攻高的人溅得更开，发酵式收小。"
            }),
        /** 酸浆半径：1.8 + 高度偏移[−0.2,0.7]；夹 1.4..3.2。 */
        patchRadius: formula(
            F.base(1.8).plus(F.body("height").minus(1.4).times(0.35).clamp(-0.2, 0.7)).clamp(1.4, 3.2).round(2),
            "酸浆半径", {
                unit: "格",
                description: "落点那摊酸浆摊开多大；体型越高摊得越开。"
            }),
        /** 酸浆时长：60 + 等级(≥30)偏移[0,32] + 特攻偏移[−4,14]；发酵 ×1.3；夹 40..150。 */
        patchTicks: seconds(
            F.base(60)
                .plus(F.level().minus(30).times(1.0).clamp(0, 32))
                .plus(F.stat("specialAttack").minus(55).times(0.2).clamp(-4, 14))
                .times(F.when(F.pref("ferment"), F.const(1.3), F.const(1)))
                .clamp(40, 150).round(0),
            "酸浆时长", "落点那摊酸浆停留多久；等级与特攻越高、发酵式留得越久。"),
        /** 酸浆间隔：20 − 速度偏移[−3,6]；夹 12..28。 */
        patchPulse: seconds(
            F.base(20).minus(F.stat("speed").minus(50).times(0.06).clamp(-3, 6)).clamp(12, 28).round(0),
            "酸浆间隔", "酸浆两跳之间隔多久；速度快的个体咬得更密。"),
        /** 首次酸蚀级数：固定 1 级特防，与原生一致。 */
        sourStages: formula(
            F.base(1),
            "首次酸蚀级数", {
                unit: "级",
                description: "第一次被酸苹果命中时令目标特防下降的等级；原生「降低特防」即 1 级。"
            }),
        /** 叠酸级数：目标已带发酵身份时，改为固定 2 级特防。 */
        secondStages: formula(
            F.base(2),
            "叠酸级数", {
                unit: "级",
                description: "目标已经带着发酵身份时，再被酸苹果命中改为下降的等级——第二口更狠。"
            }),
        /** 发酵时长：60 + 等级(≥30)偏移[0,30] + 特攻偏移[−5,16]；发酵式 ×1.6；夹 40..160。 */
        sourTicks: seconds(
            F.base(60)
                .plus(F.level().minus(30).times(0.9).clamp(0, 30))
                .plus(F.stat("specialAttack").minus(55).times(0.25).clamp(-5, 16))
                .times(F.when(F.pref("ferment"), F.const(1.6), F.const(1)))
                .clamp(40, 160).round(0),
            "发酵时长", "被酸到后发酵身份在目标身上留多久；这段时间内再挨一颗酸苹果就会更狠。"),
        /** 苹果粒数：12 + 特攻偏移[−2,6] + 等级(≥30)偏移[0,8]；夹 10..38。 */
        cores: formula(
            F.base(12)
                .plus(F.stat("specialAttack").minus(55).times(0.12))
                .plus(F.level().minus(30).times(0.3))
                .clamp(10, 38).round(),
            "苹果粒数", {
                unit: "粒",
                description: "酸苹果与酸浆的粒子数量，也驱动表现密度；特攻与等级越高越密。"
            }),
        /** 起手：10 − 速度偏移[−? ,?]；夹 6..14。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(50).times(0.04)).clamp(6, 14).round(),
            "起手", "摸出酸苹果、掂一掂再扔出的时间；速度越快越短。")
    });

    defineDamage("appleacid", "core", {});
    defineDamage("appleacid", "splash", {});
    defineDamage("appleacid", "patch", {});

    stages("appleacid", [
        { level: 35, values: { core: 70, splashRadius: 2.5 } }
    ]);

    describe("appleacid", [
        { key: "description.0", values: ["core", "sourStages"] },
        { key: "description.1", values: ["reach", "globSpeed", "splashRadius", "splash"] },
        { key: "description.2", values: ["secondStages", "sourTicks"] },
        { key: "description.3", values: ["patchRadius", "patch", "patchTicks", "patchPulse"] },
        { key: "ferment.on", values: ["core", "sourTicks", "patchTicks"],
            when: function (context) { return read(context.detail.values, ["ferment"]) === true; } },
        { key: "ferment.off", values: ["core", "splashRadius", "sourTicks"],
            when: function (context) { return read(context.detail.values, ["ferment"]) !== true; } },
        { key: "timing", values: ["reach", "tempo", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core", "tier.0.splashRadius"] }
    ]);
}
