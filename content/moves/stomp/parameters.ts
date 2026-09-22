/**
 * 踩踏 / stomp 的参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 65／命中 100／PP 20／接触／30% 畏缩／只打地面（nonsky）（Cobblemon 1.8，65 位学习者）。
 * 翻译：把“用大脚踩踏对手”落成一次**把全身重量往下砸**——高高抬起、对准目标落脚，砸中的那一下最重，
 * 脚下的震波还会把附近站着的人一起震得发懵；**只砸得到站在地上的目标**，空中的人躲得开（nonsky）。
 * 它是畏缩家族里最慢最重、也是唯一能波及一小圈的近身招，落点会留下一小片塌陷。
 *
 * 与同族分开：重踏（bulldoze）是绕自己一圈的地裂、跺脚（stompingtantrum）是一条朝目标的地缝；
 * **踩踏是一记垂直下砸**：单体最重、命中即塌陷、只认站在地上的对手。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   slam         主砸威力 65 + 体重偏移（主项）+ 物攻偏移；重踏式 ×1.12、快压 ×0.94。
 *   aftershock   震波威力 26 + 体重偏移；重踏 ×1.10、快压 ×0.90。
 *   shock        震波半径 1.6 + 体重偏移 + 身高偏移；重踏 ×1.3、快压 ×0.85。
 *   foot         落脚判定 0.5 + 身高偏移。
 *   crater       塌陷半径 1.1 + 体重偏移；重踏 ×1.25、快压 ×0.85。
 *   craterTicks  塌陷停留 80 刻 + 体重偏移。
 *   flinchChance 主目标畏缩几率 0.30 + 物攻偏移；重踏 ×1.1。
 *   staggerChance 震波畏缩几率 0.16 + 物攻偏移；重踏 ×1.15。
 *   flinchTicks  畏缩持续 12 刻；重踏 +4。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却。
 *
 * 配置 `heavy`（重踏式）双向取舍：开启＝更高更重、塌陷与震波更广、更容易震懵，但起手更慢、冷却更久；
 * 关闭＝快压，出手快、范围小、单发略轻。两个方向各有适用局面（砸桩 vs 抢节奏）。
 *
 * 两段伤害：`slam` 打主目标、`aftershock` 打震波圈内的旁人，各走共享换算（原生类别 Physical，Normal 属性）。
 */
namespace PokemonSkills {
    actionParameters.define("stomp", {
        /** 主砸威力：体重每比 50 多 1 加 0.10（上限 +40），物攻每比 50 多 1 加 0.22（上限 +24）；
         *  基础 65；重踏 ×1.12 / 快压 ×0.94；夹在 38..150。 */
        slam: formula(
            F.base(65).plus(F.body("weight").minus(50).times(0.10).clamp(-10, 40))
                .plus(F.stat("attack").minus(50).times(0.22).clamp(-10, 24))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.stomp.preference.heavy")), F.const(1.12), F.const(0.94)))
                .clamp(38, 150).round(1),
            "主砸威力", {
                unit: "威力",
                description: "整只身体压到目标身上这一下的基础威力；**体重是本招的主角**，物攻补上砸的狠度。对手防御、相性与暴击在命中时另算。"
            }),
        /** 震波威力：体重每比 50 多 1 加 0.05（上限 +18）；基础 26；重踏 ×1.10 / 快压 ×0.90；夹在 12..64。 */
        aftershock: formula(
            F.base(26).plus(F.body("weight").minus(50).times(0.05).clamp(-5, 18))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.stomp.preference.heavy")), F.const(1.10), F.const(0.90)))
                .clamp(12, 64).round(1),
            "震波威力", {
                unit: "威力",
                description: "落点周围站着的人被地面震到的威力；比主砸轻得多，但一圈都吃，越过体重越沉。"
            }),
        /** 震波半径：基础 1.6 格，体重每比 50 多 1 加 0.006（上限 +1.4），身高每比 1.4 高 1 格加 0.10（上限 +0.3）；
         *  重踏 ×1.3 / 快压 ×0.85；夹在 1.0..4.0。 */
        shock: formula(
            F.base(1.6).plus(F.body("weight").minus(50).times(0.006).clamp(-0.3, 1.4))
                .plus(F.body("height").minus(1.4).times(0.10).clamp(-0.1, 0.3))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.stomp.preference.heavy")), F.const(1.3), F.const(0.85)))
                .clamp(1.0, 4.0).round(2),
            "震波半径", {
                unit: "格",
                description: "落点周围多远内、站在地上的敌人会吃到震波；越重越大。这是画面的范围，也是判定的范围。"
            }),
        /** 落脚判定：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.12（上限 +0.25）；夹在 0.4..0.9。 */
        foot: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.05, 0.25)).clamp(0.4, 0.9).round(2),
            "落脚判定", {
                unit: "格",
                description: "这一脚落点的横向判定半径；腿越长、脚越大踩得越准。"
            }),
        /** 塌陷半径：基础 1.1 格，体重每比 50 多 1 加 0.004（上限 +0.9）；重踏 ×1.25 / 快压 ×0.85；夹在 0.7..2.6。 */
        crater: formula(
            F.base(1.1).plus(F.body("weight").minus(50).times(0.004).clamp(-0.2, 0.9))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.stomp.preference.heavy")), F.const(1.25), F.const(0.85)))
                .clamp(0.7, 2.6).round(2),
            "塌陷半径", {
                unit: "格",
                description: "落点地表被踩实、踩裂的范围；越重越大，也是留在地上的那一小片痕迹的大小。"
            }),
        /** 塌陷停留：基础 80 刻，体重每比 50 多 1 加 0.4（上限 +60，下限 −20）；夹在 50..180。 */
        craterTicks: seconds(
            F.base(80).plus(F.body("weight").minus(50).times(0.4).clamp(-20, 60)).clamp(50, 180).round(0),
            "塌陷停留", "落点的地痕停留多久后原方块回来；越重踩得越实、留得越久。"),
        /** 主目标畏缩几率：基础 0.30，物攻每比 50 多 1 加 0.0009（上限 +0.1）；重踏 ×1.1；夹在 0.18..0.48。 */
        flinchChance: percent(
            F.base(0.30).plus(F.stat("attack").minus(50).times(0.0009).clamp(-0.05, 0.1))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.stomp.preference.heavy")), F.const(1.1), F.const(1))).clamp(0.18, 0.48),
            "主目标畏缩几率", "被这一脚正面砸实的目标畏缩几率（原生 30%）；物攻越高越容易把人踩懵。"),
        /** 震波畏缩几率：基础 0.16，物攻每比 50 多 1 加 0.0007（上限 +0.08）；重踏 ×1.15；夹在 0.10..0.32。 */
        staggerChance: percent(
            F.base(0.16).plus(F.stat("attack").minus(50).times(0.0007).clamp(-0.04, 0.08))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.stomp.preference.heavy")), F.const(1.15), F.const(1))).clamp(0.10, 0.32),
            "震波畏缩几率", "只被震波扫到的旁人畏缩几率；比重砸低得多，边缘的人大多只是挨一下。"),
        /** 畏缩持续：基础 12 刻，重踏式 +4；夹在 10..22 刻。 */
        flinchTicks: seconds(
            F.base(12).plus(F.when(F.pref("heavy", text("worldcombat.skill.stomp.preference.heavy")), F.const(4), F.const(0))).clamp(10, 22).round(0),
            "畏缩持续", "被踩懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 起手：基础 9 刻，速度每比 55 快 1 减 0.015（下限 −2）；重踏 +4；夹在 6..16。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.015).clamp(-2, 2))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.stomp.preference.heavy")), F.const(4), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "抬脚、沉身到能砸下去的时间；速度越快越短，重踏式要抬得更高。"),
        /** 收招：基础 9 刻，速度每比 55 快 1 减 0.015（下限 −2）；重踏 +2；夹在 5..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.015).clamp(-2, 2))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.stomp.preference.heavy")), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "收招", "砸完把重心收回来、拔脚的时间；重踏式陷得更深、收得更慢。"),
        /** 冷却：基础 24 刻，速度每比 55 快 1 减 0.04（下限 −4）；重踏 +8；夹在 14..40。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 4))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.stomp.preference.heavy")), F.const(8), F.const(0)))
                .clamp(14, 40).round(0),
            "冷却", "两次踩踏之间的等待；它是最重的近身招，冷却也最长，重踏式更久。")
    });

    stages("stomp", [
        { level: 22, values: { slam: 60, aftershock: 24 } },
        { level: 40, values: { slam: 78, shock: 2.2, flinchChance: 0.36 } }
    ]);

    defineDamage("stomp", "slam", { defenceCoefficient: 0.006,
        rationale: "整只身体的垂直下砸；防御按默认系数减伤。" }, { contact: true });
    defineDamage("stomp", "aftershock", { defenceCoefficient: 0.005,
        rationale: "地面震波；比直接命中轻，防御按略低系数减伤。" });

    describe("stomp", [
        { key: "description.0", values: ["slam", "foot"] },
        { key: "description.1", values: ["aftershock", "shock"] },
        { key: "description.2", values: ["flinchChance", "staggerChance", "flinchTicks"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam", "tier.0.aftershock"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slam", "tier.1.shock", "tier.1.flinchChance"] }
    ]);
}
