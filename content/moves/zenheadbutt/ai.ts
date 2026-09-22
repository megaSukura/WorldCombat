/**
 * 意念头锤 / zenheadbutt 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 12）格内。它是会追人的中距离招，
 * 所以距离越远越先被考虑（冲刺能咬住跑动的目标），贴身后反而让位给更便宜的近身招。
 * `ai.opening`（默认「只对未畏缩目标」）跳过已经被别的招顶懵的人——它这一记的畏缩几率不高，砸在懵住的人身上浪费。
 */
namespace PokemonSkills {
    function zenheadbuttWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        var opening = CompanionBehavior.ai<string>(item, "opening", "fresh");
        return opening !== "fresh" || !CompanionBehavior.status(context, target, "flinch");
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
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            return distance > 5 ? 32 : 22;
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
                { value: "fresh", label: "只对未畏缩目标" },
                { value: "always", label: "随时" }
            ],
            help: "只对未畏缩目标：跳过已经被别的招顶懵的人，把这一记留给还能被打懵的目标。随时：把它当普通攻击，不挑目标状态。"
        })
    ]);
}
