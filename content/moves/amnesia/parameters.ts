/**
 * 瞬间失忆 / amnesia — 参数与数值来源。
 *
 * 原生事实：Psychic、变化、威力 —、命中必中、PP 20、目标 self、boosts { spd: +2 }、flags snatch/metronome。
 *
 * 翻译：把「将头脑清空，瞬间忘记某事」翻成**把脑子腾空——特防大幅抬高，同时忘掉缠着心智的东西**。
 *   取原生「特防 +2、PP 20、纯自我强化」；把描述里的「忘记某事」落成真实机制：成招时按共享身份清除缠绕心智的
 *   状态（混乱／着迷／挑衅／无理取闹／被点名等），忘记的数量由配置决定。放弃回合制里永久保留的等级——
 *   即时交战里等级立刻写入公共能力阶梯，空明是一段可见窗口，窗口走完或被清除时收回。
 *   它是本族里唯一**只抬特防**、也是唯一**会清掉自身异常**的一招；与冥想（特攻＋特防）靠「只守不攻、还能忘掉状态」分开。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   poise    特防等级：基础 2，基础特防 ≥ 110 再 +1；夹 2..3。天生守得住的个体把这一档推得更高。
 *   blank    空明时长：基础 200 刻 + 特防×0.6 + 等级×2，彻底失忆再 ×1.3／一时失神 ×0.85；夹 150..460。
 *            特防越高、等级越高，腾空后的清明撑得越久。
 *   void     空明半径：基础 0.9 格 + 碰撞箱宽度×0.8 + 碰撞箱高度×0.15；夹 0.8..2.2。体型越大，空洞铺得越开（判定与表现同径）。
 *   motes    忘却尘点：基础 22 + 特防×0.25 + 等级×0.2；夹 20..80。特防与等级越高，被排空飘起的念头尘越多，粒子按它发射。
 *   rings    空环拍数：基础 2 + 等级/24；夹 2..4。等级越高，空洞多推几圈。
 *   purge    忘记数量：彻底失忆 6（见到的心智异常都忘掉）／一时失神 1（只忘最重的一个）；夹 1..6。
 *   tempo    起手：基础 7 刻 − 速度×0.02，彻底失忆再 +5；夹 4..15。越快的个体失神越快，彻底清空更慢。
 *   aftercast 收招：基础 5 刻 + 碰撞箱高度×1.0；夹 5..10。
 *   wait     冷却：基础 95 刻，彻底失忆 ×1.25／一时失神 ×0.8；夹 55..150。PP 20 的代价。
 * 配置 deep（彻底失忆）双向取舍：开启＝特防 +2／+3、清掉所有缠绕心智的状态、空明更久，但起手 +5 刻、冷却 ×1.25；
 *   关闭＝只忘最重的一个、起手极短、冷却更短，只中一个异常时更划算。两向各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("amnesia", {
        /** 特防等级：原生「大幅提高」的对位，天生守得住的个体再推一档。 */
        poise: formula(
            F.base(2).plus(F.when(F.stat("specialDefence").gte(110), F.const(1), F.const(0))).clamp(2, 3).round(0),
            "特防等级", {
                unit: " 级",
                description: "失神之后抬高的特防等级；基础特防 ≥ 110 的个体多推一档。"
            }),
        /** 空明时长：特防与等级决定腾空后的清明撑多久，彻底失忆更久。 */
        blank: seconds(
            F.base(200).plus(F.stat("specialDefence").times(0.6)).plus(F.level().times(2))
                .times(F.when(F.pref("deep", text("worldcombat.skill.amnesia.preference.deep")), F.const(1.3), F.const(0.85)))
                .clamp(150, 460).round(0),
            "空明时长", "脑子腾空后撑多久；特防与等级越高越久，彻底失忆再 ×1.3。窗口走完或被清除时，特防等级收回。"),
        /** 空明半径：体型越大铺得越开。 */
        void: formula(
            F.base(0.9).plus(F.body("width").times(0.8)).plus(F.body("height").times(0.15)).clamp(0.8, 2.2).round(2),
            "空明半径", {
                unit: " 格",
                description: "空洞从身上铺开的半径，也是表现里空环的范围；体型越大铺得越开。"
            }),
        /** 忘却尘点：特防与等级越高越多。 */
        motes: formula(
            F.base(22).plus(F.stat("specialDefence").times(0.25)).plus(F.level().times(0.2)).clamp(20, 80).round(0),
            "忘却尘点", {
                unit: " 点",
                description: "一次排空飘起的念头尘数量；特防与等级越高越多，粒子按它发射。"
            }),
        /** 空环拍数：等级越高多推几圈。 */
        rings: formula(
            F.base(2).plus(F.level().div(24)).clamp(2, 4).round(0),
            "空环拍数", {
                unit: " 拍",
                description: "空洞推开几圈；等级越高越多，画面按它一圈圈扩散。"
            }),
        /** 忘记数量：彻底失忆清掉所有，一时失神只清一个。 */
        purge: formula(
            F.when(F.pref("deep", text("worldcombat.skill.amnesia.preference.deep")), F.const(6), F.const(1)).clamp(1, 6).round(0),
            "忘记数量", {
                unit: " 个",
                description: "按混乱、着迷、挑衅、无理取闹、再来一次和定身法的顺序，清除至多这么多项；彻底失忆清除全部六类，一时失神只清除最先存在的一项。"
            }),
        /** 起手：速度决定失神多快，彻底清空更慢。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.amnesia.preference.deep")), F.const(5), F.const(0)))
                .clamp(4, 15).round(0),
            "起手", "把脑子腾空需要多久；速度越快越短，彻底失忆更慢（也更容易被打断）。"),
        /** 收招：身板越高大收得越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.0)).clamp(5, 10).round(0),
            "收招", "失神之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：一时失神更短，彻底失忆更长。 */
        wait: seconds(
            F.base(95)
                .times(F.when(F.pref("deep", text("worldcombat.skill.amnesia.preference.deep")), F.const(1.25), F.const(0.8)))
                .clamp(55, 150).round(0),
            "冷却", "两次失忆之间的等待；一时失神更短，彻底失忆更长。PP 20 的代价。")
    });

    stages("amnesia", [
        { level: 30, values: { blank: 280, wait: 84 } },
        { level: 50, values: { blank: 360, wait: 72 } }
    ]);

    describe("amnesia", [
        { key: "description.0", values: ["poise"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "description.1", values: ["blank"] },
        { key: "description.2", values: ["purge"] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blank", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blank", "tier.1.wait"] }
    ]);
}
