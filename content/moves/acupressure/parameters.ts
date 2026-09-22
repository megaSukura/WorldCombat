/**
 * 点穴 / acupressure — 参数与数值来源。
 *
 * 原生事实：Normal、变化、威力 —、命中必中、PP 30、目标 adjacentAllyOrSelf、onHit 随机在一项未满 +6 的能力上 +2。
 *
 * 翻译：把「通过点穴让身体舒筋活络，大幅提高某 1 项能力」翻成**朝一处穴道按下去**——按准哪一处不由你定，
 *   身体当下最空的那几处里随机开一处，那项能力当场 +2。它保留原生的两件独特之处：**结果是随机的**，
 *   而且**可以按在身边的伙伴身上**（kind friend，自己也算友方），是本族里唯一能作用到别人、也是唯一结果不定的招。
 *   取原生「随机一项 +2、PP 30」；放弃回合制里相邻格的条件——即时交战里改成一个小小的点穴距离。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   press    点穴等级：稳按 3 级／快按 2 级；夹 2..3。原生 +2 是基准，配置把它在两向之间挪一格。
 *   reach    点穴距离：基础 1.5 格 + 碰撞箱宽度×0.6 + 碰撞箱高度×0.3；夹 1.5..4。身板越大，够得着的范围越广（判定与表现同径）。
 *   window   通畅窗口：基础 200 刻 + 等级×3 + 速度×0.5；夹 150..420。等级与速度越高，这条经络通得越久。
 *   motes    手感光点：基础 18 + 速度×0.3；夹 18..70。速度越高，按下去溅起的光点越多，粒子按它发射。
 *   beats    推拿拍数：基础 2 + 等级/25；夹 2..4。等级越高，多推几拍。
 *   tempo    起手：基础 8 刻 − 速度×0.03，稳按再 +5；夹 4..15。越快的个体落指越快，稳按更慢。
 *   aftercast 收招：基础 5 刻 + 碰撞箱高度×1.0；夹 5..10。
 *   wait     冷却：基础 110 刻 − 等级×0.5，稳按 ×1.3／快按 ×0.85；夹 60..150。PP 30 的代价。
 * 配置 steady（稳按）双向取舍：稳按＝+3 级、更慢更久，适合一次补足；快按＝+2 级、瞬发短冷却，适合频繁补。
 *   两向总量不同、各有局面：要害一击的爆发 vs 拉锯里的续航。
 */
namespace PokemonSkills {
    actionParameters.define("acupressure", {
        /** 点穴等级：稳按 3 级／快按 2 级。 */
        press: formula(
            F.when(F.pref("steady", text("worldcombat.skill.acupressure.preference.steady")), F.const(3), F.const(2)).clamp(2, 3).round(0),
            "点穴等级", {
                unit: " 级",
                description: "这一按把随机点到的那项能力抬高多少级；稳按 3 级，快按 2 级。"
            }),
        /** 点穴距离：体型越大够得着越远。 */
        reach: formula(
            F.base(1.5).plus(F.body("width").times(0.6)).plus(F.body("height").times(0.3)).clamp(1.5, 4).round(2),
            "点穴距离", {
                unit: " 格",
                description: "按到穴道所需的距离，也是表现里点击范围；体型越大够得着越远。"
            }),
        /** 通畅窗口：等级与速度决定经络通多久。 */
        window: seconds(
            F.base(200).plus(F.level().times(3)).plus(F.stat("speed").times(0.5)).clamp(150, 420).round(0),
            "通畅窗口", "这条经络通多久；等级与速度越高越久。窗口走完或被清除时，点起来的那项等级收回。"),
        /** 手感光点：速度越高越多。 */
        motes: formula(
            F.base(18).plus(F.stat("speed").times(0.3)).clamp(18, 70).round(0),
            "手感光点", {
                unit: " 点",
                description: "一次点穴溅起的光点数量；速度越高越多，粒子按它发射。"
            }),
        /** 推拿拍数：等级越高多推几拍。 */
        beats: formula(
            F.base(2).plus(F.level().div(25)).clamp(2, 4).round(0),
            "推拿拍数", {
                unit: " 拍",
                description: "按下去之后推几拍；等级越高越多，画面按它一拍拍透进去。"
            }),
        /** 起手：速度决定落指多快，稳按更慢。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("steady", text("worldcombat.skill.acupressure.preference.steady")), F.const(5), F.const(0)))
                .clamp(4, 15).round(0),
            "起手", "落指需要多久；速度越快越短，稳按更慢。"),
        /** 收招：身板越高大收得越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.0)).clamp(5, 10).round(0),
            "收招", "点完之后收回手的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练，稳按更长。 */
        wait: seconds(
            F.base(110).minus(F.level().times(0.5))
                .times(F.when(F.pref("steady", text("worldcombat.skill.acupressure.preference.steady")), F.const(1.3), F.const(0.85)))
                .clamp(60, 150).round(0),
            "冷却", "两次点穴之间的等待；等级越高越短，稳按更长。PP 30 的代价。")
    });

    stages("acupressure", [
        { level: 34, values: { window: 300, wait: 92 } },
        { level: 54, values: { window: 370, wait: 80 } }
    ]);

    describe("acupressure", [
        { key: "description.0", values: ["press"] },
        { key: "steady.on", values: [], when: function (context) { return read(context.detail.values, ["steady"]) === true; } },
        { key: "steady.off", values: [], when: function (context) { return read(context.detail.values, ["steady"]) !== true; } },
        { key: "description.1", values: ["reach", "window"] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.wait"] }
    ]);
}
