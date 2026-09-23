/** 破壳：以双防等级换取攻、特攻和速度；壳片飞散由粒子表现。 个体差异、配置和现场事实由以下公式定义。 */
namespace PokemonSkills {
    actionParameters.define("shellsmash", {
        /** 破壳增益：攻／特攻／速度各 +2（彻底破壳 +3）。 */
        surge: formula(
            F.when(F.pref("total", text("worldcombat.skill.shellsmash.preference.total")), F.const(3), F.const(2)).clamp(2, 3).round(0),
            "破壳增益", {
                unit: " 级",
                description: "破壳把物攻、特攻、速度各抬高多少级；原生「大幅提高」的对位，彻底破壳再 +1。"
            }),
        /** 破壳代价：防／特防各 −1（彻底破壳 −2）。 */
        toll: formula(
            F.when(F.pref("total", text("worldcombat.skill.shellsmash.preference.total")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "破壳代价", {
                unit: " 级",
                description: "壳碎掉后防御与特防各下降多少级；原生「降低防御和特防」的对位，永久下降。"
            }),
        /** 壳片散落半径：身板越大散得越开。 */
        spread: formula(
            F.base(1.6).plus(F.body("width").times(1.0)).plus(F.body("height").times(0.3)).clamp(1.2, 3.4).round(2),
            "散落半径", {
                unit: " 格",
                description: "壳片粒子散开的半径；身板越大散得越开。"
            }),
        /** 壳片数量：体重与防御共同派生。 */
        shards: formula(
            F.base(18).plus(F.body("weight").div(12)).plus(F.stat("defence").times(0.15)).clamp(14, 64).round(0),
            "壳片数量", {
                unit: " 片",
                description: "破壳时甩出的壳片粒子总数；壳越重越硬越多，粒子按此数量发射。"
            }),
        /** 壳片大小：体重决定。 */
        shardSize: formula(
            F.base(0.1).plus(F.body("weight").div(3000)).clamp(0.06, 0.22).round(3),
            "壳片大小", {
                unit: " 格",
                description: "单片壳片的尺度；壳越重越大。"
            }),
        /** 甩出速度：体重决定。 */
        shatter: formula(
            F.base(0.12).plus(F.body("weight").div(4000)).clamp(0.08, 0.28).round(3),
            "甩出速度", {
                unit: " 格/刻",
                description: "壳片离体后向外飞散的速度；壳越重甩得越快。"
            }),
        /** 起式：速度决定撑裂多快。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("total", text("worldcombat.skill.shellsmash.preference.total")), F.const(2), F.const(0)))
                .clamp(4, 13).round(0),
            "起式", "鼓劲、把壳撑裂需要多久；速度越高越快，彻底破壳多花 2 刻。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.5)).clamp(6, 10).round(0),
            "收招", "壳碎后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(90).minus(F.level().times(0.4))
                .plus(F.when(F.pref("total", text("worldcombat.skill.shellsmash.preference.total")), F.const(14), F.const(0)))
                .clamp(60, 110).round(0),
            "冷却", "两次破壳之间的等待；等级越高越短，彻底破壳更长。PP 15 的代价。")
    });

    stages("shellsmash", [
        { level: 30, values: { wait: 80 } },
        { level: 50, values: { wait: 68 } }
    ]);

    describe("shellsmash", [
        { key: "description.0", values: ["surge","toll"] },
        { key: "total.on", values: ["surge", "toll"], when: function (context) { return read(context.detail.values, ["total"]) === true; } },
        { key: "total.off", values: [], when: function (context) { return read(context.detail.values, ["total"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wait"] }
    ]);
}
