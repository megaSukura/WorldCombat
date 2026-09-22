/**
 * 旋风刀 / razorwind —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8，60 位学习者）：Normal／特殊／威力 80／命中 100／PP 10／非接触／flags charge（蓄力两回合）／
 *   critRatio 2（暴击率高出一档）。原生描述：「制造风之刃，于第２回合攻击对手，容易击中要害。」
 *
 * 翻译：把「蓄一回合、第二回合甩出风之刃」落成一记**蓄风成扇**——提交前站定把四周的气流拧成一把把风之刃，
 *   蓄得越久刃越多越亮；提交后一口气把整把扇子朝身前甩出去，覆盖一个扇形，被扫到的每个敌人各挨一记风刃。
 *   原生的「容易击中要害」沿用 critRatio 2 的共享结算；蓄力期可被打断、打断不花 PP，是它在即时战斗里的代价。
 *   它是本族唯一的**蓄力扇形远程**：不像水波刀/精神利刃沿一条线走，而是铺开一个正面。
 *
 * 数值分散（每个参数读不同的精灵数据；公式即悬浮里展开的那一棵）：
 *   blade      风刃威力：特攻定风压得多实、等级定收束程度；散流式摊薄单发。
 *   reach      扇面射程：特攻与等级决定风刃撑到哪才散，也是实际射程。
 *   fan        扇面半角：特攻越高能拢出越宽的一扇；散流式铺开、集刃式收窄。
 *   blades     风刃数量：速度与特攻决定一次拧出几把；它同时是这一扇最多能切到几个敌人的上限。
 *   chargeTicks 蓄风时间：速度决定拧得多快；这是「第２回合」的代价。
 *   motes      风屑量：特攻与速度换算，驱动表现密度。
 *   tempo／aftercast／recharge：速度定节奏；散流式以更慢的单发与更久的冷却换更宽的一扇。
 *
 * 配置 `spread`（散流式）双向取舍（默认关）：
 *   开：扇面半角 ×1.4、风刃 ×1.5，代价是威力 ×0.85、射程 ×0.9——用来一次扫到成排的目标。
 *   关（集刃式）：威力 ×1.12、射程 ×1.12，代价是扇面收窄到 ×0.7——用来正面对着一两个人切重一点。
 *
 * 伤害段 `blade`：每一把风刃切中一个目标那一下，走共享换算（原生类别 Special，Normal 属性，非接触，带 slice 标记）。
 */
namespace PokemonSkills {
    export const razorwindId = "razorwind";
    export const razorwindScene = "world_combat:move_razorwind";
    export const razorwindHitText = "world_combat.move.razorwind.text.hit";
    export const razorwindCritText = "world_combat.move.razorwind.text.crit";
    export const razorwindMissText = "world_combat.move.razorwind.text.miss";
    /** 表现里风刃尺寸的参考数量（把）；服务端传 scale = 实际风刃数 / 这个值。 */
    export const razorwindReference = 6;

    actionParameters.define(razorwindId, {
        /** 风刃威力：80 + (特攻−60)×0.35（夹 −14..44）+ (等级−30)×0.4（夹 0..20）；散流 ×0.85 / 集刃 ×1.12；夹 56..180。 */
        blade: formula(
            F.base(80)
                .plus(F.stat("specialAttack").minus(60).times(0.35).clamp(-14, 44))
                .plus(F.level().minus(30).times(0.4).clamp(0, 20))
                .times(F.when(F.pref("spread", text("worldcombat.skill.razorwind.preference.spread")), F.const(0.85), F.const(1.12)))
                .clamp(56, 180).round(1),
            "风刃威力", {
                unit: "威力",
                description: "每一把风刃切中目标那一下的基础威力；特攻越高风压越实，散流式摊薄单发。对手特防、相性与暴击在命中时另算。"
            }),
        /** 扇面射程：8 + (特攻−60)×0.06（夹 −2..4）+ (等级−30)×0.05（夹 0..2）；散流 ×0.9 / 集刃 ×1.12；夹 6..15 格。 */
        reach: formula(
            F.base(8)
                .plus(F.stat("specialAttack").minus(60).times(0.06).clamp(-2, 4))
                .plus(F.level().minus(30).times(0.05).clamp(0, 2))
                .times(F.when(F.pref("spread", text("worldcombat.skill.razorwind.preference.spread")), F.const(0.9), F.const(1.12)))
                .clamp(6, 15).round(1),
            "扇面射程", {
                unit: "格",
                description: "这一扇风刃从施法者向前铺到多远；特攻与等级决定风刃撑到哪才散。它也是本招实际射程。"
            }),
        /** 扇面半角：42 + (特攻−60)×0.15（夹 −8..20）；散流 ×1.4 / 集刃 ×0.7；夹 22..80 度。 */
        fan: formula(
            F.base(42).plus(F.stat("specialAttack").minus(60).times(0.15).clamp(-8, 20))
                .times(F.when(F.pref("spread", text("worldcombat.skill.razorwind.preference.spread")), F.const(1.4), F.const(0.7)))
                .clamp(22, 80).round(0),
            "扇面半角", {
                unit: "度",
                description: "风刃扇面从瞄准方向向两侧张开的角度；特攻越高拢得越宽，散流式铺开、集刃式收窄。画面里的扇面就是这块。"
            }),
        /** 风刃数量：4 + (速度−55)×0.05（夹 −1..4）+ (特攻−60)×0.04（夹 −1..3）；散流 ×1.5；夹 3..12 把。它也是命中上限。 */
        blades: formula(
            F.base(4)
                .plus(F.stat("speed").minus(55).times(0.05).clamp(-1, 4))
                .plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-1, 3))
                .times(F.when(F.pref("spread", text("worldcombat.skill.razorwind.preference.spread")), F.const(1.5), F.const(1)))
                .clamp(3, 12).round(0),
            "风刃数量", {
                unit: "把",
                description: "一次拧出的风刃数量，也是这一扇最多能切到几个敌人的上限；速度快、特攻高的个体拧得更多，散流式成倍增加。"
            }),
        /** 蓄风时间：30 − (速度−50)×0.08（夹 0..16）；夹 12..30 刻。 */
        chargeTicks: seconds(
            F.base(30).minus(F.stat("speed").minus(50).times(0.08).clamp(0, 16)).clamp(12, 30).round(0),
            "蓄风时间", "站定把四周气流拧成风之刃所需的时间；速度越快收得越早。这段时间里可被打断，打断不花 PP。"),
        /** 风屑量：22 + (特攻−60)×0.3（夹 −6..24）+ (速度−55)×0.2（夹 −4..10）；夹 16..64 个。 */
        motes: formula(
            F.base(22)
                .plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-6, 24))
                .plus(F.stat("speed").minus(55).times(0.2).clamp(-4, 10))
                .clamp(16, 64).round(0),
            "风屑量", {
                unit: "个",
                description: "蓄风与甩出时卷起的风屑数量，由特攻与速度换算；它驱动表现密度，不是独立伤害。"
            }),
        /** 起手：8 − (速度−55)×0.02（夹 −2..3）；夹 5..12 刻。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 3)).clamp(5, 12).round(0),
            "起手", "把气流拢到身周、准备开始拧刃的时间；速度越快越短。"),
        /** 收招：8 − (速度−55)×0.02（夹 −2..3）；夹 4..12 刻。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 3)).clamp(4, 12).round(0),
            "收招", "甩出整把扇子后收势的时间；速度越快越利落。"),
        /** 冷却：34 − (速度−55)×0.05（夹 −5..8）；夹 22..46 刻。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.05).clamp(-5, 8)).clamp(22, 46).round(0),
            "冷却", "再次开始拧刃前等待多久；速度越快回得越快。")
    });

    defineDamage(razorwindId, "blade", {}, { slice: true });

    stages(razorwindId, [
        { level: 38, values: { blade: 90 } },
        { level: 56, values: { blade: 100, reach: 10.5, fan: 52 } }
    ]);

    describe(razorwindId, [
        { key: "description.0", values: ["blade"] },
        { key: "description.1", values: ["reach", "fan", "blades"] },
        { key: "description.2", values: ["chargeTicks"] },
        { key: "description.3", values: ["motes"] },
        { key: "stance.spread", values: [], when: function (context) { return read(context.detail.values, ["spread"]) === true; } },
        { key: "stance.focus", values: [], when: function (context) { return read(context.detail.values, ["spread"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blade"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blade", "tier.1.reach", "tier.1.fan"] }
    ]);
}
