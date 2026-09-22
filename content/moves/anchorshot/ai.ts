/**
 * 掷锚 / anchorshot 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 8）格之内；更远交给共享接近逻辑。
 *   这是一记昂贵的重招，偏好中距离一对一。
 * 对谁出手：已经带着 `trapped` 身份的目标会被跳过（链已经拴住了，再甩一次是浪费）；`ai.escapers`（默认开）
 *   打开时，正在远离自己的目标多一档分——掷锚是用来抓住想跑的人；关闭则只按普通近战排序。
 * 够不到怎么办：reach 就是本招射程，不够先走近；锚走小弧，足够近时很少落空。
 * 放完之后：目标被钉在锚点上，交回共享交战计划；对方挣脱前不必重复。
 */
namespace PokemonSkills {
    /** 目标是否正在沿「远离施法者」的方向移动（世界轴速度）。 */
    function anchorshotEscaping(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        const velocity = target.velocity;
        if (!velocity) return false;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.5) return false;
        return (velocity[0] * dx + velocity[2] * dz) / length > 0.02;
    }

    CompanionBehavior.registerUse(anchorshotId, {
        protocols: ["world_combat:attack", "world_combat:melee"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.status(context, target, "trapped")) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "trapped");
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (target.friendly || target.health <= 0 || !target.visible) return 0;
            if (CompanionBehavior.status(context, target, "trapped")) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return 0;
            let score = 18;
            if (distance <= Number(capability.data.range)) score += 5;
            if (CompanionBehavior.ai<boolean>(capability, "escapers", true) && anchorshotEscaping(context, target)) score += 10;
            return score;
        }
    });

    addPreferences(anchorshotId, {}, [
        field(pathOf("heavy"), "重锚式", "boolean", {
            help: "开启：威力 ×1.25、链维持时长 ×1.25、链长 ×0.85、绷断距离 ×1.15，但起手 +3 刻、射程 ×0.9、冷却 +12 刻——钉得更死更久。关闭（快掷式，默认）：出手快、射程远、冷却短，但威力轻、链短、更容易被拽脱。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 12, step: 1,
            help: "超过这个距离就不主动甩锚，先走近；越大越愿意从更远处起手，但重锚飞行更慢、更容易落空。"
        }),
        field(pathOf("ai.escapers"), "先抓逃的", "boolean", {
            help: "开启：正在远离自己的目标排得更前（掷锚就是用来抓住想跑的人）；关闭则只按普通近战排序。"
        })
    ]);
}
