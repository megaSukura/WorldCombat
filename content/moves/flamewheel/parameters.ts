/**
 * 火焰轮 / flamewheel 的参数与伤害段。
 *
 * 原生事实：火、物理、威力 60、命中 100、PP 25、接触、10% 灼伤、defrost（Cobblemon 1.8，32 位学习者）。
 * 翻译：把「让火焰覆盖全身，猛撞向对手，有时让对手灼伤」落成一次**蜷成火轮的滚动冲锋**——起手把身体缩成一团、
 * 火包住轮缘，提交后卷着向前滚，碾过路上每一个挡住它的对手，不停在第一个身上；滚完一圈，火顺带把施法者
 * 身上的冰化掉（defrost）。它是本族里唯一没有反伤、靠**滚动**走路的一招。
 *
 * 与同族分开：闪焰冲锋是一条拖长的火线并自伤、电光是贴身短促的一点电、伏特攻击是蓄电爆冲并放电波及旁人；
 * 火焰轮的辨识点是**边滚边碾、一直滚过去**，以及滚完之后自己身上的冰化了。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   wheel       轮击威力：速度是滚动的主引擎，物攻把火压进去；烈焰轮略收。
 *   roll        滚动距离：速度决定一口气滚多远。
 *   spin        滚动速度：速度决定每刻前进多少。
 *   radius      轮径（判定半径）：碰撞箱高度决定轮子多大。
 *   through     碾过占比：物攻决定后续目标吃到的比例。
 *   burnChance  灼伤概率：速度决定摩擦起火的容易程度；烈焰轮显著提高。
 *   burnTicks   灼伤时长：特攻与等级；烈焰轮延长。
 *   shove       碾开位移：体重决定把目标挤开多远。
 *   flames      火星数量：速度派生，表现按它发射。
 *   tempo/aftercast/recharge  速度决定起手／收招／冷却；烈焰轮更慢。
 *
 * 配置 fierce（烈焰轮 / 疾风轮）双向取舍：
 *   烈焰轮＝灼伤概率与时长显著提高、火星更多、滚得更慢更短——把滚动换成持续点燃；
 *   疾风轮＝威力、滚动距离与滚动速度更高、节奏更快，但几乎不点着对手——用滚动清场。
 * 两个方向各有局面（点燃 vs 清场）。
 *
 * 伤害段 wheel：这一滚随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("flamewheel", {
        /** 轮击威力：基础 60，物攻每比 60 多 1 加 0.30（夹 -16..36），速度每比 60 快 1 加 0.26（夹 -12..30）；烈焰 ×0.9 / 疾风 ×1.08；夹 40..140。 */
        wheel: formula(
            F.base(60).plus(F.stat("attack").minus(60).times(0.3).clamp(-16, 36))
                .plus(F.stat("speed").minus(60).times(0.26).clamp(-12, 30))
                .times(F.when(F.pref("fierce", text("worldcombat.skill.flamewheel.preference.fierce")), F.const(0.9), F.const(1.08)))
                .clamp(40, 140).round(1),
            "轮击威力", {
                unit: "威力",
                description: "火轮碾过目标那一下的基础威力；滚动越快、物攻越重碾得越狠。烈焰轮把火分给后续燃烧、略收一档，疾风轮滚得更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 滚动距离：基础 4.4 格，速度每比 60 快 1 加 0.03（夹 -1.2..2.4）；烈焰 ×0.9 / 疾风 ×1.15；夹 3.0..7.0。 */
        roll: formula(
            F.base(4.4).plus(F.stat("speed").minus(60).times(0.03).clamp(-1.2, 2.4))
                .times(F.when(F.pref("fierce", text("worldcombat.skill.flamewheel.preference.fierce")), F.const(0.9), F.const(1.15)))
                .clamp(3.0, 7.0).round(2),
            "滚动距离", {
                unit: "格",
                description: "从蜷身到滚停的总位移，也是本招的射程基准；腿快的个体滚得更远，烈焰轮滚得更短、疾风轮滚得更长。"
            }),
        /** 滚动速度：基础 1.0 格/刻，速度每比 60 快 1 加 0.008（夹 -0.25..0.7）；烈焰 ×0.94 / 疾风 ×1.08；夹 0.7..1.7。 */
        spin: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.008).clamp(-0.25, 0.7))
                .times(F.when(F.pref("fierce", text("worldcombat.skill.flamewheel.preference.fierce")), F.const(0.94), F.const(1.08)))
                .clamp(0.7, 1.7).round(2),
            "滚动速度", {
                unit: "格/刻",
                description: "火轮每刻前进的距离；越快越难被侧移让开，也越容易一口气碾过一串人。"
            }),
        /** 轮径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.14；夹 0.4..0.95。 */
        radius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.14)).clamp(0.4, 0.95).round(2),
            "轮径", {
                unit: "格",
                description: "蜷起来的火轮扫过的横向判定半径；身板越大轮子越大。"
            }),
        /** 碾过占比：基础 0.72，物攻每比 60 多 1 加 0.0012（夹 -0.1..0.16）；夹 0.55..0.88。 */
        through: percent(
            F.base(0.72).plus(F.stat("attack").minus(60).times(0.0012).clamp(-0.1, 0.16)).clamp(0.55, 0.88),
            "碾过占比", "第一个目标之后被碾到的人吃到的威力比例；物攻越高碾得越透。"),
        /** 灼伤概率：基础 0.10，速度每比 60 快 1 加 0.0012（夹 -0.03..0.10）；烈焰 +0.10 / 疾风 -0.02；夹 0.05..0.48。 */
        burnChance: percent(
            F.base(0.10).plus(F.stat("speed").minus(60).times(0.0012).clamp(-0.03, 0.1))
                .plus(F.when(F.pref("fierce", text("worldcombat.skill.flamewheel.preference.fierce")), F.const(0.10), F.const(-0.02)))
                .clamp(0.05, 0.48).round(3),
            "灼伤概率", "火轮碾过时把火蹭到对方身上、让它灼伤的机会（原生 10%）；滚得越快摩擦越烈，烈焰轮显著提高、疾风轮略降。"),
        /** 灼伤时长：基础 180，特攻每比 60 多 1 加 0.8（夹 -35..100），等级每比 30 高 1 加 1.0（夹 0..40）；烈焰 ×1.3；夹 120..400。 */
        burnTicks: seconds(
            F.base(180).plus(F.stat("specialAttack").minus(60).times(0.8).clamp(-35, 100))
                .plus(F.level().minus(30).times(1).clamp(0, 40))
                .times(F.when(F.pref("fierce", text("worldcombat.skill.flamewheel.preference.fierce")), F.const(1.3), F.const(1)))
                .clamp(120, 400).round(0),
            "灼伤时长", "目标被蹭上火后持续掉血的时长；特攻与等级越高烧得越久，烈焰轮更久。"),
        /** 碾开位移：基础 0.4 格，体重每比 60 多 1 加 0.004（夹 -0.25..0.9）；夹 0.2..1.6。 */
        shove: formula(
            F.base(0.4).plus(F.body("weight").minus(60).times(0.004).clamp(-0.25, 0.9)).clamp(0.2, 1.6).round(2),
            "碾开位移", {
                unit: "格",
                description: "碾中后把目标顺滚动方向挤开多远；越重挤得越开，但滚动不会因此停下。"
            }),
        /** 火星数量：基础 22，速度每比 60 快 1 加 0.4（夹 -8..22）；夹 16..64。 */
        flames: formula(
            F.base(22).plus(F.stat("speed").minus(60).times(0.4).clamp(-8, 22)).clamp(16, 64).round(0),
            "火星数量", {
                unit: "个",
                description: "火轮滚动与碾过时迸开的火星数量，随速度增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 7 刻，速度每比 60 快 1 少 0.02（夹 -2.5..3），烈焰 +2；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-2.5, 3))
                .plus(F.when(F.pref("fierce", text("worldcombat.skill.flamewheel.preference.fierce")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "蜷身成轮、火包住轮缘的时长；速度越快越干脆，烈焰轮要先烧旺。"),
        /** 收招：基础 8 刻，速度每比 60 快 1 少 0.02（夹 -2.5..3）；夹 4..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-2.5, 3)).clamp(4, 12).round(0),
            "收招", "滚完展开身体的收势；速度越快越利落。"),
        /** 冷却：基础 30 刻，速度每比 60 快 1 少 0.04（夹 -5..7），烈焰 +5；夹 18..45。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.04).clamp(-5, 7))
                .plus(F.when(F.pref("fierce", text("worldcombat.skill.flamewheel.preference.fierce")), F.const(5), F.const(0)))
                .clamp(18, 45).round(0),
            "冷却", "两次火焰轮之间的间隔；速度越快回得越快，烈焰轮缓得更久。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05),
        pierceCount: hidden(4)
    });

    defineDamage("flamewheel", "wheel", { defenceCoefficient: 0.005,
        rationale: "蜷成火轮滚过目标的接触碾压，按标准防御系数结算，靠速度与物攻拉开差距。" }, { contact: true });

    stages("flamewheel", [
        { level: 33, values: { wheel: 70 } },
        { level: 50, values: { wheel: 82, burnChance: 0.16 } }
    ]);

    describe("flamewheel", [
        { key: "description.0", values: ["wheel", "roll", "spin", "radius"] },
        { key: "description.1", values: ["through", "burnChance", "burnTicks", "shove", "flames"] },
        { key: "fierce.on", values: [], when: function (context) { return read(context.detail.values, ["fierce"]) === true; } },
        { key: "fierce.off", values: [], when: function (context) { return read(context.detail.values, ["fierce"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wheel"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wheel", "tier.1.burnChance"] }
    ]);
}
