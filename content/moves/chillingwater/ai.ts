/**
 * 泼冷水 / chillingwater 的伙伴 AI 用途。
 *
 * 什么局面有意义：一记单体的远程削弱点射。目标可见、敌对、存活，且在 `ai.maxChase`（默认 14）格内。
 * 对谁出手：`accepts` 只筛阵营、存活与可见，不筛距离（距离归 `approach`）。
 * 什么时候最想出手：已经湿透的目标优先——这一泼对湿透的对手伤害更高、掉攻更多（共享身份回流）；
 *   否则按普通的廉价远程攻击排序。
 * 够不到怎么办：`reach` 是投掷射程，共享任务先收身位再泼。
 * 放完之后：目标带着掉攻与湿身身份；交回共享交战计划。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("chillingwater", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 14);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > item.data.range) return 0;
            const base = 18;
            return CompanionBehavior.status(context, target, "soaked") ? base + 10 : base;
        }
    });

    addPreferences("chillingwater", {}, [
        field(pathOf("glaze"), "泼水成冰", "boolean", {
            help: "开启：落点结起一圈会打滑的冰、湿身更久，但单发 ×0.9、射程 −2、起手 +2 刻、冷却 +4 刻；关闭：不留冰，一发更痛、泼得更远、出手更快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不主动泼水，先走近；越大越愿意从远处先手削弱。"
        })
    ]);
}
