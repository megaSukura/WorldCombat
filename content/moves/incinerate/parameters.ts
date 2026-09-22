/**
 * 烧尽 / incinerate —— 第 072 组「以对手的持有物为材料的一击」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：威力 60、火、特殊、命中 100、PP 15、不接触、目标为“相邻的所有敌人”；
 *   命中时若目标携带树果或宝石，道具被烧毁、本场不能再用。
 * - 即时战斗翻译：朝面前扫出一片扇形火焰，扇内的敌人各挨一记火属性特攻。谁手里有怕火的东西（树果或宝石），
 *   就在火里被烧掉、谁也不得到；烧到东西时火顺势窜高，该目标额外吃一小段“爆燃”伤害。
 *   与同为“夺物”的渴望／小偷分开：本招不去拿、也不留，而是当场烧毁、且一次能扫到好几个——是拒止手段。
 * - 参数分散到精灵数据：威力取特攻（火有多热）与等级（控火多熟），扇面长度取特攻与速度，扇面张角取特攻，
 *   爆燃追加取特攻，起手／收招／冷却取速度，火焰粒子数量取特攻。
 * 配置 wide（广域）：扇面张角 ×1.5、射程 ×0.85、本击 ×0.9、冷却 +4；关闭则张角收窄、射程更远、本击更重。
 *
 * 伤害段名 scorch：这一扫随精灵数据变化的那部分。烧到可燃物时的额外威力在命中时判读目标持有物后加上。
 */
namespace PokemonSkills {
    export interface IncinerateItem extends NativeItems.HeldRef { id: string; kind: string; }
    /**
     * 目标手里的东西是否怕火：树果（cobblemon:berries 原生标签）或宝石（`*_gem`）。走统一装备读取，
     * 宝可梦的携带物与原版生物/玩家的手同一路径；返回的 slot/expected 正是烧毁所需的 CAS 快照。
     */
    export function incinerateBurnable(world: CombatWorld, actor: CombatActor): IncinerateItem | null {
        var held = NativeItems.heldOf(world, actor);
        if (held === null) return null;
        if (held.berry) return { id: held.id, slot: held.slot, expected: held.expected, kind: "berry" };
        if (held.path.length >= 4 && held.path.slice(held.path.length - 4) === "_gem")
            return { id: held.id, slot: held.slot, expected: held.expected, kind: "gem" };
        return null;
    }

    actionParameters.define("incinerate", {
        /** 火焰威力：基础 50；特攻每比 60 多 1 加 0.34（夹 -12..+36），等级每比 30 多 1 加 0.5（夹 -8..+14）；
         *  wide 关 ×1.0、开 ×0.9；夹在 34..110。 */
        scorch: formula(
            F.base(50)
                .plus(F.stat("specialAttack").minus(60).times(0.34).clamp(-12, 36))
                .plus(F.level().minus(30).times(0.5).clamp(-8, 14))
                .times(F.when(F.pref("wide"), F.const(0.9), F.const(1.0)))
                .clamp(34, 110).round(1),
            "火焰威力", {
                unit: "威力",
                description: "扫出去的这片火随精灵数据变化的那部分：特攻给出火有多热，等级给出控火多熟。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扇面长度：基础 3.2 格；特攻每比 60 多 1 加 0.02（夹 -0.3..+1.4），速度每比 60 多 1 加 0.01（夹 -0.2..+0.8）；
         *  wide 开 ×0.85；夹在 2.8..6.0 格。 */
        reach: formula(
            F.base(3.2)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.3, 1.4))
                .plus(F.stat("speed").minus(60).times(0.01).clamp(-0.2, 0.8))
                .times(F.when(F.pref("wide"), F.const(0.85), F.const(1.0)))
                .clamp(2.8, 6.0).round(2),
            "扇面长度", {
                unit: "格",
                description: "火焰从施法者身前铺开的距离；火越旺、出手越快，扫得越远。它也是本招的实际射程来源。"
            }),
        /** 扇面张角：基础 32 度；特攻每比 60 多 1 加 0.06（夹 -4..+10）；wide 开 ×1.5；夹在 24..52 度（半角）。 */
        fan: formula(
            F.base(32)
                .plus(F.stat("specialAttack").minus(60).times(0.06).clamp(-4, 10))
                .times(F.when(F.pref("wide"), F.const(1.5), F.const(1.0)))
                .clamp(24, 52).round(0),
            "扇面张角", {
                unit: "度",
                description: "火焰扇面的半张角；火越旺铺得越开，广域式再张开一半。判定与画面用同一组顶点画出这个扇面。"
            }),
        /** 爆燃追加：基础 12；特攻每比 60 多 1 加 0.08（夹 -3..+18）；夹在 8..32。 */
        flare: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.08).clamp(-3, 18)).clamp(8, 32).round(1),
            "爆燃追加", {
                unit: "威力",
                description: "烧到树果或宝石时，火顺着那件东西窜高、该目标额外吃到的威力；特攻越高烧得越猛。"
            }),
        /** 起手：基础 8 刻，速度每比 60 多 1 减 0.03（夹 -2..+4），夹在 5..14 刻。 */
        charge: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 4)).clamp(5, 14).round(0),
            "起手时间", "把火苗拢到口前、烧成扇面要多久；越快起得越急。"),
        /** 收招：基础 8 刻，速度每比 60 多 1 减 0.025（夹 -1..+3），夹在 5..12 刻。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.025).clamp(-1, 3)).clamp(5, 12).round(0),
            "收招", "火收回去、喘一口气的时间；快的个体收得干脆。"),
        /** 冷却：基础 34 刻，速度每比 60 多 1 减 0.08（夹 -3..+6）；wide 开 +4；夹在 24..52 刻。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(60).times(0.08).clamp(-3, 6))
                .plus(F.when(F.pref("wide"), F.const(4), F.const(0)))
                .clamp(24, 52).round(0),
            "冷却", "两次烧尽之间的等待；比单体火招略长，换来一次扫多个目标与烧毁道具。"),
        /** 火焰数量：基础 14，特攻每比 60 多 1 加 0.12（夹 -4..+20），夹在 10..38 个；驱动扇面粒子。 */
        flames: formula(
            F.base(14).plus(F.stat("specialAttack").minus(60).times(0.12).clamp(-4, 20)).clamp(10, 38).round(0),
            "火焰数量", {
                unit: "个",
                description: "扇面与爆燃里翻卷的火焰粒子数量；火越旺越多，粒子按它发射。"
            }),
        /** 扇面采样步数：固定 6 段，决定判定多边形与表现路径的顶点数。 */
        steps: hidden(6),
        traceAhead: hidden(1.0)
    });

    stages("incinerate", [
        { level: 22, values: { scorch: 62 } },
        { level: 40, values: { scorch: 72, flare: 16 } }
    ]);

    defineDamage("incinerate", "scorch", { defenceCoefficient: 0.005, rationale: "横扫的火对防御的穿透接近默认，突出特攻与等级的差别。" }, {});

    describe("incinerate", [
        { key: "description.0", values: ["scorch", "fan"] },
        { key: "description.1", values: ["reach", "flare"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.scorch"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.scorch", "tier.1.flare"] }
    ]);
}
