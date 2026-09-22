/**
 * 雪崩 / avalanche 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活且在 `ai.maxChase`（默认 9）格内时列入候选；够不到交给共享接近逻辑。
 * 排序：`ai.crumble`（默认开）打开时，自己带着「被打懵」积伤（正是翻倍窗口）→ priority 53；
 *   否则只有目标周围凑着两个以上非友方、这一崩能扫到多人时才抬到 40；空闲时按普通近战 13 排序。
 * 放完接什么：交回共享交战计划；落点的积雪与积伤都是它留下的东西。
 */
namespace PokemonSkills {
    function avalancheCrowded(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        let foes = 0;
        const nearby: any[] = context.facts.nearby || [];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly && other.health > 0 && CompanionBehavior.distance(other.point, target.point) <= 2.4) foes += 1;
        }
        return foes >= 2;
    }

    CompanionBehavior.registerUse(avalancheId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.ai<boolean>(capability, "crumble", true)
                && CompanionBehavior.status(context, self, avalancheStatus)) return 53;
            if (avalancheCrowded(context, target)) return 40;
            return 13;
        }
    });

    addPreferences(avalancheId, {}, [
        field(pathOf("deepdrift"), "厚重", "boolean", {
            help: "开启：震荡半径 ×1.25、击退 ×1.15、滚得更远 ×1.12，铺开压制；但本击 ×0.90、起手多 2 刻、冷却多 8 刻。关闭：本击 ×1.06，滚得干脆。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "目标离自己这么远以内才滚过去；调大愿意主动逼近更远的目标。"
        }),
        field(pathOf("ai.crumble"), "趁积伤崩", "boolean", {
            help: "开启后，自己带着「被打懵」积伤时优先崩出去（正是翻倍窗口）；关闭则只在目标周围人挤人时才优先。"
        })
    ]);
}
