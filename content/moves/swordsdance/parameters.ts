/**
 * 剑舞 / swordsdance 的参数与数值来源。
 *
 * 原生事实：Normal、Status、威力 —、命中必中、PP 20、目标 self、boosts { atk: +2 }、带 dance 标签。
 *
 * 翻译：把「激烈地跳起战舞提高气势」翻成一段**朝对手压上去的连斩**——压低身形、拔刀起势，随后一步一斩地
 * 向前逼近，每一斩都在空气里留下刃光；收势时刀刃定住，脚步声与刀光一起落到地上，攻击随之大幅提高。
 * 取原生「+2 物攻、20 PP、纯自我强化」；放弃回合制里永久保留的等级——即时交战里这段「磨刃」以可见窗口存在，
 * 窗口走完锋芒散去，物攻等级一并收回，对手因此有一次拖过窗口的反制。
 *
 * 数值来源（每一项读不同的精灵数据或现场事实，分散到不同参数）：
 *   rise       固定 2 级：原生「大幅提高攻击」的对位，是这招的身份而不是成长点。
 *   cuts       基础 2 + 速度偏移，夹 2..5：腿快的个体连斩更密（画面里的刃光数）。
 *   step       合计进逼距离，由速度与碰撞箱高度共同决定，各斩均分。
 *   beat       斩与斩的间隔，速度越快越急；配置「进逼」每斩多花 2 刻。
 *   arc        刃风半径：碰撞箱高度决定，也是判定与表现共用的范围。
 *   hone       磨刃窗口：基础 240 刻 + 等级 ×4 + 物攻 ×0.6，夹 200..600；等级 30／50 阶梯再抬。
 *   sharpen    刃光数量：基础 18 + 物攻 /6，夹 14..64；物攻越高，画面里的刃光越多。
 *   tempo      起势：速度每比 60 快 1 减 0.02 刻，夹 5..10。
 *   aftercast  收招：基础 6 刻 + 碰撞箱高度 ×1.5，夹 6..10。
 *   wait       冷却：基础 110 刻 − 等级 ×0.6，夹 70..120；配置「进逼」+10。PP 20 的代价。
 * 配置 press（进逼）：开启时每斩朝最近的敌人踏进一步、整支舞更慢，换来的是一段真实的前压；
 *   关闭时原地起舞，出手更干脆，但不占身位。两个方向都各有适用局面，没有净收益更大的一侧。
 */
namespace PokemonSkills {
    actionParameters.define("swordsdance", {
        /** 磨刃增益：原生 +2，本招的身份常数。 */
        rise: formula(F.const(2), "磨刃增益", {
            unit: " 级",
            description: "这支舞把物攻抬高多少级；原生「大幅提高攻击」的对位。"
        }),
        /** 连斩数：腿快的人斩得更密。 */
        cuts: formula(
            F.base(2).plus(F.stat("speed").minus(40).div(80)).clamp(2, 5).round(0),
            "连斩数", {
                unit: " 斩",
                description: "起势之后一气斩出几刀；速度越高斩得越密，画面里的刃光也越多。"
            }),
        /** 合计进逼距离：各斩均分这段位移。 */
        step: formula(
            F.base(0.45).plus(F.stat("speed").minus(60).times(0.004)).plus(F.body("height").times(0.12)).clamp(0.3, 1.1).round(2),
            "合计进逼距离", {
                unit: " 格",
                description: "「进逼」下一整支剑舞的合计位移，各斩均分；速度与身板越大跨得越远。"
            }),
        /** 斩击间隔：越快越急。 */
        beat: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("press", text("worldcombat.skill.swordsdance.preference.press")), F.const(2), F.const(0)))
                .clamp(4, 11).round(0),
            "斩击间隔", "两斩之间隔多久；速度越高越急，进逼时每斩多花 2 刻。"),
        /** 刃风半径：判定与表现共用的范围。 */
        arc: formula(
            F.base(1.0).plus(F.body("height").times(0.4)).clamp(0.9, 2.0).round(2),
            "刃风半径", {
                unit: " 格",
                description: "刃光扫过的半径，也是判定与表现共用的范围；身板越大扫得越开，玩家一眼看出站哪会被扫到。"
            }),
        /** 磨刃窗口：锋芒留在身上的时长。 */
        hone: seconds(
            F.base(240).plus(F.level().times(4)).plus(F.stat("attack").times(0.6)).clamp(200, 600).round(0),
            "磨刃窗口", "「磨刃」在身上的时长；等级与物攻越高撑得越久。窗口走完，这段舞抬起的物攻等级一并收回。"),
        /** 刃光数量：物攻越高，画面里的刃光越多。 */
        sharpen: formula(
            F.base(18).plus(F.stat("attack").div(6)).clamp(14, 64).round(0),
            "刃光数量", {
                unit: " 点",
                description: "整支舞发射的刃光粒子总数；物攻越高越密，粒子数量与机制里的物攻一致。"
            }),
        /** 起势：速度决定拔刀多快。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02)).clamp(5, 10).round(0),
            "起势", "压低身形、拔刀起势需要多久；速度越高越快。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.5)).clamp(6, 10).round(0),
            "收招", "定锋收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(110).minus(F.level().times(0.6))
                .plus(F.when(F.pref("press", text("worldcombat.skill.swordsdance.preference.press")), F.const(10), F.const(0)))
                .clamp(70, 120).round(0),
            "冷却", "两次剑舞之间的等待；等级越高越短，进逼更长。PP 20 的代价。")
    });

    stages("swordsdance", [
        { level: 30, values: { wait: 100, hone: 300 } },
        { level: 50, values: { wait: 84, hone: 380 } }
    ]);

    describe("swordsdance", [
        { key: "description.0", values: ["rise","cuts"] },
        { key: "description.1", values: ["hone"] },
        { key: "description.stack", values: [] },
        { key: "description.hold", values: [] },
        { key: "press.on", values: ["step","beat"], when: function (context) { return read(context.detail.values, ["press"]) === true; } },
        { key: "press.off", values: [], when: function (context) { return read(context.detail.values, ["press"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.hone"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.hone"] }
    ]);
}
