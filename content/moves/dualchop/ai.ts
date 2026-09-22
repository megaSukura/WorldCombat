/**
 * 二连劈 / dualchop —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带二连劈的伙伴把它当**贴身高伤的两劈**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 9）以内就出手；更远交给共享接近逻辑（本招射程短，先贴近是常态）。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。`ai.finishLow`（默认关）打开时残血目标
 *   排得更前；`breach` 开启时它更愿意咬住同一个目标吃第二劈的裂痕加成。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：两劈各自结算，第一劈命中会让第二劈撕得更深，伙伴交回共享顺序。
 * 优先级：基础 26（在射程内）／6（还要先走近）；`ai.finishLow` 开启且目标生命低于四成时 +12。
 */
namespace CompanionBehavior {
    function dualchopWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 9);
    }

    registerUse("dualchop", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return dualchopWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !dualchopWants(context, item, target)) return 0;
            const distance = CompanionBehavior.distance(source(context).point, target.point);
            if (distance > item.data.range) return 6;
            if (ai<boolean>(item, "finishLow", false) && ratio(target) < 0.4) return 38;
            return 26;
        }
    });

    PokemonSkills.addPreferences("dualchop", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("breach"), "裂痕追击", "boolean", {
            help: "开启（裂痕追击）：两劈打在同一块窄面，第二劈在第一劈命中后按裂痕加成撕深；代价是裂面窄（只能打 1 个）、间隔多 1 刻、起手多瞄一点。关闭（分劈式）：两劈沿身前一小片摊开，张角更大、能同时劈到多个、每劈 ×1.05，但没有裂痕加成。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动劈击，先走近；本招射程短，通常要先贴到身前。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这两劈收尾；关闭则所有目标同等对待。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为劈击离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
