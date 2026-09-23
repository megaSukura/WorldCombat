/**
 * 冲浪 / surf 的参数与伤害段。
 *
 * 原生事实：Water／特殊／威力 90／命中 100／PP 15／target allAdjacent（自己周围所有宝可梦）／
 *   flags 带 nonsky（不命中离地的东西）、无次要效果。
 *
 * 翻译：把「利用大浪」翻成**从脚下把一整圈水向外掀开**——它不是水柱，也不是朝一个方向的浪墙
 *   （那是水流尾、波动冲），而是施法者踏着浪原地转一圈，水从身下同时漫过四面，地上与空中的目标一起被淹。
 *   被浪推着往外走的人被浇透（共享身份 world_combat:status/soaked），身上的火与灼伤被浇熄；
 *   浪头扫过的地面明火也被一格一格沤灭。与同族分开：
 *     冲浪     —— 360 度整圈同时漫开，是水做的**体积**，地上空中一起淹，施法者本身就是水源；
 *     震级     —— 地面只在原地颤，离地的人不受影响；
 *     自爆     —— 用一条命换来的一颗紧凑火球；
 *     大爆炸   —— 更大更慢、炸完留下弹坑。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   surge        浪涌威力 90 + 特攻偏移 + 等级偏移；自己湿透（雨里、水里）时水势更盛。
 *   waveRadius   浪墙半径 4.6 格 + 碰撞箱宽度偏移 + 等级偏移（个子宽、等级高掀得更开）。
 *   crest        浪头高度（垂直覆盖）2.2 格 + 碰撞箱高度偏移 + 特攻偏移（浪越高越能淹到空中的目标）。
 *   shove        向外推开 0.55 格 + 特攻偏移 + 体重偏移（水多、身体沉推得远）。
 *   soakTicks    浸湿时长 140 刻 + 特攻偏移 + 等级偏移（浇得越透挂得越久）。
 *   sweepTicks   浪头从脚下推到边缘的时间 8 刻 − 速度偏移（脚步快的人浪推得急）。
 *   spray        溅水量 22 + 特攻偏移 + 宽度偏移（同时驱动画面里每秒的水花数）。
 *   quench       每趟沤熄明火的预算 3 + 等级偏移。
 *   tempo／aftercast／recharge  速度与等级决定起手、收势与冷却。
 *
 * 配置 `tide`（涨潮式）：开启＝威力 ×1.14、浪头更高（×1.3）、推得更远（×1.25）、浸湿更久，但浪墙收窄到
 *   0.82 倍、起手 +3 刻、冷却 +10；关闭（平铺式）＝更广（×1.15）、更快，适合一次罩住一圈人。
 *   两向各有适用局面：涨潮打一两个重点目标的狠，平铺扫一片。
 *
 * 伤害段 `surge` 与参数同名，走共享换算（原始类别 Special、Water 属性）。
 */
namespace PokemonSkills {
    actionParameters.define("surf", {
        /** 浪涌威力：90 + 特攻偏移[−20,55] + 等级(≥25)偏移[0,22]；湿身 ×1.15；涨潮 ×1.14 / 平铺 ×0.9；夹 55..178。 */
        surge: formula(
            F.base(90)
                .plus(F.stat("specialAttack").minus(60).times(0.32).clamp(-20, 55))
                .plus(F.level().minus(25).times(0.5).clamp(0, 22))
                .times(F.when(F.state("wet", text("worldcombat.skill.surf.value.wet")), F.const(1.15), F.const(1)))
                .times(F.when(F.pref("tide", text("worldcombat.skill.surf.preference.tide")), F.const(1.14), F.const(0.9)))
                .clamp(55, 178).round(1),
            "浪涌威力", {
                unit: "威力",
                description: "整圈水漫过时，对圈内每个目标各结算一次的基础威力；特攻越高水势越猛，施法者自己湿透时再抬一档。对手特防、相性与暴击在命中时另算。"
            }),
        /** 浪墙半径：4.6 + 宽度偏移[−0.4,1.6] + 等级(≥25)偏移[0,1.5]；湿身 ×1.1；涨潮 ×0.82 / 平铺 ×1.15；夹 3.0..7.6。 */
        waveRadius: formula(
            F.base(4.6)
                .plus(F.body("width").minus(0.9).times(1.1).clamp(-0.4, 1.6))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.5))
                .times(F.when(F.state("wet", text("worldcombat.skill.surf.value.wet")), F.const(1.1), F.const(1)))
                .times(F.when(F.pref("tide", text("worldcombat.skill.surf.preference.tide")), F.const(0.82), F.const(1.15)))
                .clamp(3.0, 7.6).round(2),
            "浪墙半径", {
                unit: "格",
                description: "整圈水从脚下漫到多远；体型宽、等级高的个体掀得更开，施法者湿透时更广。它也是本招的实际射程与指示圈半径。"
            }),
        /** 浪头高度：2.2 + 高度偏移[−0.3,1.2] + 特攻偏移[−0.2,0.6]；涨潮 ×1.3 / 平铺 ×0.8；夹 1.2..4.2。 */
        crest: formula(
            F.base(2.2)
                .plus(F.body("height").minus(1.4).times(0.8).clamp(-0.3, 1.2))
                .plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.2, 0.6))
                .times(F.when(F.pref("tide", text("worldcombat.skill.surf.preference.tide")), F.const(1.3), F.const(0.8)))
                .clamp(1.2, 4.2).round(2),
            "浪头高度", {
                unit: "格",
                description: "浪立起来多高，决定离地多高的目标也会被淹到；身板高、特攻高的个体浪头更高。"
            }),
        /** 向外推开：0.55 + 特攻偏移[−0.12,0.5] + 体重偏移[−0.06,0.3]；涨潮 ×1.25 / 平铺 ×0.85；夹 0.25..1.4。 */
        shove: formula(
            F.base(0.55)
                .plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.12, 0.5))
                .plus(F.body("weight").minus(60).times(0.002).clamp(-0.06, 0.3))
                .times(F.when(F.pref("tide", text("worldcombat.skill.surf.preference.tide")), F.const(1.25), F.const(0.85)))
                .clamp(0.25, 1.4).round(2),
            "向外推开", {
                unit: "格",
                description: "被浪漫到时沿离中心的方向被推开的距离；特攻越高、身体越沉水推得越远。"
            }),
        /** 浸湿时长：140 + 特攻偏移[−25,90] + 等级(≥25)偏移[0,40]；涨潮 ×1.15 / 平铺 ×0.9；夹 80..320。 */
        soakTicks: seconds(
            F.base(140)
                .plus(F.stat("specialAttack").minus(60).times(0.6).clamp(-25, 90))
                .plus(F.level().minus(25).times(1.2).clamp(0, 40))
                .times(F.when(F.pref("tide", text("worldcombat.skill.surf.preference.tide")), F.const(1.15), F.const(0.9)))
                .clamp(80, 320).round(0),
            "浸湿时长", "被浪浇透的目标多久才干；特攻越高、等级越高挂得越久。别的单元可按共享身份 world_combat:status/soaked 消费它。"),
        /** 推进时间：8 − 速度偏移[−2,3]；夹 5..13。 */
        sweepTicks: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.015).clamp(-2, 3)).clamp(5, 13).round(0),
            "推进时间", "浪头从脚下推到最外圈要多久；脚步越快推得越急，目标越难在浪到之前走开。"),
        /** 溅水量：22 + 特攻偏移[−8,24] + 宽度偏移[−3,10]；夹 14..58。同时驱动画面密度。 */
        spray: formula(
            F.base(22)
                .plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-8, 24))
                .plus(F.body("width").minus(0.9).times(6).clamp(-3, 10))
                .clamp(14, 58).round(0),
            "溅水量", {
                unit: "点",
                description: "整圈水漫过时溅起的碎水量；特攻越高、身板越宽越多，也决定画面的密集程度。"
            }),
        /** 灭火预算：3 + 等级(≥20)偏移[0,5]；夹 2..8。 */
        quench: formula(
            F.base(3).plus(F.level().minus(20).max(0).times(0.08)).clamp(2, 8).round(0),
            "灭火预算", {
                unit: "处",
                description: "浪每趟按预算检查地面格、把明火沤熄几处；等级越高越能一趟扫掉更多火。"
            }),
        /** 起手：14 − 速度偏移[−3,5] + 涨潮 3；夹 9..21。 */
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 5))
                .plus(F.when(F.pref("tide", text("worldcombat.skill.surf.preference.tide")), F.const(3), F.const(0)))
                .clamp(9, 21).round(0),
            "起手", "水在脚下聚起、踏浪起身需要多久；速度越快越早掀浪，涨潮式要多蓄一会儿。"),
        /** 收招：10 − 速度偏移[−1,2]；夹 7..14。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.01).clamp(-1, 2)).clamp(7, 14).round(0),
            "收招", "浪推出去后收势需要多久；速度越快越利落。"),
        /** 冷却：44 − 等级(≥25)偏移[0,10] + 涨潮 10 / 平铺 −4；夹 30..64。 */
        recharge: seconds(
            F.base(44).minus(F.level().minus(25).times(0.2).clamp(0, 10))
                .plus(F.when(F.pref("tide", text("worldcombat.skill.surf.preference.tide")), F.const(10), F.const(-4)))
                .clamp(30, 64).round(0),
            "冷却", "两次掀浪之间要等多久；等级越高回手越快，涨潮式更久。"),
        maxTargets: hidden(12)
    });

    defineDamage("surf", "surge", {});

    stages("surf", [
        { level: 45, values: { surge: 112, waveRadius: 5.4, crest: 2.8 } }
    ]);

    describe("surf", [
        { key: "description.0", values: ["surge","maxTargets"] },
        { key: "description.1", values: ["waveRadius", "crest"] },
        { key: "description.2", values: ["shove","soakTicks"] },
        { key: "description.3", values: ["sweepTicks"] },
        { key: "description.4", values: ["quench"] },
        { key: "tide.on", values: [], when: function (context) { return read(context.detail.values, ["tide"]) === true; } },
        { key: "tide.off", values: [], when: function (context) { return read(context.detail.values, ["tide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.surge", "tier.0.waveRadius", "tier.0.crest"] }
    ]);
}
