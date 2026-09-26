/**
 * 灵魂冲击 / spiritbreak 的伙伴 AI 用途。
 *
 * 什么局面有意义：一次贴身、纯气势的冲撞。目标可见、敌对、存活，且在 `ai.maxChase`（默认 10）格内；
 *   更远交给共享接近逻辑——它是接触招，必须先收身位。
 * 对谁出手：`accepts` 只筛阵营、存活与可见，不筛距离（距离归 `approach`）。
 * 什么时候最想出手：在射程内按普通的贴身攻击排序；它不挑对手，是一记稳定的压制与掉特攻。
 * 够不到怎么办：`reach` 是冲锋射程，共享任务先把身位收进范围再撞。
 * 放完之后：目标被撞掉特攻并被推开；交回共享交战计划。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("spiritbreak", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 10);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > item.data.range) return 0;
            const shots:CombatProjectileFacts[]=JSON.parse(CompanionBehavior.world(context).projectiles(CompanionBehavior.point(self.point),Math.min(8,item.data.range+2)));
            const active=shots.some(shot=>shot.hostile&&shot.interceptable&&shot.owner===target.ref);
            return active?44:22;
        }
    });

    addPreferences("spiritbreak", {}, [
        field(pathOf("shatter"), "碎魂式", "boolean", {
            help: "开启：单发 ×1.15、掉特攻 2 级、击退更远，但冲锋距离收短、起手 +2 刻、冷却 +8 刻；关闭：快速突进的贴身压制，掉 1 级、够得更远。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动冲撞，先走近；越大越愿意从更远处起手。"
        })
    ]);
}
