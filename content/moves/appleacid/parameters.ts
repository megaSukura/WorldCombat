/**
 * 苹果酸 / appleacid —— 参数与伤害段。
 *
 * 原生事实：Grass／特殊／威力 80／命中 100／PP 10／target normal／追加 100% 令目标特防 −1。
 * （Cobblemon 1.8，正式学习者：苹裹龙 / Flapple。）
 *
 * 翻译：扔出一颗真的酸苹果砸向**单体**目标。命中时结算特殊伤害、令其特防 −1，并在目标身上留下一层
 * 本招自己的**发酵**短窗（共享身份 world_combat:status/sour）；窗口内再命中同一目标，第二口更狠（−2）
 * 并把发酵消费掉，之后重新从 −1 起算。它只结算直接命中的那一个目标：不溅射、不留酸场、落空不赠苹果。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core          砸击威力：特攻定酸液腐蚀性，等级给成长。
 *   globSpeed     投掷速度：速度决定苹果飞得多急。
 *   globRadius    苹果判定：身高决定苹果大小。
 *   reach         施放距离：等级与身高决定能在多远扔到，也是本招实际射程。
 *   sourStages    首次酸蚀级数：固定 1 级特防，与原生一致。
 *   secondStages  叠酸级数：目标已带发酵时改为固定 2 级特防，并消费那层发酵。
 *   sourTicks     发酵时长：等级与特攻决定窗口；下限保证冷却走完仍赶得上第二口。
 *   cores         苹果粒子数：内部表现数量，不向玩家显示。
 *   tempo         起手：速度决定取果出手的快慢。
 *
 * 配置 `ferment`（发酵式）双向取舍：开启＝苹果飞得更慢、砸击略轻、射程略短，但发酵窗口 ×1.6，
 * 更容易对同一目标接上第二口；关闭（爆汁式）＝一发更痛、飞得更快、射得更远，但酸留不久。
 * 冷却在发酵式下 +10（见 skill.ts）。
 *
 * 伤害段只有 `core`（直接命中），走共享换算（原生类别 Special）。特防下降走共享能力等级阶梯
 * NativeEffects.boost(..., "spd", -N)。
 */
namespace PokemonSkills {
    /** 续击窗口下限：本档实际冷却（48／发酵式 58）+ 起手 + 常规投递余量，保证冷却走完仍能接上第二口。 */
    function appleacidRehitFloor(): Formula.Node {
        return F.when(F.pref("ferment"), F.const(58), F.const(48))
            .plus(F.base(10).minus(F.stat("speed").minus(50).times(0.04)).clamp(6, 14))
            .plus(8);
    }

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
                description: "酸苹果砸中目标时结算一次的威力；特攻越高酸液越腐蚀、等级越高越经用，发酵式把力让给更长的窗口。对手特防、相性与暴击在命中时另算。"
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
        /** 首次酸蚀级数：固定 1 级特防，与原生一致。 */
        sourStages: formula(
            F.base(1),
            "首次酸蚀级数", {
                unit: "级",
                description: "第一次被酸苹果命中时令目标特防下降的等级；原生「降低特防」即 1 级，并给目标留下发酵。"
            }),
        /** 叠酸级数：目标已带发酵身份时，改为固定 2 级特防，并消费掉发酵窗口。 */
        secondStages: formula(
            F.base(2),
            "叠酸级数", {
                unit: "级",
                description: "目标已经带着发酵身份时，再被酸苹果命中改为下降的等级——第二口更狠，且这一口会把发酵窗口消费掉。"
            }),
        /**
         * 发酵时长：60 + 等级(≥30)偏移[0,30] + 特攻偏移[−5,16]；发酵式 ×1.6；
         * 下限按本档实际冷却 + 起手 + 常规投递余量，保证冷却走完仍能赶上同一个目标身上的第二口。
         */
        sourTicks: seconds(
            F.base(60)
                .plus(F.level().minus(30).times(0.9).clamp(0, 30))
                .plus(F.stat("specialAttack").minus(55).times(0.25).clamp(-5, 16))
                .times(F.when(F.pref("ferment"), F.const(1.6), F.const(1)))
                .clamp(appleacidRehitFloor(), 160).round(0),
            "发酵时长", "被酸到后本招的发酵在目标身上留多久；这段时间内再让同一目标吃到一颗就会更狠。下限按本档冷却与出手预算，保证冷却走完仍接得上第二口。"),
        /** 苹果粒子数：12 + 特攻偏移[−2,6] + 等级(≥30)偏移[0,8]；夹 10..38。内部表现数量。 */
        cores: formula(
            F.base(12)
                .plus(F.stat("specialAttack").minus(55).times(0.12))
                .plus(F.level().minus(30).times(0.3))
                .clamp(10, 38).round(),
            "苹果粒数", {
                unit: "粒", visible: false,
                description: "酸苹果与命中表现的粒子数量，随特攻与等级增长；只用于画面密度，不向玩家展示。"
            }),
        /** 起手：10 − 速度偏移；夹 6..14。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(50).times(0.04)).clamp(6, 14).round(),
            "起手", "摸出酸苹果、掂一掂再扔出的时间；速度越快越短。")
    });

    defineDamage("appleacid", "core", {});

    stages("appleacid", [
        { level: 35, values: { core: 70 } }
    ]);

    describe("appleacid", [
        { key: "description.0", values: ["core", "sourStages"] },
        { key: "description.1", values: ["reach", "globSpeed"] },
        { key: "description.2", values: ["secondStages", "sourTicks"] },
        { key: "ferment.on", values: ["core", "sourTicks"],
            when: function (context) { return read(context.detail.values, ["ferment"]) === true; } },
        { key: "ferment.off", values: ["core", "sourTicks"],
            when: function (context) { return read(context.detail.values, ["ferment"]) !== true; } },
        { key: "timing", values: ["reach", "tempo", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core"] }
    ]);
}
