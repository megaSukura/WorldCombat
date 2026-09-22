/**
 * 冰柱坠击 / iciclecrash 的伙伴 AI 用途。
 *
 * 什么局面下出手：中距离的单点重击，目标可见、敌对、还活着且在 `ai.maxChase`（默认 13）格内。
 * `ai.opening`（默认「只对未畏缩目标」）让伙伴别把这一记砸在已经被别的招顶懵的人身上——畏缩会浪费；
 * 选「随时」就当普通攻击。够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function icicleCrashWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 13)) return false;
        var opening = CompanionBehavior.ai<string>(item, "opening", "fresh");
        return opening !== "fresh" || !CompanionBehavior.status(context, target, "flinch");
    }

    CompanionBehavior.registerUse("iciclecrash", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return icicleCrashWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !icicleCrashWants(context, capability, target)) return 0;
            return 22;
        }
    });

    addPreferences("iciclecrash", {}, [
        field(pathOf("tall"), "高空坠柱", "boolean", {
            help: "开启：冰柱从更高处落下，更重、波及更广，但准备更久、下落更慢，目标更容易走开。关闭：近距快落，更轻更窄，几乎躲不掉。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不主动落冰柱，先走近。越大越会在远处先手，但飞行时间也让目标更容易让开落点。"
        }),
        field(pathOf("ai.opening"), "起手目标", "choice", {
            options: [
                { value: "fresh", label: "只对未畏缩目标" },
                { value: "always", label: "随时" }
            ],
            help: "只对未畏缩目标：跳过已经被别的招顶懵的人，把这一记留给还能被砸懵的目标。随时：把它当普通攻击，不挑目标状态。"
        })
    ]);
}
