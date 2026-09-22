/**
 * 飞叶风暴 / leafstorm 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 15）格之内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.group`（默认开）打开时，身边挤着更多敌人的目标排前——卷叶式的叶场能一次割到一片；
 *   特攻高于物攻的个体更愿意用它（这是它的本行）。用完自身特攻会掉 2 级，所以它更倾向在对手还硬的时候先砸出去。
 * 够不到怎么办：reach 就是本招射程，不够就靠近。
 * 放完之后：一记高威力单体特殊草，卷叶式还会在落点留下持续复割的叶场；交回共享交战计划。
 */
namespace PokemonSkills {
    function leafstormWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 15);
    }

    /** 目标周围 4 格内的其他敌人数量（不含目标自己）；用来判断卷叶式值不值一记。 */
    function leafstormCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 4) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("leafstorm", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return leafstormWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !leafstormWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 22;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "group", true) && leafstormCluster(context, target) > 0) score += 8;
            if ((context.facts.specialAttack || 0) >= (context.facts.attack || 0)) score += 4;
            if (CompanionBehavior.ratio(target) > 0.6) score += 4;
            return score;
        }
    });

    addPreferences("leafstorm", {}, [
        field(pathOf("maelstrom"), "卷叶式", "boolean", {
            help: "开启：命中后风暴在落点盘桓一阵，按间隔反复割范围内的敌人；代价是单体威力 ×0.85、起手 +3 刻、冷却 +6 刻。关闭（穿叶式）：一股集中的叶刃直穿目标，单体更重、出手更快，但不留场。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 6, max: 20, step: 1,
            help: "超过这个距离就不主动卷风暴，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.group"), "群敌优先", "boolean", {
            help: "开启：身边挤着更多敌人的目标排前，用卷叶式一次割到一片；关闭则只按普通远程攻击排序。"
        })
    ]);
}
