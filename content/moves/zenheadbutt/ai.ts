/**
 * 意念头锤 / zenheadbutt 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 12）格内。它是会追人的中距离招，
 *   所以距离越远越先被考虑（冲刺能咬住跑动的目标），贴身后反而让位给更便宜的近身招。
 * 对谁出手：冲刺是水平直线，先看高度差——目标高太多或低太多时撞不上，降权；再看本体到目标的真实通视，
 *   被墙挡住时降权；然后看目标速度，走得快的更需要制导、略微加分，基本不动的目标降权。
 *   `ai.opening`（默认「优先未畏缩」）只影响排序：已经畏缩的目标仍可作追击用，只是排得更后，不再被直接跳过。
 * 不够接近：射程交给 `reach`，共享任务把身位送进出手距离。
 */
namespace PokemonSkills {
    function zenheadbuttWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    /** 目标当刻水平速度；决策帧没有速度事实时按静止处理。 */
    function zenheadbuttSpeed(target: CompanionBehavior.Entity): number {
        const velocity = target.velocity;
        if (!Array.isArray(velocity) || velocity.length !== 3) return 0;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
    }

    CompanionBehavior.registerUse("zenheadbutt", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return zenheadbuttWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !zenheadbuttWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context).point;
            const distance = CompanionBehavior.distance(self, target.point);
            let score = distance > 5 ? 30 : 20;
            // 冲刺是水平直线：高度差太大撞不上。
            const height = Math.abs(target.point[1] - self[1]);
            if (height > 2.5) score -= 12;
            else if (height > 1.2) score -= 5;
            // 真实通视：被墙挡住的路线别当成能追。
            const world = CompanionBehavior.world(context);
            if (!world.clear(CompanionBehavior.point(self), CompanionBehavior.point(target.point))) score -= 10;
            // 会动的目标更值得用制导咬；几乎不动的目标降权。
            const speed = zenheadbuttSpeed(target);
            if (speed > 0.08) score += 4;
            else if (speed < 0.02) score -= 2;
            // flinch 已存在仍可追击：只降权，不排除。
            if (CompanionBehavior.ai<string>(capability, "opening", "fresh") === "fresh"
                && CompanionBehavior.status(context, target, "flinch")) score -= 6;
            return Math.max(1, score);
        }
    });

    addPreferences("zenheadbutt", {}, [
        field(pathOf("guided"), "制导式", "boolean", {
            help: "开启：念力咬得更紧、冲得更远，但起步更慢、起手与冷却更久。关闭：贴身直撞，出手快、冷却短，但拐不过弯，直线逃跑也追不上。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动锁定，先走近。越大越会在远处先手，也越容易锁定后追不上。"
        }),
        field(pathOf("ai.opening"), "起手目标", "choice", {
            options: [
                { value: "fresh", label: "优先未畏缩目标" },
                { value: "always", label: "随时" }
            ],
            help: "优先未畏缩目标：已经把对手撞懵时这一记排在更后，但需要追击时仍会使用。随时：把它当普通攻击，不因目标已畏缩而降权。"
        })
    ]);
}
