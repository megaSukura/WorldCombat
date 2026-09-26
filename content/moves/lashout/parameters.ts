/**
 * 泄愤 / lashout —— 参数与伤害段。
 *
 * 原生事实：Dark／物理／威力 75／命中 100／PP 5／接触；「如果自身能力被降低，威力翻倍」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗里把「自身被削弱」翻成可观察的事实——自身五项能力等级存在负值时威力翻倍，
 * 命中后先消掉一部分负等级、并（开启宣泄时）把怒气转成一段物攻提升。出手本身是**近身的一声闷砸**：
 * 原地短前踏一步，随即朝正前方砸下，只结算前方第一个近敌；砸空不解削弱，避免一次净化多倍。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   lashout     发泄威力 75 + 物攻偏移 + 受挫等级；有负等级 ×2。
 *   down        受挫：五项能力负等级之和 + 有害药水层数（自定义事实）。
 *   dash        前踏距离 0.9 格 + 速度偏移 + 受挫偏移；夹 0.6..1.6。
 *   slamReach   下砸距离 1.3 格 + 体型高度偏移 + 受挫偏移；夹 1.0..2.2。
 *   collisionRadius 判定半径 0.45 格 + 体型高度偏移。
 *   push        击退 0.4 格 + 物攻偏移。
 *   ventLevels  宣泄级数：宣泄开启 9（清空），关闭 1（只消一级）。
 *   rageStages  怒攻级数 1 + 受挫等级/4。
 *   rageTicks   怒攻持续 6 秒 + 等级偏移。
 *   tempo       起手 5 刻 − 速度偏移 + 宣泄 3 刻。
 *   settle      收招 8 刻。
 *   recharge    冷却 28 刻 − 速度偏移 + 宣泄 8 刻。
 *
 * 配置 `vent`（宣泄）：开启＝命中后一次清空全部负等级并把怒气转成 1~3 级物攻提升，但起手与冷却更长；
 *   关闭＝只消掉一级负等级且无提升，更快更省。
 *
 * 伤害段 `lashout` 与参数同名，走共享换算（原生类别 Physical，Dark 属性）。
 */
namespace PokemonSkills {
    export const lashoutId = "lashout";
    export const lashoutScene = "world_combat:move_lashout";
    const lashoutStats = ["atk", "def", "spa", "spd", "spe"];

    /** 宝可梦读原生能力等级，其他生物读共享能力等级；同一副 -6..+6 阶梯。 */
    export function lashoutStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        if (!world.valid(actor)) return {};
        return NativeEffects.effectiveStages(world, actor);
    }

    /** 自身五项能力里负等级的总和；0 表示没有被削弱。 */
    export function lashoutDown(world: CombatWorld, actor: CombatActor): number {
        const stages = lashoutStages(world, actor);
        let total = 0;
        lashoutStats.forEach(function (stat) {
            const value = stages[stat] || 0;
            if (value < 0) total += -value;
        });
        return total + MobEffects.levels(world, actor, "harmful");
    }

    /** 从最负的一项开始，最多消掉 budget 级负等级；返回实际消掉的级数。 */
    export function lashoutVent(world: CombatWorld, actor: CombatActor, budget: number): number {
        const stages = lashoutStages(world, actor);
        let removed = 0;
        while (removed < budget) {
            let worst = "", value = 0;
            lashoutStats.forEach(function (stat) {
                const current = stages[stat] || 0;
                if (current < value) { worst = stat; value = current; }
            });
            if (!worst) break;
            NativeEffects.boost(world, actor, worst, 1);
            stages[worst] = value + 1;
            removed++;
        }
        return removed + MobEffects.reduce(world, actor, "harmful", budget - removed);
    }

    defineFacts(lashoutId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string) {
            if (id !== "lashout.down") return undefined;
            if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
            return lashoutDown(context.world, context.actor);
        } };
    });

    actionParameters.define(lashoutId, {
        /** 发泄威力：75 + 物攻偏移[−18,36] + 受挫等级 ×2.5；有负等级时 ×2；夹 45..175。 */
        lashout: formula(
            F.base(75)
                .plus(F.stat("attack").minus(60).times(0.28).clamp(-18, 36))
                .plus(F.var("lashout.down", text("worldcombat.skill.lashout.value.down")).times(2.5).clamp(0, 22))
                .times(F.when(F.var("lashout.down", text("worldcombat.skill.lashout.value.weakened")).gt(0), F.const(2), F.const(1)))
                .clamp(45, 175).round(1),
            "发泄威力", {
                unit: "威力",
                description: "这一记发泄的基准威力；物攻越高越重，自身积压的负等级越多越猛。自身任一项能力为负时翻倍。对手防御、相性与暴击在命中时另算。"
            }),
        /** 前踏距离：0.9 格 + 速度偏移[−0.15,0.45] + 受挫等级[0,0.45]；夹 0.6..1.6。 */
        dash: formula(
            F.base(0.9).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.15, 0.45))
                .plus(F.var("lashout.down").times(0.09).clamp(0, 0.45)).clamp(0.6, 1.6).round(2),
            "前踏距离", {
                unit: "格",
                description: "下砸前向前踏出的距离；速度快的个体踏得更远，憋得越久越往前顶。"
            }),
        /** 下砸距离：1.3 格 + 体型高度偏移[−0.15,0.35] + 受挫等级[0,0.4]；夹 1.0..2.2。 */
        slamReach: formula(
            F.base(1.3).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.15, 0.35))
                .plus(F.var("lashout.down").times(0.08).clamp(0, 0.4)).clamp(1.0, 2.2).round(2),
            "下砸距离", {
                unit: "格",
                description: "从踏出处朝正前方砸下的距离，也是本招的实际触达来源；身板大的个体砸得更远。"
            }),
        /** 判定半径：0.45 格 + 体型高度偏移[−0.08,0.3]；夹 0.38..0.8。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.09).clamp(-0.08, 0.3)).clamp(0.38, 0.8).round(2),
            "判定半径", {
                unit: "格",
                description: "下砸能扫到多大一圈；身板大的个体抡得更开。"
            }),
        /** 击退：0.4 格 + 物攻偏移[−0.1,0.45]；夹 0.25..0.9。 */
        push: formula(
            F.base(0.4).plus(F.stat("attack").minus(60).times(0.006).clamp(-0.1, 0.45)).clamp(0.25, 0.9).round(2),
            "击退", {
                unit: "格",
                description: "命中后把目标推开的距离；物攻高的个体把怒气推得更远。"
            }),
        /** 宣泄级数：宣泄开启 9（清空），关闭 1（只消一级）。 */
        ventLevels: formula(
            F.when(F.pref("vent"), F.const(9), F.const(1)).clamp(1, 9).floor(),
            "宣泄级数", { unit: "级", description: "命中后最多消掉几级负等级：开启宣泄时一次清空，关闭时只消掉一级。" }),
        /** 怒攻级数：1 + 受挫等级/4；夹 1..3。 */
        rageStages: formula(
            F.base(1).plus(F.var("lashout.down").div(4).clamp(0, 2)).clamp(1, 3).floor(),
            "怒攻级数", {
                unit: "级",
                description: "宣泄开启时，命中后把憋着的怒气转成多少级物攻提升；受挫越深，转得越多。"
            }),
        /** 怒攻持续：6 秒 + 等级偏移[0,3]；夹 4..12 秒。 */
        rageTicks: seconds(
            F.base(6).plus(F.level().minus(30).times(0.06).clamp(0, 3)).clamp(4, 12).round(1),
            "怒攻持续", "这份怒气化作的物攻提升持续多久；等级高的个体撑得更久。"),
        /** 起手：5 刻 − 速度偏移[−1,2] + 宣泄 3 刻；夹 4..11。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.018).clamp(-1, 2))
                .plus(F.when(F.pref("vent"), F.const(3), F.const(0))).clamp(4, 11).round(0),
            "起手", "从蓄怒到砸下之间的时间；速度快的个体骂得更急，宣泄式先攒足一口气。"),
        /** 收招：8 刻；砸完站定。 */
        settle: seconds(F.base(8).clamp(4, 14).round(0), "收招", "发泄结束后收住的时间。"),
        /** 冷却：28 − 速度偏移[−4,6] + 宣泄 8；夹 18..44。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("vent"), F.const(8), F.const(0))).clamp(18, 44).round(0),
            "冷却", "这一次发泄之后多久能再骂一次；速度快的个体回得更快，宣泄式更费。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(lashoutId, "lashout", {}, { contact: true });

    stages(lashoutId, [
        { level: 35, values: { lashout: 92 } },
        { level: 50, values: { lashout: 108, rageStages: 2 } }
    ]);

    describe(lashoutId, [
        { key: "description.0", values: ["lashout"] },
        { key: "description.1", values: ["dash", "slamReach", "collisionRadius", "push"] },
        { key: "description.2", values: ["ventLevels", "rageStages", "rageTicks"] },
        { key: "vent.on", values: [], when: function (context) { return read(context.detail.values, ["vent"]) === true; } },
        { key: "vent.off", values: [], when: function (context) { return read(context.detail.values, ["vent"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.lashout"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.lashout", "tier.1.rageStages"] }
    ]);
}
