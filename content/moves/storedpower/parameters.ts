/**
 * 辅助力量 / storedpower —— 参数与伤害段。
 *
 * 原生事实：Psychic／特殊／基础威力 20／命中 100／PP 10，威力 = 20 + 20 × 自身正面能力等级总数
 *   （`positiveBoosts()`，含命中率与闪避率），无接触（Cobblemon 1.8，132 位学习者）。
 *
 * 翻译：把「蓄积的力量」落成**从身体里放出去的一次灵能新星**——施法者一直把提升的等级攒在身上，
 *   出手时那些等级化作一圈圈灵光环向内收拢、再连同身体一起向外炸开：**离得越近的人越先被卷进去**。
 *   等级攒得越多，环越多、范围越大、每一下越深；这正是「辅助力量」的读法，也是它和嚣张分开的地方：
 *   嚣张是追着一个人冲出去的物理扑击，辅助力量是**以自己为圆心**放出去、逼对手先贴近的爆发。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   boost       蓄积等级：自身七项（攻／防／特攻／特防／速度／命中／闪避）正面等级的总和——本招的核心机制值。
 *   raised      提升项数：有正面等级的能力项数，决定起手时亮起几道灵光环。
 *   reservoir   释放威力：基础 18 + 蓄积等级 ×20（封顶 +120）+ 特攻偏移 + 等级偏移；倾囊时 ×1.35；夹 18..200。
 *   radius      释放半径：基础 3.2 格 + 蓄积等级偏移 + 身高偏移；倾囊时 ×1.2；夹 2.8..7.2。
 *   surge       灵能推力：基础 0.35 格 + 蓄积等级偏移 + 特攻偏移；夹 0.25..1.4。
 *   motes       灵光数：起手与新星的表现数量，随提升项数与蓄积等级走（表现消费者）。
 *   charge      起手：蓄得越多越快出手（等级替它省下聚气），速度也缩短它。
 *   settle      收招：速度决定；倾囊后多一拍。
 *   recharge    冷却：蓄积等级与速度缩短它，倾囊多花 6 刻。
 *
 * 配置 `spend`（倾囊）双向取舍：开启＝命中后把全部正面等级一并打出去，威力 ×1.35、范围 ×1.2，
 *   但等级清零、冷却 +6——换来一记最大的爆发；关闭＝等级保留、威力与范围按标准、冷却更短。
 *   攒等级与花等级，各有局面。
 *
 * 伤害段 `reservoir` 与参数同名：这一爆随精灵数据变化的那部分；对手防御、相性与暴击在命中时统一结算。
 * 属性与分类沿用原生 Psychic／特殊，不做覆写。
 */
namespace PokemonSkills {
    export const storedpowerId = "storedpower";
    export const storedpowerScene = "world_combat:move_storedpower";
    export const storedpowerSpendText = "world_combat.move.storedpower.text.spend";
    export const storedpowerHitText = "world_combat.move.storedpower.text.hit";
    export const storedpowerMissText = "world_combat.move.storedpower.text.miss";
    /** 计入蓄积的七项：五项能力加上命中与闪避，与原生 positiveBoosts 同口径。 */
    export const storedpowerStats = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];

    /** 宝可梦读原生能力等级，其他生物读共享能力等级；同一副 -6..+6 阶梯，另有命中／闪避两级。 */
    export function storedpowerStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        if (!world.valid(actor)) return {};
        return String(actor.domain()) === "cobblemon" ? NativeEffects.read(world, actor).stages : CombatStages.read(world, actor);
    }

    /** 自身七项里正面等级的总和；0 表示此刻没有蓄积。 */
    export function storedpowerBoosts(world: CombatWorld, actor: CombatActor): number {
        const stages = storedpowerStages(world, actor);
        let total = 0;
        storedpowerStats.forEach(function (stat) {
            const value = stages[stat] || 0;
            if (value > 0) total += value;
        });
        return total;
    }

    /** 有正面等级的能力项数；决定起手时亮起几道灵光环。 */
    export function storedpowerRaised(world: CombatWorld, actor: CombatActor): number {
        const stages = storedpowerStages(world, actor);
        let count = 0;
        storedpowerStats.forEach(function (stat) { if ((stages[stat] || 0) > 0) count++; });
        return count;
    }

    /** 倾囊：把全部正面等级一次打出去，返回实际释放的级数。 */
    export function storedpowerSpend(world: CombatWorld, actor: CombatActor): number {
        const stages = storedpowerStages(world, actor);
        let spent = 0;
        storedpowerStats.forEach(function (stat) {
            const value = stages[stat] || 0;
            if (value > 0) { NativeEffects.boost(world, actor, stat, -value); spent += value; }
        });
        return spent;
    }

    defineFacts(storedpowerId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string) {
            if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
            if (id === "storedpower.boost") return storedpowerBoosts(context.world, context.actor);
            if (id === "storedpower.raised") return storedpowerRaised(context.world, context.actor);
            return undefined;
        } };
    });

    actionParameters.define(storedpowerId, {
        /** 释放威力：18 + 蓄积等级 ×20（封顶 +120）+ 特攻偏移[−8,24] + 等级偏移[−2,6]；倾囊 ×1.35；夹 18..200。 */
        reservoir: formula(
            F.base(18)
                .plus(F.var("storedpower.boost", text("worldcombat.skill.storedpower.value.boost")).times(20).clamp(0, 120).as(text("worldcombat.skill.storedpower.value.stored")))
                .plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-8, 24))
                .plus(F.level().minus(30).times(0.18).clamp(-2, 6))
                .times(F.when(F.pref("spend", text("worldcombat.skill.storedpower.preference.spend")), F.const(1.35), F.const(1)))
                .clamp(18, 200).round(1),
            "释放威力", {
                unit: "威力",
                description: "这一爆打在圈里每个人身上的基准威力；**身上每有 1 级正面能力就加 20**（封顶 +120），特攻给底子、等级给分寸。开启倾囊时整体 ×1.35。对手防御、相性与暴击在命中时另算。"
            }),
        /** 释放半径：3.2 格 + 蓄积等级 ×0.26（封顶 +1.8）+ 身高偏移[−0.15,0.5]；倾囊 ×1.2；夹 2.8..7.2。 */
        radius: formula(
            F.base(3.2)
                .plus(F.var("storedpower.boost", text("worldcombat.skill.storedpower.value.boost")).times(0.26).clamp(0, 1.8))
                .plus(F.body("height").minus(1.4).times(0.25).clamp(-0.15, 0.5))
                .times(F.when(F.pref("spend", text("worldcombat.skill.storedpower.preference.spend")), F.const(1.2), F.const(1)))
                .clamp(2.8, 7.2).round(2),
            "释放半径", {
                unit: "格",
                description: "这一爆从施法者身体向外覆盖多大一圈，也是本招的实际射程来源；蓄得越多圈开得越大，倾囊再 ×1.2。圈画多大，判定就是多大。"
            }),
        /** 灵能推力：0.35 格 + 蓄积等级 ×0.07（封顶 +0.6）+ 特攻偏移[−0.05,0.2]；夹 0.25..1.4。 */
        surge: formula(
            F.base(0.35)
                .plus(F.var("storedpower.boost", text("worldcombat.skill.storedpower.value.boost")).times(0.07).clamp(0, 0.6))
                .plus(F.stat("specialAttack").minus(60).times(0.002).clamp(-0.05, 0.2))
                .clamp(0.25, 1.4).round(2),
            "灵能推力", {
                unit: "格",
                description: "命中后把圈里的人向外推开多远；蓄积越深、特攻越高，冲得越远。"
            }),
        /** 灵光数：12 + 提升项数 ×7 + 蓄积等级 ×3；夹 8..48。 */
        motes: formula(
            F.base(12).plus(F.var("storedpower.raised", text("worldcombat.skill.storedpower.value.raised")).times(7))
                .plus(F.var("storedpower.boost", text("worldcombat.skill.storedpower.value.boost")).times(3))
                .clamp(8, 48).round(0),
            "灵光数", {
                unit: "点",
                description: "起手时绕身收拢、新星里向外飞散的灵光点数；提升项数给出几圈、蓄积等级给出密度，画面里的光和这里的数一致。"
            }),
        /** 起手：8 刻 − 速度偏移[−1,2] − 蓄积等级 ×0.25（封顶 1.5）；夹 4..12。 */
        charge: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2))
                .minus(F.var("storedpower.boost", text("worldcombat.skill.storedpower.value.boost")).times(0.25).clamp(0, 1.5))
                .clamp(4, 12).round(0),
            "起手", "从聚拢灵光到释放之间的时间；蓄得越多越容易一口气放出去，速度也缩短它。"),
        /** 收招：9 刻 − 速度偏移[−1,2] + 倾囊 2；夹 5..15。 */
        settle: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("spend", text("worldcombat.skill.storedpower.preference.spend")), F.const(2), F.const(0)))
                .clamp(5, 15).round(0),
            "收招", "释放后重新站稳的时间；倾囊把等级一次清空，多一拍才缓过神来。"),
        /** 冷却：30 − 蓄积等级 ×0.8（封顶 4）− 速度偏移[−3,5] + 倾囊 6；夹 16..48。 */
        recharge: seconds(
            F.base(30).minus(F.var("storedpower.boost", text("worldcombat.skill.storedpower.value.boost")).times(0.8).clamp(0, 4))
                .minus(F.stat("speed").minus(55).times(0.1).clamp(-3, 5))
                .plus(F.when(F.pref("spend", text("worldcombat.skill.storedpower.preference.spend")), F.const(6), F.const(0)))
                .clamp(16, 48).round(0),
            "冷却", "这一次释放之后多久能再放；攒得越多、出手越快，回得越快；倾囊更费。")
    });

    defineDamage(storedpowerId, "reservoir", { defenceCoefficient: 0.0046,
        rationale: "灵能绕过正面护甲直接冲击身体，对防御的穿透略强于默认，让蓄积等级的差别更可见。" }, {});

    stages(storedpowerId, [
        { level: 28, values: { reservoir: 30, radius: 3.5 } },
        { level: 44, values: { reservoir: 40, radius: 3.9, motes: 18 } }
    ]);

    describe(storedpowerId, [
        { key: "description.0", values: ["reservoir", "boost"] },
        { key: "description.1", values: ["radius", "surge", "motes"] },
        { key: "spend.on", values: [], when: function (context) { return read(context.detail.values, ["spend"]) === true; } },
        { key: "spend.off", values: [], when: function (context) { return read(context.detail.values, ["spend"]) !== true; } },
        { key: "timing", values: ["range", "charge", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reservoir", "tier.0.radius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reservoir", "tier.1.radius", "tier.1.motes"] }
    ]);
}
