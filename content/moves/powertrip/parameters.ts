/**
 * 嚣张 / powertrip —— 参数与伤害段。
 *
 * 原生事实：Dark／物理／基础威力 20／命中 100／PP 10／接触，威力 = 20 + 20 × 自身正面能力等级总数
 *   （`positiveBoosts()`），无次要效果（Cobblemon 1.8，21 位学习者）。
 *
 * 翻译：把「耀武扬威」落成一记**带着架势的冲撞**——施法者把攒下的每一层提升都摆成一身气焰，朝选中的
 *   对手直冲过去，一头撞上；气势越盛，冲得越远越快、撞得越重、把人顶得越开。这正是它和辅助力量分开的地方：
 *   辅助力量以自己为圆心把力量放出去、还要倾囊花掉等级；嚣张把等级留在身上，只挑一个人撞。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   boost      架势层数：自身五项能力（攻／防／特攻／特防／速度）正面等级的总和——本招的核心机制值。
 *   raised     气焰道数：有正面等级的能力项数，决定起手时喷出几道气焰。
 *   swagger    冲撞威力：基础 18 + 架势层数 ×20（封顶 +120）+ 物攻偏移 + 等级偏移；收敛 ×1.1 / 猛进 ×0.88；夹 18..190。
 *   dash       冲撞距离：基础 2.6 格 + 速度偏移 + 架势层数偏移；夹 2.4..5.4；也是实际射程来源。
 *   speed      冲撞速度：基础 0.8 格/刻 + 速度偏移 + 架势层数偏移；气势越盛冲得越快。
 *   collisionRadius 判定半径：基础 0.45 格 + 身高偏移；夹 0.38..0.8。
 *   push       顶开距离：基础 0.5 格 + 物攻偏移 + 架势层数偏移；猛进时收窄；夹 0.25..1.3。
 *   targets    穿刺目标数：收敛 1、猛进 2；决定这一冲最多撞到几个人。
 *   plumes     气焰数：起手与冲撞的表现数量，随气焰道数与架势层数走（表现消费者）。
 *   tempo／settle／recharge：速度定节奏，架势层数让起手更急，猛进更费。
 *
 * 配置 `drive`（猛进）双向取舍：开启＝冲势穿堂，最多撞到两个人（每人 ×0.88），但顶开更弱、收招 +3、冷却 +5；
 *   关闭（收敛）＝停在第一个目标上，单发 ×1.1、顶得更开、节奏更快。横扫 vs 单点，各有局面。
 *
 * 伤害段 `swagger` 与参数同名：这一撞随精灵数据变化的那部分；对手防御、相性与暴击在命中时统一结算。
 * 属性与分类沿用原生 Dark／物理，接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    export const powertripId = "powertrip";
    export const powertripScene = "world_combat:move_powertrip";
    export const powertripHitText = "world_combat.move.powertrip.text.hit";
    export const powertripThroughText = "world_combat.move.powertrip.text.through";
    export const powertripMissText = "world_combat.move.powertrip.text.miss";
    export const powertripStats = ["atk", "def", "spa", "spd", "spe"];

    /** 宝可梦读原生能力等级，其他生物读共享能力等级；同一副 -6..+6 阶梯。 */
    export function powertripStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        if (!world.valid(actor)) return {};
        return String(actor.domain()) === "cobblemon" ? NativeEffects.read(world, actor).stages : CombatStages.read(world, actor);
    }

    /** 五项能力里正面等级的总和；0 表示此刻没有架势。 */
    export function powertripBoosts(world: CombatWorld, actor: CombatActor): number {
        const stages = powertripStages(world, actor);
        let total = 0;
        powertripStats.forEach(function (stat) { const value = stages[stat] || 0; if (value > 0) total += value; });
        return total;
    }

    /** 有正面等级的能力项数；决定起手时喷出几道气焰。 */
    export function powertripRaised(world: CombatWorld, actor: CombatActor): number {
        const stages = powertripStages(world, actor);
        let count = 0;
        powertripStats.forEach(function (stat) { if ((stages[stat] || 0) > 0) count++; });
        return count;
    }

    defineFacts(powertripId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string) {
            if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
            if (id === "powertrip.boost") return powertripBoosts(context.world, context.actor);
            if (id === "powertrip.raised") return powertripRaised(context.world, context.actor);
            return undefined;
        } };
    });

    actionParameters.define(powertripId, {
        /** 冲撞威力：18 + 架势层数 ×20（封顶 +120）+ 物攻偏移[−8,26] + 等级偏移[−2,6]；收敛 ×1.1 / 猛进 ×0.88；夹 18..190。 */
        swagger: formula(
            F.base(18)
                .plus(F.var("powertrip.boost", text("worldcombat.skill.powertrip.value.boost")).times(20).clamp(0, 120).as(text("worldcombat.skill.powertrip.value.swaggered")))
                .plus(F.stat("attack").minus(60).times(0.24).clamp(-8, 26))
                .plus(F.level().minus(30).times(0.18).clamp(-2, 6))
                .times(F.when(F.pref("drive", text("worldcombat.skill.powertrip.preference.drive")), F.const(0.88), F.const(1.1)))
                .clamp(18, 190).round(1),
            "冲撞威力", {
                unit: "威力",
                description: "这一撞对每个被撞到的人造成的基准威力；**身上每有 1 级正面能力就加 20**（封顶 +120），物攻给分量、等级给底气。收敛式整体 ×1.1、猛进式每个目标 ×0.88。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲撞距离：2.6 格 + 速度偏移[−0.5,1.3] + 架势层数 ×0.22（封顶 1.6）；夹 2.4..5.4。 */
        dash: formula(
            F.base(2.6).plus(F.stat("speed").minus(55).times(0.014).clamp(-0.5, 1.3))
                .plus(F.var("powertrip.boost", text("worldcombat.skill.powertrip.value.boost")).times(0.22).clamp(0, 1.6))
                .clamp(2.4, 5.4).round(2),
            "冲撞距离", {
                unit: "格",
                description: "从起步到撞停的最大位移，也是本招的实际射程来源；腿越快、架势越盛，冲得越远。"
            }),
        /** 冲撞速度：0.8 格/刻 + 速度偏移[−0.12,0.34] + 架势层数 ×0.012（封顶 0.3）；夹 0.6..1.4。 */
        speed: formula(
            F.base(0.8).plus(F.stat("speed").minus(55).times(0.0035).clamp(-0.12, 0.34))
                .plus(F.var("powertrip.boost", text("worldcombat.skill.powertrip.value.boost")).times(0.012).clamp(0, 0.3))
                .clamp(0.6, 1.4).round(2),
            "冲撞速度", {
                unit: "格/刻",
                description: "冲上去每刻移动的距离；气势越盛，这一口气撞得越快、越难让开。"
            }),
        /** 判定半径：0.45 格 + 身高偏移[−0.08,0.3]；夹 0.38..0.8。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.09).clamp(-0.08, 0.3)).clamp(0.38, 0.8).round(2),
            "判定半径", {
                unit: "格",
                description: "这一撞能刮到多大一圈；身板大的个体撞得更开。"
            }),
        /** 顶开距离：0.5 格 + 物攻偏移[−0.1,0.4] + 架势层数 ×0.06（封顶 0.5）；猛进 ×0.7；夹 0.25..1.3。 */
        push: formula(
            F.base(0.5).plus(F.stat("attack").minus(60).times(0.006).clamp(-0.1, 0.4))
                .plus(F.var("powertrip.boost", text("worldcombat.skill.powertrip.value.boost")).times(0.06).clamp(0, 0.5))
                .times(F.when(F.pref("drive", text("worldcombat.skill.powertrip.preference.drive")), F.const(0.7), F.const(1)))
                .clamp(0.25, 1.3).round(2),
            "顶开距离", {
                unit: "格",
                description: "撞上后把目标推开的距离；架势越盛推得越开，猛进式为了让冲势穿过去会收着推。"
            }),
        /** 穿刺目标数：收敛 1、猛进 2。 */
        targets: formula(
            F.when(F.pref("drive", text("worldcombat.skill.powertrip.preference.drive")), F.const(2), F.const(1)).clamp(1, 2).floor(),
            "穿刺目标数", { unit: "人", description: "这一冲最多撞到几个人：收敛式停在第一个目标上，猛进式可以穿过去再撞一个。" }),
        /** 气焰数：10 + 气焰道数 ×4 + 架势层数 ×2；夹 8..44。 */
        plumes: formula(
            F.base(10).plus(F.var("powertrip.raised", text("worldcombat.skill.powertrip.value.raised")).times(4))
                .plus(F.var("powertrip.boost", text("worldcombat.skill.powertrip.value.boost")).times(2))
                .clamp(8, 44).round(0),
            "气焰数", {
                unit: "道",
                description: "起手时从身上喷起、冲撞时拖在身后的暗色气焰数；提升项数给出几道、架势层数给出浓度，画面里的气焰和这里的数一致。"
            }),
        /** 起手：6 刻 − 速度偏移[−1,2] − 架势层数 ×0.15（封顶 1）；夹 3..9。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .minus(F.var("powertrip.boost", text("worldcombat.skill.powertrip.value.boost")).times(0.15).clamp(0, 1))
                .clamp(3, 9).round(0),
            "起手", "摆开架势到迈出第一步的时间；架势越盛越顺手，速度也缩短它。"),
        /** 收招：8 刻 − 速度偏移[−1,2] + 猛进 3；夹 5..14。 */
        settle: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("drive", text("worldcombat.skill.powertrip.preference.drive")), F.const(3), F.const(0)))
                .clamp(5, 14).round(0),
            "收招", "撞停后收势的时间；猛进式冲得更远，多一拍才收得住。"),
        /** 冷却：24 − 架势层数 ×0.6（封顶 3）− 速度偏移[−3,5] + 猛进 5；夹 14..40。 */
        recharge: seconds(
            F.base(24).minus(F.var("powertrip.boost", text("worldcombat.skill.powertrip.value.boost")).times(0.6).clamp(0, 3))
                .minus(F.stat("speed").minus(55).times(0.1).clamp(-3, 5))
                .plus(F.when(F.pref("drive", text("worldcombat.skill.powertrip.preference.drive")), F.const(5), F.const(0)))
                .clamp(14, 40).round(0),
            "冷却", "这一次冲撞之后多久能再冲；架势盛、出手快，回得更快；猛进更费。")
    });

    defineDamage(powertripId, "swagger", {}, { contact: true });

    stages(powertripId, [
        { level: 28, values: { swagger: 30, dash: 3.0 } },
        { level: 44, values: { swagger: 38, dash: 3.4, plumes: 18 } }
    ]);

    describe(powertripId, [
        { key: "description.0", values: ["swagger", "boost"] },
        { key: "description.1", values: ["dash", "speed", "collisionRadius", "push"] },
        { key: "description.2", values: ["targets", "plumes"] },
        { key: "drive.on", values: [], when: function (context) { return read(context.detail.values, ["drive"]) === true; } },
        { key: "drive.off", values: [], when: function (context) { return read(context.detail.values, ["drive"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.swagger", "tier.0.dash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.swagger", "tier.1.dash", "tier.1.plumes"] }
    ]);
}
