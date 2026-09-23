/**
 * 突飞猛扑 / headlongrush 的参数与伤害段。本族「弃守强攻」冲得最远、最重的一记。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Ground／物理／威力 120／命中 100／PP 5／优先度 0／接触（含 punch 旗标）；
 *   self boosts { def: -1, spd: -1 }，无次要效果；target normal（单体）。已实装学习者 4 位。描述
 *   「向对手使出灌注了全心全力的撞击。自己的防御和特防会降低」。
 *
 * 翻译：把「用整个身体灌注全力的撞击」翻成即时战斗里的一次**低头直线猛冲**——助跑、顶住、把对手一路撞开，
 *   地面被犁出一道粗土沟。它是全族里唯一有助跑、有地面残留的一招，也是唯一把「自己有多重」写进参数的一招：
 *   越重的个体撞得越狠、把对手推得越远、犁出的沟越宽。弃守（自身防御与特防各降一级）在提交那一刻付。
 *
 * 与同族分开：近身战是不助跑的贴脸连打；铠农炮在远处；画龙点睛从天而降。与勇鸟猛攻比：勇鸟从空中沿一条线
 *   穿过目标；突飞猛扑贴地冲、撞到就停、把目标推走、在身后留下沟。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   charge      撞击威力：物攻给力、自身体重给压上去的分量、等级拾级；犁地式收薄。
 *   reach       冲距：速度决定起步多快、身高决定步幅；也是本招射程。
 *   rush        冲速：速度决定每刻推进多少。
 *   shove       撞飞距离：物攻与自身体重给冲量，**目标体重**把撞开距离压下来。
 *   furrow      犁沟宽度：自身体重决定压出的沟多宽、物攻决定碎得多开。
 *   furrowTicks 沟存在多久：等级决定。
 *   dust        翻起的土量：体重派生，驱动画面。
 *   guardLoss   自身防御下降级：原生固定 1 级；poiseLoss 同理。
 *   tempo/aftercast/recharge：速度定节奏，犁地式更慢更长。
 *
 * 配置 `plow`（犁地式，默认关）双向取舍：
 *   开＝冲距 ×1.15、撞飞 ×1.2、沟 ×1.3，但撞击威力 ×0.92、起手 +2 刻、收招 +3 刻、冷却 +5 刻。
 *   关（止步式）＝撞到就停、出手更快、单发更重，但推不远、沟也短。
 *
 * 伤害段 `charge` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    export const headlongrushId = "headlongrush";

    /** 目标质量（百克＝hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const headlongTargetMass: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define(headlongrushId, {
        /** 撞击威力：基础 120；物攻每比 60 多 1 加 0.9（夹 −26..55）；体重每比 100kg 重 1kg 加 0.15（夹 −12..42）；
         *  等级每比 20 高 1 加 0.3（夹 0..18）；犁地 ×0.92；夹 80..210。 */
        charge: formula(
            F.base(120)
                .plus(F.stat("attack").minus(60).times(0.9).clamp(-26, 55))
                .plus(F.body("weight").div(10).minus(100).times(0.15).clamp(-12, 42))
                .plus(F.level().minus(20).times(0.3).clamp(0, 18))
                .times(F.when(F.pref("plow", text("worldcombat.skill.headlongrush.preference.plow")), F.const(0.92), F.const(1.0)))
                .clamp(80, 210).round(1),
            "撞击威力", {
                unit: "威力",
                description: "整个身体撞上去的那一下；物攻给力、越重的个体压得越狠、等级越高越沉。犁地式把力分薄，单发轻一点。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲距：基础 3.6 格；速度每比 55 快 1 加 0.014（夹 −0.4..1.0）；身高每比 1.4 高 1 格加 0.6（夹 −0.3..1.2）；
         *  犁地 ×1.15 / 止步 ×0.95；夹 2.6..7.0。 */
        reach: formula(
            F.base(3.6)
                .plus(F.stat("speed").minus(55).times(0.014).clamp(-0.4, 1.0))
                .plus(F.body("height").minus(1.4).times(0.6).clamp(-0.3, 1.2))
                .times(F.when(F.pref("plow", text("worldcombat.skill.headlongrush.preference.plow")), F.const(1.15), F.const(0.95)))
                .clamp(2.6, 7.0).round(2),
            "冲距", {
                unit: "格",
                description: "从起步到撞上对手能冲多远；快的个体起步早、高个子步幅大。它也是本招的实际射程与指示线长度。"
            }),
        /** 冲速：基础 0.48 格/刻；速度每比 55 快 1 加 0.004（夹 −0.1..0.32）；夹 0.3..0.95。 */
        rush: formula(
            F.base(0.48).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.1, 0.32)).clamp(0.3, 0.95).round(2),
            "冲速", {
                unit: "格/刻",
                description: "冲刺时每刻推进的距离；速度快的个体更疾，越快贴上目标越难被走位甩掉。"
            }),
        /** 撞飞：基础 0.9 格；物攻每比 60 多 1 加 0.010（夹 −0.25..0.9）；自身体重每比 100kg 重 1kg 加 0.0025（夹 −0.2..0.7）；
         *  目标体重每比 60kg 重 1kg 减 0.006（最多减 0.8）；犁地 ×1.2；夹 0.4..2.6。 */
        shove: formula(
            F.base(0.9)
                .plus(F.stat("attack").minus(60).times(0.010).clamp(-0.25, 0.9))
                .plus(F.body("weight").div(10).minus(100).times(0.0025).clamp(-0.2, 0.7))
                .minus(headlongTargetMass.div(10).minus(60).times(0.006).clamp(0, 0.8))
                .times(F.when(F.pref("plow", text("worldcombat.skill.headlongrush.preference.plow")), F.const(1.2), F.const(1.0)))
                .clamp(0.4, 2.6).round(2),
            "撞飞", {
                unit: "格",
                description: "把对手沿冲击方向撞开多远；物攻与自己的体重给冲量，目标越重越推不动。犁地式把冲量推得更远。"
            }),
        /** 犁沟宽度：基础 0.75 格；体重每比 100kg 重 1kg 加 0.002（夹 0..0.5）；物攻每比 60 多 1 加 0.004（夹 0..0.4）；
         *  犁地 ×1.3；夹 0.5..2.4。 */
        furrow: formula(
            F.base(0.75)
                .plus(F.body("weight").div(10).minus(100).times(0.002).clamp(0, 0.5))
                .plus(F.stat("attack").minus(60).times(0.004).clamp(0, 0.4))
                .times(F.when(F.pref("plow", text("worldcombat.skill.headlongrush.preference.plow")), F.const(1.3), F.const(1.0)))
                .clamp(0.5, 2.4).round(2),
            "犁沟宽度", {
                unit: "格",
                description: "地面被撞开的宽度；越重、物攻越高的个体压得越宽。画面里那道翻起的粗土带就是这个宽度。"
            }),
        /** 犁沟时长：基础 80 刻；等级每比 20 高 1 加 1.5（夹 0..120）；夹 60..200。 */
        furrowTicks: formula(
            F.base(80).plus(F.level().minus(20).times(1.5).clamp(0, 120)).clamp(60, 200).round(0),
            "犁沟时长", {
                unit: "刻",
                description: "翻起的土在世界上留多久；等级越高留得越久。到时原方块回来。"
            }),
        /** 翻土量：基础 18；体重每比 100kg 重 1kg 加 0.12（夹 0..42）；夹 16..60。 */
        dust: formula(
            F.base(18).plus(F.body("weight").div(10).minus(100).times(0.12).clamp(0, 42)).clamp(16, 60).round(0),
            "翻土量", {
                unit: "点",
                description: "冲刺与撞击翻起的土量；越重的个体翻得越多。画面密度按它派生。"
            }),
        /** 自身防御下降级：原生固定 1 级；夹 1..6。 */
        guardLoss: formula(
            F.const(1).clamp(1, 6).round(0),
            "自身防御下降", {
                unit: "级",
                description: "弃守后自身防御下降的能力等级；原生固定 1 级，提交那一刻就付。"
            }),
        /** 自身特防下降级：原生固定 1 级；夹 1..6。 */
        poiseLoss: formula(
            F.const(1).clamp(1, 6).round(0),
            "自身特防下降", {
                unit: "级",
                description: "弃守后自身特防下降的能力等级；原生固定 1 级，提交那一刻就付。"
            }),
        /** 起手：基础 12 刻；速度每比 55 快 1 减 0.04（夹 −1.5..3）；犁地 +2；夹 7..17。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 3))
                .plus(F.when(F.pref("plow", text("worldcombat.skill.headlongrush.preference.plow")), F.const(2), F.const(0)))
                .clamp(7, 17).round(0),
            "起手", "低头把全身力气压进腿里的时间；速度越快越短，犁地式要多沉一下。"),
        /** 收招：基础 11 刻；速度每比 55 快 1 减 0.03（夹 −1..2.5）；犁地 +3；夹 6..18。 */
        aftercast: seconds(
            F.base(11).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2.5))
                .plus(F.when(F.pref("plow", text("worldcombat.skill.headlongrush.preference.plow")), F.const(3), F.const(0)))
                .clamp(6, 18).round(0),
            "收招", "冲完把散掉的重心收回来、重新站稳的时间；犁地式冲得更远，收得更久。"),
        /** 冷却：基础 40 刻；速度每比 55 快 1 减 0.07（夹 −4..8）；犁地 +5；夹 28..60。 */
        recharge: seconds(
            F.base(40).minus(F.stat("speed").minus(55).times(0.07).clamp(-4, 8))
                .plus(F.when(F.pref("plow", text("worldcombat.skill.headlongrush.preference.plow")), F.const(5), F.const(0)))
                .clamp(28, 60).round(0),
            "冷却", "两次全力冲撞之间等待多久；快的个体回气更快，犁地式缓得更久。")
    });

    stages(headlongrushId, [
        { level: 30, values: { charge: 130, dust: 34 } },
        { level: 50, values: { charge: 148, reach: 4.4 } }
    ]);

    defineDamage(headlongrushId, "charge", {}, { contact: true });

    describe(headlongrushId, [
        { key: "description.0", values: ["charge","shove"] },
        { key: "description.1", values: ["reach","rush","furrow","furrowTicks"] },
        { key: "description.2", values: ["guardLoss","poiseLoss"] },
        { key: "plow.on", values: [], when: function (context) { return read(context.detail.values, ["plow"]) === true; } },
        { key: "plow.off", values: [], when: function (context) { return read(context.detail.values, ["plow"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.charge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.charge", "tier.1.reach"] }
    ]);
}
