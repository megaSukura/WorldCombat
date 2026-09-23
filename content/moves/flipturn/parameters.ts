/**
 * 快速折返 / flipturn —— 参数、伤害段与「深潜／回身」取舍。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：水／物理／威力 60／命中 100／PP 20／优先度 0／接触／selfSwitch；
 *   说明与急速折返同款：「在攻击之后急速返回，和后备宝可梦进行替换」。
 *
 * 世界化翻译：它是一次**泳者式转身**——一头撞上目标，翻个身从它身上蹬开，落到目标的另一侧；
 *   水里的个体蹬得更远（世界材料：湿身 `body.wet()` 加长滑行）。与急速折返分开的地方是落点：
 *   急速折返结束在自己这一侧，快速折返**越过目标落在对面**，像真的翻了过去。
 *   **有合法后备时，出手后由原生队伍操作收回自己、让后备在落点登场；没有后备时保留场内的越位与滑走。**
 *
 * 数据分散（每项依赖不同精灵数据）：
 *   ram            冲撞威力 = 物攻（撞）+ 速度（转身的那股劲）+ 等级成长。
 *   dash           冲刺距离 = 速度 + 体型高度；实际射程来源。
 *   speed          每刻位移 = 速度。
 *   collisionRadius 判定半径 = 体型高度。
 *   cross          越过目标多远 = 速度 + 体重；越重的个体翻身滑得更远。
 *   glide          蹬开后继续滑行 = 速度 + 等级；湿身 ×1.25（水里滑得远）。
 *   shove          目标被推距离 = 物攻。
 *   rally          回身式的接应半径 = 等级。
 *   motes          水花数 = 物攻 + 速度；直接驱动粒子数量。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却。
 *
 * 配置 `turn`（回身式）双向取舍：开启＝越过目标后回身落向等候的伙伴（归队再战、有人接应），
 *   滑行 ×0.8 但冲撞 ×1.12；关闭（深潜式）＝越过目标继续深潜远遁，滑行 ×1.3 但冲撞 ×0.9。
 *   一个换更重的撞击与归队，一个换更远的脱身。
 *
 * 伤害段 `ram` 走共享换算（原始类别 Physical，接触）。
 */
namespace PokemonSkills {
    actionParameters.define("flipturn", {
        /** 冲撞威力：38 +（物攻 − 60）×0.26 [−10,28] +（速度 − 55）×0.14 [−5,14]；回身 ×1.12／深潜 ×0.9；夹 26..100。 */
        ram: formula(
            F.base(38)
                .plus(F.stat("attack").minus(60).times(0.26).clamp(-10, 28))
                .plus(F.stat("speed").minus(55).times(0.14).clamp(-5, 14))
                .times(F.when(F.pref("turn", text("worldcombat.skill.flipturn.preference.turn")), F.const(1.12), F.const(0.9)))
                .clamp(26, 100).round(1),
            "冲撞威力", {
                base: 46, unit: "威力",
                description: "这一撞随精灵数据变化的那部分：物攻给撞劲，速度给翻身那一蹬。回身式更重、深潜式更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲刺距离：2.5 +（速度 − 55）×0.018 [−0.4,1.1] +（身高 − 1.4）×0.35 [−0.15,0.5]；夹 2.0..4.6。 */
        dash: formula(
            F.base(2.5).plus(F.stat("speed").minus(55).times(0.018).clamp(-0.4, 1.1))
                .plus(F.body("height").minus(1.4).times(0.35).clamp(-0.15, 0.5)).clamp(2, 4.6).round(2),
            "冲刺距离", { unit: " 格", description: "撞上目标所需的最大距离，也是本招的实际射程；腿快身长的个体起手更远。" }),
        /** 每刻位移：1.2 +（速度 − 55）×0.008 [−0.25,0.55]；夹 0.9..2.1。 */
        speed: formula(
            F.base(1.2).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.25, 0.55)).clamp(0.9, 2.1).round(2),
            "冲刺速度", { unit: "格/刻", description: "游向目标时每刻移动的距离；快的个体几乎读不出中间过程。" }),
        /** 判定半径：0.42 +（身高 − 1.4）×0.1 [−0.08,0.26]；夹 0.34..0.72。 */
        collisionRadius: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.08, 0.26)).clamp(0.34, 0.72).round(2),
            "判定半径", { unit: "格", description: "撞上去能覆盖多大一圈；身板大的个体不容易被侧身让开。" }),
        /** 越位距离：1.1 +（速度 − 55）×0.012 [−0.25,0.7] +（体重 − 50）×0.004 [−0.1,0.5]；夹 0.8..2.6。 */
        cross: formula(
            F.base(1.1).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.25, 0.7))
                .plus(F.body("weight").minus(50).times(0.004).clamp(-0.1, 0.5)).clamp(0.8, 2.6).round(2),
            "越位距离", { unit: " 格", description: "翻身之后落在目标另一侧多远的地方；越重越快，滑得越开。" }),
        /** 滑行距离：3.2 +（速度 − 55）×0.03 [−0.6,1.7] +（等级 − 30）×0.02 [0,0.8]；湿身 ×1.25；回身 ×0.8／深潜 ×1.3；夹 2..7.5。 */
        glide: formula(
            F.base(3.2).plus(F.stat("speed").minus(55).times(0.03).clamp(-0.6, 1.7))
                .plus(F.level().minus(30).times(0.02).clamp(0, 0.8))
                .times(F.when(F.state("wet"), F.const(1.25), F.const(1)))
                .times(F.when(F.pref("turn", text("worldcombat.skill.flipturn.preference.turn")), F.const(0.8), F.const(1.3)))
                .clamp(2, 7.5).round(2),
            "滑行距离", {
                unit: " 格",
                description: "蹬开之后继续滑多远；速度与等级越大越远，泡在水里再 ×1.25，深潜式比回身式滑得更远。"
            }),
        /** 推开目标：0.4 +（物攻 − 60）×0.004 [−0.1,0.35]；夹 0.2..1.0。 */
        shove: formula(
            F.base(0.4).plus(F.stat("attack").minus(60).times(0.004).clamp(-0.1, 0.35)).clamp(0.2, 1.0).round(2),
            "推开目标", { unit: " 格", description: "蹬开时把目标朝自己原来的方向推一点；物攻越大推得越开。" }),
        /** 接应半径：6 +（等级 − 30）×0.06 [0,2.4]；夹 4..9。 */
        rally: formula(
            F.base(6).plus(F.level().minus(30).times(0.06).clamp(0, 2.4)).clamp(4, 9).round(1),
            "接应半径", { unit: " 格", description: "回身式会落到这么远以内最近的等候伙伴身边；等级越高越能招呼远处的伙伴。" }),
        /** 水花数：16 +（物攻 − 60）×0.15 [−5,18] +（速度 − 55）×0.1 [−2,9]；夹 10..46。 */
        motes: formula(
            F.base(16).plus(F.stat("attack").minus(60).times(0.15).clamp(-5, 18))
                .plus(F.stat("speed").minus(55).times(0.1).clamp(-2, 9)).clamp(10, 46).round(0),
            "水花数", { unit: "点", description: "翻身蹬开时溅起的水花数量，直接驱动表现密度；物攻与速度越大溅得越多。" }),
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.015).clamp(-0.6, 1.2)).clamp(3, 6).round(0),
            "起手", "压身入水、蓄势的时间；速度越快越短。"),
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.4)).clamp(4, 8).round(0),
            "收招", "滑走后收势的时间；速度越快越利落。"),
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 5)).clamp(18, 34).round(0),
            "冷却", "再折返一次前的等待；速度越快回得越快。")
    });

    defineDamage("flipturn", "ram", { rationale: "泳者式转身的冲撞：接触、重而不暴，落点才是它的身份。" }, { contact: true });

    stages("flipturn", [
        { level: 32, values: { ram: 54, recharge: 22 } },
        { level: 50, values: { ram: 64, recharge: 18 } }
    ]);

    describe("flipturn", [
        { key: "description.0", values: ["ram"] },
        { key: "description.1", values: ["dash", "speed", "collisionRadius"] },
        { key: "description.2", values: ["cross","glide","shove"] },
        { key: "description.3", values: ["rally"] },
        { key: "description.swap", values: [] },
        { key: "turn.on", values: [], when: function (context) { return read(context.detail.values, ["turn"]) === true; } },
        { key: "turn.off", values: [], when: function (context) { return read(context.detail.values, ["turn"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ram"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ram"] }
    ]);
}
