/**
 * 聚宝功 / payday 的伙伴 AI 用途。
 *
 * 什么局面有意义：一记便宜、出手快的远程单点点射。目标可见、敌对、存活，且在 `ai.maxChase`
 *   （默认 14）格内；更远交给共享接近逻辑。它不挑目标，也不需要成群——落单的对手照样能打，还能留下零钱。
 * 对谁出手：`accepts` 只筛阵营、存活与可见，不筛距离（距离归 `approach`）。
 * 什么时候最想出手：目标在射程内就按普通的廉价远程攻击排序；已经贴脸时略降，让更重的招先上。
 * 够不到怎么办：`reach` 是投掷射程，共享任务先收身位再甩币。
 * 放完之后：交回共享交战计划；落点的真币会自己留在地上。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("payday", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            return distance <= 3 ? 14 : 20;
        }
    });

    addPreferences("payday", {}, [
        field(pathOf("largesse"), "大把撒钱", "boolean", {
            help: "开启：一次撒出的币数 ×1.5、落地真币 ×1.4，场上与画面都更阔，但单发威力 ×0.82、起手 +2 刻、冷却 +6 刻；关闭：一手重币，出手更快、单发更痛、散钱较少。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 22, step: 1,
            help: "超过这个距离就不主动甩币，先走近；越大越愿意从远处先手骚扰。"
        })
    ]);
}
