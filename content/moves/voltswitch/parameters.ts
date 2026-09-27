/**
 * 伏特替换 / voltswitch —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：电／特殊／威力 70／命中 100／PP 20／优先度 0／不接触／selfSwitch；
 *   说明与急速折返同款：「在攻击之后急速返回，和后备宝可梦进行替换」。
 *
 * 世界化翻译：它是一次**跳闸**——把一道电弧钉向瞄向的实体或位置，然后顺着电流把自己「切换」到落点：不是跑过去，
 *   是瞬间出现；落点以当前脚底的真实支撑和原生空域探针核对，找不到安全点就原地收招。三道折返里只有它是远程、特殊、
 *   且用瞬移换位。换手式（relay 关闭）在有合法后备时由原生队伍操作收回自己、让后备登场。
 *
 * 数据分散（每项依赖不同精灵数据）：
 *   volt           电弧威力 = 特攻 + 等级成长。
 *   reach          射程 = 特攻；能放多远。
 *   boltSpeed      电弧速度 = 特攻；电荷跑得多快。
 *   collisionRadius 判定半径 = 体型高度。
 *   blink          切换距离 = 速度；跳得离敌人多远。
 *   arc            横向偏移 = 体型宽度；像换一条线路一样偏出去。
 *   rally          落点搜寻半径 = 等级；有伙伴在侧时跳到他身后。
 *   motes          电火花数 = 特攻；直接驱动粒子数量。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却。
 *
 * 配置 `relay`（留守式）双向取舍：开启＝放电后原地留守（只瞬移换位，不换手），代价是电弧威力 ×0.85、冷却 +6 刻、
 *   切换距离 ×0.85；关闭（换手式）＝电弧威力 ×1.2、切换 ×1.2 跳得更远，有合法后备时直接与待命的一只换手。
 *
 * 伤害段 `volt` 走共享换算（原始类别 Special，不接触）。
 */
namespace PokemonSkills {
    actionParameters.define("voltswitch", {
        /** 电弧威力：42 +（特攻 − 50）×0.28 [−10,30] +（等级 − 30）×0.15 [0,12]；留守 ×0.85／换手 ×1.2；夹 30..112。 */
        volt: formula(
            F.base(42)
                .plus(F.stat("specialAttack").minus(50).times(0.28).clamp(-10, 30))
                .plus(F.level().minus(30).times(0.15).clamp(0, 12))
                .times(F.when(F.pref("relay", text("worldcombat.skill.voltswitch.preference.relay")), F.const(0.85), F.const(1.2)))
                .clamp(30, 112).round(1),
            "电弧威力", {
                base: 52, unit: "威力",
                description: "这一放电弧随精灵数据变化的那部分：特攻给电压，等级给蓄电的熟练。留守式更弱、换手式更强。对手防御、相性与暴击在命中时另算。"
            }),
        /** 射程：10 +（特攻 − 50）×0.03 [−1.5,3.5]；夹 8..15。 */
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").minus(50).times(0.03).clamp(-1.5, 3.5)).clamp(8, 15).round(1),
            "射程", { unit: " 格", description: "电弧能钉到多远，也是本招的实际射程；特攻高放得远。" }),
        /** 电弧速度：1.6 +（特攻 − 50）×0.006 [−0.25,0.6]；夹 1.3..2.6。 */
        boltSpeed: formula(
            F.base(1.6).plus(F.stat("specialAttack").minus(50).times(0.006).clamp(-0.25, 0.6)).clamp(1.3, 2.6).round(2),
            "电弧速度", { unit: "格/刻", description: "电弧飞行的速度；特攻高的个体电荷跑得更急。" }),
        /** 判定半径：0.35 +（身高 − 1.4）×0.08 [−0.06,0.22]；夹 0.28..0.6。 */
        collisionRadius: formula(
            F.base(0.35).plus(F.body("height").minus(1.4).times(0.08).clamp(-0.06, 0.22)).clamp(0.28, 0.6).round(2),
            "判定半径", { unit: "格", description: "电弧能覆盖多大一圈；身板大的个体电弧更粗。" }),
        /** 切换距离：4.5 +（速度 − 55）×0.03 [−0.7,1.8]；留守 ×0.85／换手 ×1.2；夹 3..8。 */
        blink: formula(
            F.base(4.5).plus(F.stat("speed").minus(55).times(0.03).clamp(-0.7, 1.8))
                .times(F.when(F.pref("relay", text("worldcombat.skill.voltswitch.preference.relay")), F.const(0.85), F.const(1.2)))
                .clamp(3, 8).round(2),
            "切换距离", {
                unit: " 格",
                description: "放电后自己瞬间出现在离原位多远的地方；速度越快跳得越远，换手式比留守式跳得更远。落点会按真实支撑与空域探针核对，站不下就原地收招。"
            }),
        /** 横向偏移：0.8 +（宽度 − 0.9）×1.2 [−0.2,1.4] +（体重 − 50）×0.006 [−0.15,0.5]；夹 0.4..2.6。 */
        arc: formula(
            F.base(0.8).plus(F.body("width").minus(0.9).times(1.2).clamp(-0.2, 1.4))
                .plus(F.body("weight").minus(50).times(0.006).clamp(-0.15, 0.5)).clamp(0.4, 2.6).round(2),
            "横向偏移", { unit: " 格", description: "切换时像换一条线路一样往侧面偏出的距离；身宽体重的个体偏得越开。" }),
        /** 落点搜寻半径：6 +（等级 − 30）×0.06 [0,2.4]；夹 4..9。 */
        rally: formula(
            F.base(6).plus(F.level().minus(30).times(0.06).clamp(0, 2.4)).clamp(4, 9).round(1),
            "接应半径", { unit: " 格", description: "这么远以内有伙伴时，切换落点会选在伙伴身后；等级越高越能招呼远处的伙伴。" }),
        /** 电火花数：14 +（特攻 − 50）×0.2 [−4,22]；夹 10..40。 */
        motes: formula(
            F.base(14).plus(F.stat("specialAttack").minus(50).times(0.2).clamp(-4, 22)).clamp(10, 40).round(0),
            "电火花", { unit: "点", description: "放电与切换时迸出的火花数量，直接驱动表现密度；特攻越高越密。" }),
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.012).clamp(-0.5, 1)).clamp(4, 7).round(0),
            "起手", "蓄电到放电之间的时间；速度越快越短。"),
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.4)).clamp(4, 8).round(0),
            "收招", "重新站稳的时间；速度越快越利落。"),
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 5)).clamp(20, 36).round(0),
            "冷却", "再切换一次前的等待；速度越快回得越快；留守式还要多等 6 刻。")
    });

    defineDamage("voltswitch", "volt", { rationale: "一道钉在目标身上的电弧：远程特殊、干净利落，价值在随后的瞬移换位。" }, {});

    stages("voltswitch", [
        { level: 32, values: { volt: 60, recharge: 24 } },
        { level: 50, values: { volt: 70, recharge: 20 } }
    ]);

    describe("voltswitch", [
        { key: "description.0", values: ["volt"] },
        { key: "description.1", values: ["reach", "boltSpeed", "collisionRadius"] },
        { key: "description.2", values: ["blink", "arc", "rally"] },
        { key: "description.blink", values: [] },
        { key: "relay.on", values: [], when: function (context) { return read(context.detail.values, ["relay"]) === true; } },
        { key: "relay.off", values: [], when: function (context) { return read(context.detail.values, ["relay"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.volt"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.volt"] }
    ]);
}
