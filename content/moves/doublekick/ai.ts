/**
 * 二连踢 / doublekick —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带二连踢的伙伴把它当**近身两拍**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 6）以内就出手；更远交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：两脚各自结算，第一脚挑起、第二脚踹飞；伙伴交回共享顺序。
 * 优先级：基础 26（在射程内）／5（还要先走近）；对手生命 ≤ 35% 时 +8，把这套连踢留给收尾。
 */
namespace PokemonSkills {
    function doublekickWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 6);
    }

    CompanionBehavior.registerUse("doublekick", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return doublekickWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !doublekickWants(context, item, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > item.data.range) return 5;
            let score = 26;
            if (CompanionBehavior.ratio(target) <= 0.35) score += 8;
            return score;
        }
    });

    addPreferences("doublekick", {}, [
        field(pathOf("alternate"), "交替式", "boolean", {
            help: "开启：第一脚把对手挑离地面、第二脚顺势踹飞，把人拨出站位；代价是每脚 ×0.92、间隔与收招各 +1 刻。关闭（连踢式）：两脚都走低平不挑人，每脚 ×1.08、间隔 −1 刻，出手更快更重。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动二连踢，先走近。"
        })
    ]);
}
