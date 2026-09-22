/**
 * 双翼 / dualwingbeat —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带双翼的伙伴把它当**近身的两拍连击**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 12）以内就出手；更远交给共享接近逻辑。它靠 `reach` 判断要不要先贴近，所以
 *   悬停式会在更远处先手，俯冲式会先走到贴身再冲。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。`ai.finishLow`（默认关）打开时残血目标
 *   排得更前，用这两拍收尾。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：两拍各自结算，第一拍命中会让第二拍更重，伙伴交回共享顺序。
 * 优先级：基础 22（在射程内）／6（还要先走近）；`ai.finishLow` 开启且目标生命低于四成时 +12。
 */
namespace CompanionBehavior {
    function dualwingbeatWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 12);
    }

    registerUse("dualwingbeat", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return dualwingbeatWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !dualwingbeatWants(context, item, target)) return 0;
            const distance = CompanionBehavior.distance(source(context).point, target.point);
            if (distance > item.data.range) return 6;
            if (ai<boolean>(item, "finishLow", false) && ratio(target) < 0.4) return 34;
            return 22;
        }
    });

    PokemonSkills.addPreferences("dualwingbeat", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("dive"), "俯冲形态", "boolean", {
            help: "开启（俯冲）：先冲进贴身、两只翅膀各拍一下都是接触，每拍威力 ×1.15、间隔更短；代价是射程降到约 3.2 格、把身位交出去，起手多一次下潜。关闭（悬停）：隔空拍出风压，射程约 5.6 格、更安全，但每拍 ×0.9、间隔更长。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动扑翼，先走近；越大越愿意先手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这两拍稳定收尾；关闭则所有目标同等对待。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为扑翼离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
