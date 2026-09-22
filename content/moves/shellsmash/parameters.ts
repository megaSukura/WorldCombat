/**
 * 破壳 / shellsmash 的参数与数值来源。
 *
 * 原生事实：Normal、变化、威力 —、命中必中、PP 15、目标 self、
 *   boosts { def: -1, spd: -1, atk: +2, spa: +2, spe: +2 }。
 *
 * 翻译：把「打破外壳」翻成一件真事——包着自己的硬壳整个撑裂，壳片四散飞出、扎进身周的地里；
 *   攻、特攻、速度猛涨，防、特防随壳一起掉了，而且这一掉是永久的：壳不会自己长回来。
 *   它是这一族里唯一**自伤换爆发**的招，也是唯一在场上留下实体壳片的一招。
 * 取原生「攻特攻速度 +2、防特防 −1、PP 15、纯自我强化」；原生的「威力」与本招无关（变化招），
 *   这里的代价是防御等级，不是回合。
 *
 * 数值来源（每一项读不同的精灵数据或现场事实，分散到不同参数）：
 *   surge   基础 +2 级；配置「彻底破壳」+3；夹 2..3：壳撑得越彻底，抬得越高。
 *   toll    基础 1 级；配置「彻底破壳」2 级；夹 1..2：与 surge 同向变动的代价。
 *   spread  基础 1.6 格 + 碰撞箱宽度 ×1.0 + 碰撞箱高度 ×0.3，夹 1.2..3.4：身板越大，壳片散得越开。
 *   shards  基础 18 + 体重 /12 + 防御 ×0.15，夹 14..64：壳越重越硬，碎片越多。
 *   shardSize 基础 0.1 格 + 体重 /3000，夹 0.06..0.22：壳越重，碎片越大。
 *   shatter 基础 0.12 格/刻 + 体重 /4000，夹 0.08..0.28：壳越重，碎片甩得越快。
 *   debrisTicks 基础 80 刻 + 等级 ×2，夹 60..200：等级越高，壳片在原地留得越久。
 *   tempo   基础 8 刻 − 速度偏移；彻底破壳 +2；夹 4..13。
 *   aftercast 基础 6 刻 + 碰撞箱高度 ×1.5，夹 6..10。
 *   wait    基础 90 刻 − 等级 ×0.4；彻底破壳 +14；夹 60..110。PP 15 的代价。
 * 配置 total（彻底破壳）：开启＝攻特攻速度 +3、防特防 −2，壳片更大更远，代价是起式 +2 刻、冷却 +14；
 *   关闭＝+2 / −1 的稳妥版本。两向各有局面：一发定胜负 vs 留有余地。
 */
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
                description: "壳片扎进身周地面的半径；身板越大散得越开。判定与表现读同一个半径。"
            }),
        /** 壳片数量：体重与防御共同派生。 */
        shards: formula(
            F.base(18).plus(F.body("weight").div(12)).plus(F.stat("defence").times(0.15)).clamp(14, 64).round(0),
            "壳片数量", {
                unit: " 片",
                description: "破壳时甩出的壳片粒子总数；壳越重越硬越多，画面里的数量与机制一致。"
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
        /** 壳片留存：等级决定。 */
        debrisTicks: seconds(
            F.base(80).plus(F.level().times(2)).clamp(60, 200).round(0),
            "壳片留存", "壳片扎在地上留多久；等级越高留得越久，到期原方块回来。"),
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
        { key: "description.0", values: ["surge", "toll"] },
        { key: "description.1", values: ["spread", "shards", "debrisTicks"] },
        { key: "total.on", values: ["surge", "toll"], when: function (context) { return read(context.detail.values, ["total"]) === true; } },
        { key: "total.off", values: [], when: function (context) { return read(context.detail.values, ["total"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wait"] }
    ]);
}
