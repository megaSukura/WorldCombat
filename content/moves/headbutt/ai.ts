/**
 * 头锤 / headbutt 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 8）格内。它是短冷却的压力招，
 * 所以默认随时会出；但对手正处于畏缩时这一记更重，`priority` 会把它抬到前面——伙伴因此会跟着别的招
 * 一起把一个人压在原地。`ai.opening`（默认「随时」）可收成「只压畏缩目标」：只在对手已经被顶懵时补这一记，
 * 适合配一只有先手控制的伙伴；单独使用时保持「随时」，否则它没机会出手。
 */
namespace PokemonSkills {
    function headbuttWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 8)) return false;
        var opening = CompanionBehavior.ai<string>(item, "opening", "always");
        return opening !== "reeling" || CompanionBehavior.status(context, target, "flinch");
    }

    CompanionBehavior.registerUse("headbutt", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return headbuttWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !headbuttWants(context, capability, target)) return 0;
            return CompanionBehavior.status(context, target, "flinch") ? 34 : 20;
        }
    });

    addPreferences("headbutt", {}, [
        field(pathOf("driving"), "猛冲式", "boolean", {
            help: "开启：扑得更远、更重、更容易顶懵，但起步更慢、起手与冷却更久，也更容易扑过头。关闭：短促快撞，出手快、位置稳，威力略低。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动头锤，先走近。越大追得越执着，也越容易扑空后停在对手身后。"
        }),
        field(pathOf("ai.opening"), "起手目标", "choice", {
            options: [
                { value: "always", label: "随时" },
                { value: "reeling", label: "只压畏缩目标" }
            ],
            help: "随时：把它当普通近身招，随时出手。只压畏缩目标：只在对手已经处于畏缩时补这一记（威力更高），适合和先手控制的伙伴配合；单独使用时它几乎不会出手。"
        })
    ]);
}
