/**
 * 冲天拳 / skyuppercut 的参数与伤害段。
 *
 * 原生事实：Fighting／物理／威力 85／命中 90／PP 15／优先度 0／接触／punch，无追加效果（Cobblemon 1.8，14 位学习者）。
 * 描述「用冲向天空般高高的上勾拳顶起对手进行攻击」；原生可命中空中目标。
 *
 * 翻译：把「冲向天空般高高的上勾拳」翻成**蹲身把拳压到最低，再沿身前一条竖直的弧线一口气挑上去**——被挑中的人
 * 被整个顶离地面（垂直位移，而不是沿地面推远），随后按重力落回；对已经离地的目标这一挑更狠，
 * 这是原生「可命中空中」的落点。它是全族唯一把对手送上天的一记（其余都是沿地面推远或穿过）。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   uppercut   上勾威力：物攻定拳面、等级给爆发；冲天式把力分到挑高上、贯顶式更重。
 *   lift       上抛初速：体重决定挑得多高；冲天式更高、贯顶式更低。
 *   push       水平顶开：体重给一点前送，让被挑的人落在身后一点。
 *   reach      拳程：身高给臂长与探身，也是实际射程。
 *   arc        上勾扇角：体宽决定这一记扫多宽，多宽的对手会被同一记顶起。
 *   airReach   竖直覆盖：身高决定拳能挑到头顶多高——够到空中的目标靠它。
 *   airBonus   离地加成：速度让快的个体把空中的破绽打得更狠。
 *   sparks     崩屑量：物攻换算，驱动表现。
 *   tempo／aftercast／recharge：速度与等级定节奏，冲天式更费。
 *
 * 配置 `rising`（冲天式，默认开）双向取舍：开启＝上抛初速 ×1.35、竖直覆盖更高，代价是威力 ×0.88、起手 +1 刻、
 * 收招 +1 刻、冷却 +5 刻（把人顶到空中、给下一拍创造机会）；关闭（贯顶式）＝威力 ×1.12、收招更快、冷却更短，
 * 代价是上抛初速 ×0.75、挑不高（更像一记重的近身上勾）。
 *
 * 伤害段 `uppercut` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("skyuppercut", {
        /** 上勾威力：82 + 物攻偏移[−12,38] ×0.42 + 等级偏移[−6,16] ×0.3；冲天 ×0.88 / 贯顶 ×1.12；夹 58..152。 */
        uppercut: formula(
            F.base(82).plus(F.stat("attack").minus(60).times(0.42).clamp(-12, 38))
                .plus(F.level().minus(28).times(0.3).clamp(-6, 16))
                .times(F.when(F.pref("rising", text("worldcombat.skill.skyuppercut.preference.rising")), F.const(0.88), F.const(1.12)))
                .clamp(58, 152).round(1),
            "上勾威力", {
                unit: "威力",
                description: "上勾拳顶中目标那一下的基础威力；物攻定拳面、等级给爆发。冲天式把力分到挑高上，贯顶式更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 上抛初速：0.55 + 体重偏移[0,0.3] ×0.0014 + 速度偏移[−0.08,0.22] ×0.004；冲天 ×1.35 / 贯顶 ×0.75；夹 0.25..1.1。 */
        lift: formula(
            F.base(0.55).plus(F.body("weight").minus(60).times(0.0014).clamp(0, 0.3))
                .plus(F.stat("speed").minus(60).times(0.004).clamp(-0.08, 0.22))
                .times(F.when(F.pref("rising", text("worldcombat.skill.skyuppercut.preference.rising")), F.const(1.35), F.const(0.75)))
                .clamp(0.25, 1.1).round(2),
            "上抛初速", {
                unit: "格/刻",
                description: "把目标顶离地面时的向上初速；身体越沉、出手越快挑得越高。被挑的人随后按重力落回，在空中腾起的这一段时间就是给下一拍的机会。"
            }),
        /** 水平顶开：0.25 + 体重偏移[0,0.3] ×0.001；夹 0.1..0.6。 */
        push: formula(
            F.base(0.25).plus(F.body("weight").minus(60).times(0.001).clamp(0, 0.3)).clamp(0.1, 0.6).round(2),
            "水平顶开", {
                unit: "格",
                description: "上勾同时把目标朝瞄准方向送出一点；体重给的份量。"
            }),
        /** 拳程：2.3 + 身高偏移[−0.25,0.75] ×0.45；夹 1.9..3.2。 */
        reach: formula(
            F.base(2.3).plus(F.body("height").minus(1.4).times(0.45).clamp(-0.25, 0.75)).clamp(1.9, 3.2).round(2),
            "拳程", {
                unit: "格",
                description: "上勾拳能顶到多近的目标；身高给臂长与探身。它也是本招的实际射程来源。"
            }),
        /** 上勾扇角：66 + 体宽偏移[−8,22] ×24；夹 46..104 度。 */
        arc: formula(
            F.base(66).plus(F.body("width").minus(0.9).times(24).clamp(-8, 22)).clamp(46, 104).round(0),
            "上勾扇角", {
                unit: "度",
                description: "这一记扫开多大扇面；身板越宽的个体一记能同时顶起更多并排的人。画面里那条竖直的弧就是它。"
            }),
        /** 竖直覆盖：2.2 + 身高偏移[−0.3,1.0] ×0.6；夹 1.8..3.6。 */
        airReach: formula(
            F.base(2.2).plus(F.body("height").minus(1.4).times(0.6).clamp(-0.3, 1.0)).clamp(1.8, 3.6).round(2),
            "竖直覆盖", {
                unit: "格",
                description: "拳能挑到头顶多高——够到空中的目标靠它；高个子抡得更高。它决定这一记能不能打到已经离地的对手。"
            }),
        /** 离地加成：1.3 + 速度偏移[−0.1,0.25] ×0.002；夹 1.1..1.6。 */
        airBonus: formula(
            F.base(1.3).plus(F.stat("speed").minus(60).times(0.002).clamp(-0.1, 0.25)).clamp(1.1, 1.6).round(2),
            "离地加成", {
                unit: "倍",
                description: "目标不在空中时不吃；离地时伤害乘上它——出手快的个体把空中的破绽打得更狠，这是原生「可命中空中」的落点。"
            }),
        /** 崩屑量：16 + 物攻偏移[−4,12] ×0.12；夹 10..38。 */
        sparks: formula(
            F.base(16).plus(F.stat("attack").minus(60).times(0.12).clamp(-4, 12)).clamp(10, 38).round(0),
            "崩屑量", {
                unit: "个",
                description: "上勾命中的一下崩出的碎屑数量，由物攻换算；表现按它发射，不是独立伤害。"
            }),
        /** 起手：8 − 速度偏移[−1.5,2.5] ×0.03 + 冲天 +1；夹 4..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("rising", text("worldcombat.skill.skyuppercut.preference.rising")), F.const(1), F.const(0)))
                .clamp(4, 14).round(0),
            "起手", "蹲身把拳压到最低、蓄足挑劲的时间；速度越快越短。"),
        /** 收招：9 − 速度偏移[−1.5,2] ×0.02 + 冲天 +1；夹 5..16。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("rising", text("worldcombat.skill.skyuppercut.preference.rising")), F.const(1), F.const(0)))
                .clamp(5, 16).round(0),
            "收招", "挑完把身势收住、落回架式的时间；速度越快越短。"),
        /** 冷却：32 − 等级偏移[0,6] ×0.15 + 冲天 +5；夹 18..46。 */
        recharge: seconds(
            F.base(32).minus(F.level().minus(28).times(0.15).clamp(0, 6))
                .plus(F.when(F.pref("rising", text("worldcombat.skill.skyuppercut.preference.rising")), F.const(5), F.const(0)))
                .clamp(18, 46).round(0),
            "冷却", "两次上勾之间等多久；等级越高回得越快，冲天式更费。")
    });

    stages("skyuppercut", [
        { level: 30, values: { uppercut: 92 } },
        { level: 50, values: { uppercut: 104, lift: 0.8 } }
    ]);

    defineDamage("skyuppercut", "uppercut", {}, { contact: true, punch: true });

    describe("skyuppercut", [
        { key: "description.0", values: ["uppercut","reach","arc"] },
        { key: "description.1", values: ["lift","push","airReach"] },
        { key: "description.2", values: ["airBonus"] },
        { key: "rising.on", values: ["lift", "uppercut"], when: function (context) { return read(context.detail.values, ["rising"]) === true; } },
        { key: "rising.off", values: ["lift", "uppercut"], when: function (context) { return read(context.detail.values, ["rising"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.uppercut"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.uppercut", "tier.1.lift"] }
    ]);
}
