/**
 * 齿轮飞盘 / geargrind —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在 attack 与 ranged 位上。带齿轮飞盘的伙伴把它当**远程两连**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 14）以内出手；更远先走近。
 * 对谁出手：`accepts` 只筛阵营、存活与可见。
 * 放完之后：两枚齿轮各自飞、各自结算，伙伴交回共享顺序；交错式下侧向走位的目标更难躲。
 * 可达射线：出手前用只读世界入口 `CompanionBehavior.world(context).clear` 探自身到目标这条线；被地形挡住时两枚
 *   齿轮都会先撞上掩体，优先级随之压低。交错式靠两侧兜住宽身架的目标（`target.width`），直射式更适合窄目标。
 * 优先级：基础 32（在射程内且保持 3 格以上）／20（贴脸时）／8（还要先走近）。
 */
namespace PokemonSkills {
    function geargrindWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 14);
    }

    /** 自身到目标是否有一条通视射线；齿轮撞墙会先弹开，够不到目标。 */
    function geargrindReachable(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse("geargrind", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return geargrindWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !geargrindWants(context, item, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > item.data.range) return 8;
            let score = distance >= 3 ? 32 : 20;
            const width = typeof target.width === "number" ? target.width : 0.9;
            const cross = item.data.config.cross === true;
            // 两侧夹线兜宽身架，直射更适合窄目标；这是两种配置各自的可观察差异。
            if (cross && width >= 1.2) score += 6;
            else if (!cross && width < 1.0) score += 4;
            // 可命中射线：被掩体挡住时两枚都会先撞墙，压低但不归零（可借反弹绕角）。
            if (!geargrindReachable(context, item, target)) score = cross ? Math.max(4, score - 10) : Math.max(2, score - 16);
            return score;
        }
    });

    addPreferences("geargrind", {}, [
        field(pathOf("cross"), "交错式", "boolean", {
            help: "开启：两枚齿轮从身体两侧甩出、错开后追踪合拢，侧向躲闪会被另一枚兜住；代价是每枚 ×0.95、飞得略慢、间隔 +2 刻。关闭（直射式）：两枚沿同一条线笔直快飞、不追踪，每枚 ×1.1、更准更快，但整体向一侧走位就能一起躲开。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不主动甩齿轮，先走近。"
        })
    ]);
}
