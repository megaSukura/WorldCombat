/**
 * 自我激励 / workup 的参数与数值来源。
 *
 * 原生事实：Normal、Status、威力 —、命中 —、PP 30、目标 self、boosts { atk:+1, spa:+1 }。
 *
 * 翻译：把「激励自己」翻成一口从心里窜起来的火——起手极短、冷却很短，是能在连打之间随手补上的那一口。
 * 念头的分量落在**当前处境**上：平常两项各 +1；一旦掉到门槛以下，你更擅长的那一项（物攻或特攻）再多 +1——
 * 被压制时越打越拧。这是它与同族「生长」（靠太阳、身体长大）分开的地方。
 * 两项提升都走 NativeEffects.boost 一条路径：宝可梦改原生等级，其他战斗者落到攻击属性。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   atkGift    受伤门槛以内且物攻 ≥ 特攻时 +2，否则 +1；夹 1..2。读当前生命比例与物攻／特攻的强弱。
 *   spaGift    受伤门槛以内且特攻 > 物攻时 +2，否则 +1；夹 1..2。同一份处境喂给两个不同的公式叶子。
 *   surge      粒子量：基础 16 +（物攻 + 特攻）/50；夹 16..64。同一招在两只精灵手里，画面里的火星数不同。
 *   rousedTicks 斗志窗口：基础 400 刻 + 等级×4；夹 400..700。
 *   tempo      起手：速度每比 60 快 1 减 0.02 刻，背水 +3；夹 4..12。天生快的个体更早鼓好。
 *   aftercast  收招：基础 5 刻 + 碰撞箱高度×1.5；夹 5..9。身板越大越慢。
 *   wait       冷却：基础 34 刻 − 等级×0.1，背水 +12；夹 22..46。PP 30 的代价。
 * 配置 desperate（背水）：门槛从 40% 抬到 65%，更容易触发那多出来的一级；代价是起手 +3 刻、冷却 +12。
 */
namespace PokemonSkills {
    actionParameters.define("workup", {
        /** 攻击提升：门槛内且物攻不低于特攻时 +2。 */
        atkGift: formula(
            F.base(1).plus(F.when(
                F.actor("healthRatio").lt(
                    F.when(F.pref("desperate", text("worldcombat.skill.workup.preference.desperate")), F.const(0.65), F.const(0.4)).as("受伤门槛")),
                F.when(F.stat("attack").gte(F.stat("specialAttack")), F.const(1), F.const(0)).as("物攻更高"),
                F.const(0))).clamp(1, 2).round(0),
            "攻击提升", {
                unit: " 级",
                description: "激励带来的物攻等级；生命掉到门槛以下、且物攻是更强的一项时，多涨一级。"
            }),
        /** 特攻提升：门槛内且特攻高于物攻时 +2。 */
        spaGift: formula(
            F.base(1).plus(F.when(
                F.actor("healthRatio").lt(
                    F.when(F.pref("desperate", text("worldcombat.skill.workup.preference.desperate")), F.const(0.65), F.const(0.4)).as("受伤门槛")),
                F.when(F.stat("specialAttack").gt(F.stat("attack")), F.const(1), F.const(0)).as("特攻更高"),
                F.const(0))).clamp(1, 2).round(0),
            "特攻提升", {
                unit: " 级",
                description: "激励带来的特攻等级；生命掉到门槛以下、且特攻是更强的一项时，多涨一级。"
            }),
        /** 火星量：两项攻击合起来决定画面里的火花数。 */
        surge: formula(
            F.base(16).plus(F.stat("attack").plus(F.stat("specialAttack")).div(50)).clamp(16, 64).round(0),
            "火星量", {
                unit: " 点",
                description: "起势与余韵里的火星数量，按你的物攻与特攻之和派生；越强的个体燃得越旺。"
            }),
        /** 斗志窗口：这口气在身上的时长。 */
        rousedTicks: seconds(
            F.base(400).plus(F.level().times(4)).clamp(400, 700).round(0),
            "斗志窗口", "「斗志」标记能挂多久；等级越高撑得越久。等级本身由公共能力阶梯独立保留。"),
        /** 起手：速度决定把火气攒起来需要多久。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02))
                .plus(F.when(F.pref("desperate", text("worldcombat.skill.workup.preference.desperate")), F.const(3), F.const(0))).clamp(4, 12).round(0),
            "起手", "攒起这口气需要多久；速度越高越快，背水式要更久。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.5)).clamp(5, 9).round(0),
            "收招", "鼓劲之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(34).minus(F.level().times(0.1))
                .plus(F.when(F.pref("desperate", text("worldcombat.skill.workup.preference.desperate")), F.const(12), F.const(0))).clamp(22, 46).round(0),
            "冷却", "两次自我激励之间的等待；等级越高越短，背水式更长。PP 30 的代价。")
    });

    describe("workup", [
        { key: "description.0", values: ["atkGift", "spaGift"] },
        { key: "description.1", values: ["rousedTicks"] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: [] }
    ]);
}
