/**
 * 百万吨重拳 / megapunch 的参数与伤害段。
 *
 * 原生事实：Normal、物理、威力 80、命中 85、PP 20、接触、拳类，无追加效果（Cobblemon 1.8，全招 206 位学习者）。
 *
 * 翻译：把「一记灌注全身力量的重拳」落成**一支沿笔直窄道打出的活塞**——不是连拳、不是横扫，而是一拳到底：
 * 蓄势之后沿身前一条窄道把正前方的东西整块推出去。它的身份是**质量与直线**：威力随物攻与体重，击退随施法者
 * 体重而随目标体型递减，拳路（窄道长度与宽度）随身高与体宽。原生 85 命中在这里是位置判定：站在窄道里就吃，
 * 侧身就能让开；它也是本族唯一不带任何元素状态的纯力招。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   megaton    拳威：物攻定拳劲，体重定这一拳有多沉；配置两向分配。
 *   fistReach  直拳射程（窄道长度）：身高与体宽决定拳头够多远。
 *   bore       拳路宽度（窄道半宽）：体宽决定拳面覆盖多宽。
 *   shove      击退距离：施法者体重推得多远，目标越高大越推不动。
 *   wind       蓄势：速度越快收拳蓄力越短；扎根式更久。
 *   brace      收招：速度越快回势越快；扎根式更慢。
 *   recharge   冷却：速度决定循环快慢；扎根式更久。
 *   rings      冲击环数：物攻派生，表现按它画出沿拳路推进的环。
 *
 * 配置 `planted`（扎根式）双向取舍：开启＝拳更沉（×1.14）、推得更远（×1.25），但蓄势更久、收招更慢、冷却更长；
 * 关闭（活步式）＝起收更快、循环更短，但拳轻、推得近。两者各有局面：一发定音 / 持续压制。
 *
 * 伤害段 `megaton` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("megapunch", {
        /** 拳威：84 + 物攻偏移[−18,46] + 体重偏移[−8,24]；扎根 ×1.14 / 活步 ×0.93；夹 62..195。 */
        megaton: formula(
            F.base(84).plus(F.stat("attack").minus(60).times(0.55).clamp(-18, 46))
                .plus(F.body("weight").minus(60).times(0.06).clamp(-8, 24))
                .times(F.when(F.pref("planted", text("worldcombat.skill.megapunch.preference.planted")), F.const(1.14), F.const(0.93)))
                .clamp(62, 195).round(1),
            "拳威", {
                unit: "威力",
                description: "这一记直拳命中的基础威力；物攻定拳劲，体重让这一拳更沉，扎根式再抬一截。对手防御、相性与暴击在命中时另算。"
            }),
        /** 直拳射程：2.3 + 身高偏移[−0.3,0.9] + 体宽偏移[−0.1,0.6]；夹 2.1..3.6。 */
        fistReach: formula(
            F.base(2.3).plus(F.body("height").minus(1.4).times(0.6).clamp(-0.3, 0.9))
                .plus(F.body("width").minus(0.9).times(0.5).clamp(-0.1, 0.6))
                .clamp(2.1, 3.6).round(2),
            "直拳射程", {
                unit: "格",
                description: "窄道能探到多远的活体；臂展（身高）与身板（体宽）越大够得越远。它也是本招的实际射程来源。"
            }),
        /** 拳路宽度：0.55 + 体宽偏移[−0.1,0.5]；夹 0.45..1.1。 */
        bore: formula(
            F.base(0.55).plus(F.body("width").minus(0.9).times(0.35).clamp(-0.1, 0.5)).clamp(0.45, 1.1).round(2),
            "拳路宽度", {
                unit: "格",
                description: "直拳窄道的半宽；身板越宽拳面越厚实。画面里这条窄带就是判定范围，侧身站开就能躲。"
            }),
        /** 击退距离：0.8 + 施法者体重偏移[0,1.0] − 目标体型抵抗[0,0.6]；扎根 ×1.25 / 活步 ×0.85；夹 0.3..2.0。 */
        shove: formula(
            F.base(0.8).plus(F.body("weight").minus(60).times(0.004).clamp(0, 1.0))
                .minus(F.target("actor.height", text("worldcombat.skill.megapunch.value.targetHeight")).minus(1.4).times(0.25).clamp(0, 0.6))
                .times(F.when(F.pref("planted", text("worldcombat.skill.megapunch.preference.planted")), F.const(1.25), F.const(0.85)))
                .clamp(0.3, 2.0).round(2),
            "击退距离", {
                unit: "格",
                description: "命中后把目标沿拳路推开多远；施法者越重推得越远，目标越高大越站得稳。扎根式推得更狠。"
            }),
        /** 蓄势：9 − 速度偏移[−2,5] + 扎根 4 / 活步 −2；夹 4..18。 */
        wind: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.05).clamp(-2, 5))
                .plus(F.when(F.pref("planted", text("worldcombat.skill.megapunch.preference.planted")), F.const(4), F.const(-2)))
                .clamp(4, 18).round(0),
            "蓄势", "收拳、沉腰、蹬地到拳能提交的时间；速度越快蓄得越短，扎根式要多停一拍。"),
        /** 收招：11 − 速度偏移[−3,6] + 扎根 3 / 活步 −2；夹 5..20。 */
        brace: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 6))
                .plus(F.when(F.pref("planted", text("worldcombat.skill.megapunch.preference.planted")), F.const(3), F.const(-2)))
                .clamp(5, 20).round(0),
            "收招", "打完这一拳后收势回架的时间；速度越快越短，扎根式更慢。"),
        /** 冷却：42 − 速度偏移[−6,10] + 扎根 9 / 活步 −6；夹 24..60。 */
        recharge: seconds(
            F.base(42).minus(F.stat("speed").minus(60).times(0.05).clamp(-6, 10))
                .plus(F.when(F.pref("planted", text("worldcombat.skill.megapunch.preference.planted")), F.const(9), F.const(-6)))
                .clamp(24, 60).round(0),
            "冷却", "两记重拳之间的等待；速度越快回得越快，扎根式要缓更久。"),
        /** 冲击环数：3 + 物攻偏移[−1,4]；夹 2..9。 */
        rings: formula(
            F.base(3).plus(F.stat("attack").minus(60).times(0.05).clamp(-1, 4)).clamp(2, 9).round(0),
            "冲击环数", {
                unit: "道",
                description: "拳路沿线推出去的冲击环数量，随物攻增长；表现按它发射，画面里的环数与机制一致。"
            })
    });

    stages("megapunch", [
        { level: 34, values: { megaton: 96 } },
        { level: 52, values: { megaton: 110, shove: 1.3 } }
    ]);

    defineDamage("megapunch", "megaton", {}, { contact: true, punch: true });

    describe("megapunch", [
        { key: "description.0", values: ["megaton", "fistReach", "bore"] },
        { key: "description.1", values: ["shove"] },
        { key: "planted.on", values: [], when: function (context) { return read(context.detail.values, ["planted"]) === true; } },
        { key: "planted.off", values: [], when: function (context) { return read(context.detail.values, ["planted"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.megaton"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.megaton", "tier.1.shove"] }
    ]);
}
