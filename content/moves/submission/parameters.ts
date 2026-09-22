/**
 * 地狱翻滚 / submission 的参数与伤害段。
 *
 * 原生事实：格斗、物理、威力 80、命中 80、PP 20、接触、反作用力 1/4（Cobblemon 1.8，75 位学习者）。
 * 翻译：把「将对手连同自己一起摔向地面进行攻击」落成一次**贴身抓摔**——先扑上去抓住目标，再拧身把它连同自己
 * 砸向地面；对方被按倒，自己也随之摔得生疼。它不冲撞，而是靠近、抓住、下摔三拍；对手够沉就摔不动。
 *
 * 数据分散（每项依赖不同的精灵数据，包括目标自身的块头）：
 *   slam      摔击威力：物攻与体重给出下压的狠度，再减去目标的块头（越大越摔不动）。
 *   recoil    反噬比例：防御越高越轻，目标越沉越重——摔大块头时自己垫在下面更疼。
 *   pinTicks  压制时长：自身体重给出基础，目标越沉越短。
 *   gripTicks 抓取窗口：速度给出基础，是给对手挣脱/队友打断的窗口。
 *   reach/pace/gripRadius 扑抓距离、扑身速度与抓取半径：速度与体型高度。
 *   throw     摔落位移：体重与配置决定把目标甩出去多远。
 *   dust      扬尘数量：体重与物攻派生，落地与起身的尘按它发射。
 *   tempo/aftercast/recharge 起手、起身与冷却都吃速度。
 *
 * 配置 pin（压制式）双向取舍：压制＝摔得更轻、反噬更小、把对方按住更久，适合控场与配合队友；
 * 抛摔＝摔得更重、甩得更远、反噬更大，但对方很快能爬起来。两个方向各有适用局面。
 *
 * 伤害段 slam：这一摔随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    /** 目标块头：碰撞箱宽 × 高，中等身板约 1.2；越大越摔不动。 */
    function submissionHeft(): Formula.Node {
        return F.target("body.width", text("worldcombat.skill.submission.value.heft")).times(F.target("body.height"));
    }
    /** 块头偏离中等身板的量，正数代表比中等更沉。 */
    function submissionMass(): Formula.Node {
        return submissionHeft().minus(1.2);
    }

    actionParameters.define("submission", {
        /** 摔击威力：基础 80，物攻每比 60 多 1 加 0.5（夹 -24..42），体重每比 60 多 1 加 0.15（夹 -8..26），块头每多 0.1 减 1.6（夹 -20..60）；压制 ×0.88 / 抛摔 ×1.05；夹 50..170。 */
        slam: formula(
            F.base(80).plus(F.stat("attack").minus(60).times(0.5).clamp(-24, 42))
                .plus(F.body("weight").minus(60).times(0.15).clamp(-8, 26))
                .minus(submissionMass().times(16).clamp(-20, 60))
                .times(F.when(F.pref("pin", text("worldcombat.skill.submission.preference.pin")), F.const(0.88), F.const(1.05)))
                .clamp(50, 170).round(1),
            "摔击威力", {
                unit: "威力",
                description: "把它砸向地面那一下的威力；物攻与体重越大压得越狠，目标块头越大越摔不动。压制式收一档、抛摔式加一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 反噬比例：基础 0.25，防御每比 60 多 1 少 0.0008（上限 -0.12），块头每多 0.1 加 0.04（夹 -0.05..0.15）；压制 ×0.85 / 抛摔 ×1.15；夹 0.12..0.5。 */
        recoil: formula(
            F.base(0.25).minus(F.stat("defence").minus(60).times(0.0008).clamp(0, 0.12))
                .plus(submissionMass().times(0.4).clamp(-0.05, 0.15))
                .times(F.when(F.pref("pin", text("worldcombat.skill.submission.preference.pin")), F.const(0.85), F.const(1.15)))
                .clamp(0.12, 0.5).round(3),
            "反噬比例", {
                unit: "比例",
                description: "命中后按实际伤害反噬自己的比例；防御越高越轻，目标越沉自己垫在下面越疼。压制式更轻、抛摔式更重。这是本招最主要的自损来源。"
            }),
        /** 压制时长：基础 40 刻，体重每比 60 多 1 加 0.25（夹 -8..16），块头每多 0.1 减 1（夹 -10..25）；压制 +30 / 抛摔 ×0.4；夹 12..90。 */
        pinTicks: seconds(
            F.base(40).plus(F.body("weight").minus(60).times(0.25).clamp(-8, 16))
                .minus(submissionMass().times(10).clamp(-10, 25))
                .plus(F.when(F.pref("pin", text("worldcombat.skill.submission.preference.pin")), F.const(30), F.const(0)))
                .times(F.when(F.pref("pin", text("worldcombat.skill.submission.preference.pin")), F.const(1), F.const(0.4)))
                .clamp(12, 90).round(0),
            "压制时长", "被摔倒在地后爬不起来、移动被拖慢的时长；自身体重越大压得越久，目标越沉压得越短。压制式显著更长，抛摔式只是摔一下。"),
        /** 抓取窗口：基础 10 刻，速度每比 60 快 1 加 0.05（夹 -2..4）；夹 7..16。 */
        gripTicks: seconds(
            F.base(10).plus(F.stat("speed").minus(60).times(0.05).clamp(-2, 4)).clamp(7, 16).round(0),
            "抓取窗口", "抓住目标到把它摔下去之间的时间；也是对手挣脱或队友打断这一摔的窗口。速度越快拧身越干脆。"),
        /** 扑抓距离：基础 2.6 格，速度每比 60 快 1 加 0.014（夹 -0.5..1.0）；夹 2.0..3.6。 */
        reach: formula(
            F.base(2.6).plus(F.stat("speed").minus(60).times(0.014).clamp(-0.5, 1)).clamp(2, 3.6).round(2),
            "扑抓距离", {
                unit: "格",
                description: "从起身到够到目标的总位移，也是本招的射程基准；腿快的人扑得更远。要贴到目标身上才能抓住。"
            }),
        /** 扑身速度：基础 0.85 格/刻，速度每比 60 快 1 加 0.004（夹 -0.15..0.4）；夹 0.6..1.3。 */
        pace: formula(
            F.base(0.85).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.15, 0.4)).clamp(0.6, 1.3).round(2),
            "扑身速度", {
                unit: "格/刻",
                description: "扑过去抓人时每刻前进的距离；越快越难被让开。"
            }),
        /** 抓取半径：基础 0.55 格，碰撞箱每比 1.4 高 1 格加 0.12；夹 0.42..0.9。 */
        gripRadius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.42, 0.9).round(2),
            "抓取半径", {
                unit: "格",
                description: "双臂张开能够到的横向判定半径；身板越大抓得越宽。"
            }),
        /** 摔落位移：基础 0.6 格，体重每比 60 多 1 加 0.004（夹 -0.2..0.8），压制 -0.2 / 抛摔 +0.5；夹 0.3..1.8。 */
        throw: formula(
            F.base(0.6).plus(F.body("weight").minus(60).times(0.004).clamp(-0.2, 0.8))
                .plus(F.when(F.pref("pin", text("worldcombat.skill.submission.preference.pin")), F.const(-0.2), F.const(0.5)))
                .clamp(0.3, 1.8).round(2),
            "摔落位移", {
                unit: "格",
                description: "把目标摔出去、砸离原位的距离；越重甩得越远，压制式收住、抛摔式甩得更开。"
            }),
        /** 扬尘数量：基础 16，体重每比 60 多 1 加 0.15（夹 -6..18），物攻每比 60 多 1 加 0.1（夹 -4..12）；夹 12..52。 */
        dust: formula(
            F.base(16).plus(F.body("weight").minus(60).times(0.15).clamp(-6, 18))
                .plus(F.stat("attack").minus(60).times(0.1).clamp(-4, 12)).clamp(12, 52).round(0),
            "扬尘数量", {
                unit: "个",
                description: "扑抓、落地与起身扬起的尘粒数量，随体重与物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 6 刻，速度每比 60 快 1 少 0.02（夹 -2..3）；夹 4..10。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(4, 10).round(0),
            "起手", "压低身形、探出身去抓人的时间；速度越快越干脆。"),
        /** 起身：基础 12 刻，速度每比 60 快 1 少 0.02（夹 -3..4）；夹 7..18。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4)).clamp(7, 18).round(0),
            "起身", "把对手摔下去之后自己撑起身的时长；速度越快爬起越利落。"),
        /** 冷却：基础 36 刻，速度每比 60 快 1 少 0.03（夹 -5..8）；夹 24..50。 */
        recharge: seconds(
            F.base(36).minus(F.stat("speed").minus(60).times(0.03).clamp(-5, 8)).clamp(24, 50).round(0),
            "冷却", "两次抓摔之间的间隔；速度越快回得越快。"),
        traceAhead: hidden(1.0),
        minimumMove: hidden(0.05)
    });

    defineDamage("submission", "slam", { defenceCoefficient: 0.005,
        rationale: "摔击把目标砸向地面，护甲对这类钝撞的削减略低，让体格与等级差更明显。" }, { contact: true });

    stages("submission", [
        { level: 30, values: { slam: 92 } },
        { level: 50, values: { slam: 112, pinTicks: 52 } }
    ]);

    describe("submission", [
        { key: "description.0", values: ["slam", "reach", "pace", "gripRadius"] },
        { key: "description.1", values: ["gripTicks", "pinTicks", "throw"] },
        { key: "description.2", values: ["recoil", "dust"] },
        { key: "pin.on", values: [], when: function (context) { return read(context.detail.values, ["pin"]) === true; } },
        { key: "pin.off", values: [], when: function (context) { return read(context.detail.values, ["pin"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slam", "tier.1.pinTicks"] }
    ]);
}
