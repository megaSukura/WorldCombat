/**
 * 铁头 / ironhead 的参数与伤害段。
 *
 * 原生事实：Steel／物理／威力 80／命中 100／PP 15／接触／30% 畏缩（Cobblemon 1.8，187 位学习者）。
 * 翻译：把“用钢铁般坚硬的头部进行攻击”落成一次**短程的铁砧砸击**——把头像铁块一样沉下去，向前一小步，
 * 用整个头的重量砸实，把目标撞飞一大段。它是全家最短、最慢、最重的一记：起手看得见，够不到就白砸，
 * 但砸上一下能把人从掩体边、从队友身边整个掀开。
 *
 * 与同族分开：头锤快而便宜、连续压制；意念头锤会追人；双刃头锤自损。只有铁头以**击退**为主要目的，
 * 且硬度来自防御与体重——玩家凭“被砸出去多远、声音像敲钟”把它认出来。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   smash        铁头威力 80 + 物攻偏移 + 防御偏移 + 体重偏移；沉铁式 ×1.10。
 *   step         上步距离 2.6 + 体重偏移 + 防御偏移；沉铁式 ×0.85（更短但更重）。
 *   charge       上步速度 0.5 + 速度偏移。
 *   collisionRadius 铁面判定 0.55 + 身高偏移 + 体重偏移。
 *   shove        击飞距离 1.6 + 体重偏移 + 防御偏移（全家最大）；命中后额外上顶 lift。
 *                横向砸开走上原生受击位移入口，目标击退抗性会削减甚至抵消它；伤害与它无关。
 *   lift         上顶速度 0.2 + 体重偏移；走原生受击冲量入口，同样按目标击退抗性结算。
 *   flinchChance 震懵几率 0.30 + 防御偏移；沉铁式 ×1.1（原生 30%）。
 *   flinchTicks  震懵持续 16 刻（全家最久）。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却，整体比头锤慢。
 *
 * 配置 `braced`（沉铁式）双向取舍：开启＝更短更重、震得更懵、砸得更远，但起手与冷却更久；
 * 关闭＝疾铁式，上步更长、出手更快，单发与击退略收。两个方向各有适用局面（贴身掀人 vs 追上去砸）。
 *
 * 伤害段 `smash` 与参数同名，走共享换算；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    actionParameters.define("ironhead", {
        /** 铁头威力：攻击每比 50 多 1 加 0.24（上限 +28），防御每比 55 多 1 加 0.18（上限 +22），
         *  体重每比 50 多 1 加 0.06（上限 +18）；沉铁 ×1.10 / 疾铁 ×0.96；夹在 40..140。 */
        smash: formula(
            F.base(80).plus(F.stat("attack").minus(50).times(0.24).clamp(-12, 28))
                .plus(F.stat("defence").minus(55).times(0.18).clamp(-10, 22))
                .plus(F.body("weight").minus(50).times(0.06).clamp(-4, 18))
                .times(F.when(F.pref("braced", text("worldcombat.skill.ironhead.preference.braced")), F.const(1.10), F.const(0.96)))
                .clamp(40, 140).round(1),
            "铁头威力", {
                unit: "威力",
                description: "这一记铁砧砸实的威力；物攻给出挥砸的狠度，防御与体重给出钢铁头部的硬度。对手防御、相性与暴击在命中时另算。"
            }),
        /** 上步距离：基础 2.6 格，体重每比 50 多 1 加 0.003（上限 +0.9），防御每比 55 多 1 加 0.006（上限 +0.6）；
         *  沉铁 ×0.85 / 疾铁 ×1.25；夹在 1.8..4.0。 */
        step: formula(
            F.base(2.6).plus(F.body("weight").minus(50).times(0.003).clamp(-0.2, 0.9))
                .plus(F.stat("defence").minus(55).times(0.006).clamp(-0.2, 0.6))
                .times(F.when(F.pref("braced", text("worldcombat.skill.ironhead.preference.braced")), F.const(0.85), F.const(1.25)))
                .clamp(1.8, 4.0).round(2),
            "上步距离", {
                unit: "格",
                description: "从起步到贴身的一小步位移，也是本招的实际射程来源；沉铁式更短，疾铁式拉得更长。"
            }),
        /** 上步速度：基础 0.5 格/刻，速度每比 55 快 1 加 0.005（上限 +0.35）；沉铁 ×0.9 / 疾铁 ×1.1；夹在 0.35..0.95。 */
        charge: formula(
            F.base(0.5).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.35))
                .times(F.when(F.pref("braced", text("worldcombat.skill.ironhead.preference.braced")), F.const(0.9), F.const(1.1)))
                .clamp(0.35, 0.95).round(2),
            "上步速度", {
                unit: "格/刻",
                description: "上步时每刻前进的距离；沉铁式沉得更慢，也更容易被先走开。"
            }),
        /** 铁面判定：基础 0.55 格，身高每比 1.4 多 0.14（上限 +0.28），体重每比 50 多 1 加 0.0015（上限 +0.3）；
         *  夹在 0.4..1.0。 */
        collisionRadius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.14).clamp(-0.08, 0.28))
                .plus(F.body("weight").minus(50).times(0.0015).clamp(-0.06, 0.3)).clamp(0.4, 1.0).round(2),
            "铁面判定", {
                unit: "格",
                description: "这一头扫过的横向判定半径；身板越大越沉，扫得越宽。"
            }),
        /** 击飞距离：基础 1.6 格，体重每比 50 多 1 加 0.006（上限 +1.4），防御每比 55 多 1 加 0.006（上限 +0.9）；
         *  沉铁 ×1.1 / 疾铁 ×0.9；夹在 0.8..3.2。 */
        shove: formula(
            F.base(1.6).plus(F.body("weight").minus(50).times(0.006).clamp(-0.3, 1.4))
                .plus(F.stat("defence").minus(55).times(0.006).clamp(-0.2, 0.9))
                .times(F.when(F.pref("braced", text("worldcombat.skill.ironhead.preference.braced")), F.const(1.1), F.const(0.9)))
                .clamp(0.8, 3.2).round(2),
            "击飞距离", {
                unit: "格",
                description: "命中后把目标沿冲撞方向砸开多远；全家最大，越重、越硬的个体掀得越远。目标自身的击退抗性会按原生规则削减这段位移，抗性拉满的目标推不动。"
            }),
        /** 上顶速度：基础 0.2 格/刻，体重每比 50 多 1 加 0.002（上限 +0.25）；夹在 0.1..0.5。 */
        lift: formula(
            F.base(0.2).plus(F.body("weight").minus(50).times(0.002).clamp(-0.05, 0.25)).clamp(0.1, 0.5).round(2),
            "上顶速度", {
                unit: "格/刻",
                description: "命中后额外给目标的一点向上受击速度，让它被掀得离地半瞬再落地；越重顶得越高。与横向砸开一样按目标的击退抗性结算，抗性拉满时顶不起来。"
            }),
        /** 震懵几率：基础 0.30，防御每比 55 多 1 加 0.0012（上限 +0.1）；沉铁 ×1.1；夹在 0.16..0.44。 */
        flinchChance: percent(
            F.base(0.30).plus(F.stat("defence").minus(55).times(0.0012).clamp(-0.05, 0.1))
                .times(F.when(F.pref("braced", text("worldcombat.skill.ironhead.preference.braced")), F.const(1.1), F.const(1))).clamp(0.16, 0.44),
            "震懵几率", "砸实时的畏缩几率；头部越硬越像敲钟，沉铁式再抬一档。"),
        flinchTicks: ticks(16, "震懵持续", "被砸懵的人在这段时间内无法开始新动作；这是全家最久的一档。"),
        /** 起手：基础 8 刻，速度每比 55 快 1 减 0.02 刻；沉铁 +3；夹在 5..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("braced", text("worldcombat.skill.ironhead.preference.braced")), F.const(3), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "头部沉下去、蓄到能砸出去的时间；速度越快越短，沉铁式沉得更久。"),
        /** 收招：基础 10 刻，速度每比 55 快 1 减 0.02 刻；沉铁 +2；夹在 6..17。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("braced", text("worldcombat.skill.ironhead.preference.braced")), F.const(2), F.const(0)))
                .clamp(6, 17).round(0),
            "收招", "砸完稳住钢铁头部的收势；速度越快越利落。"),
        /** 冷却：基础 34 刻，速度每比 55 快 1 减 0.05 刻；沉铁 +6；夹在 22..52。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 7))
                .plus(F.when(F.pref("braced", text("worldcombat.skill.ironhead.preference.braced")), F.const(6), F.const(0)))
                .clamp(22, 52).round(0),
            "冷却", "两次铁头之间的等待；比头锤长得多，因为这一记本身更重。"),
        traceAhead: hidden(1.1),
        minimumMove: hidden(0.05)
    });

    stages("ironhead", [
        { level: 26, values: { smash: 88, shove: 1.9 } },
        { level: 44, values: { smash: 96, step: 3.2, shove: 2.3, flinchChance: 0.34 } }
    ]);

    defineDamage("ironhead", "smash", { defenceCoefficient: 0.006,
        rationale: "钢铁头部对护甲更硬，减伤略低于默认系数，让体格与硬度差更明显。" }, { contact: true });

    describe("ironhead", [
        { key: "description.0", values: ["smash", "collisionRadius"] },
        { key: "description.1", values: ["step", "charge", "shove"] },
        { key: "description.2", values: ["lift","flinchChance","flinchTicks"] },
        { key: "braced.on", values: [], when: function (context) { return read(context.detail.values, ["braced"]) === true; } },
        { key: "braced.off", values: [], when: function (context) { return read(context.detail.values, ["braced"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.smash", "tier.0.shove"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.smash", "tier.1.step", "tier.1.shove", "tier.1.flinchChance"] }
    ]);
}
