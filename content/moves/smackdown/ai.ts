/**
 * 击落 / smackdown 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase`（默认 14）之内。它是远程防空位，
 * 所以 `ai.flyersOnly` 打开时只有目标确实离地/飞行/浮空（`grounded===false`、飞行属性，或带
 * fly／magnetrise／telekinesis 身份）才出手，把这一记留给真正需要打下来的目标；关闭时也当普通石击用。
 * 对会飞的目标 priority 明显更高（这是它唯一不可替代的用途）；够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    /** 目标是否离地/会飞：贴地观察、飞行属性或共享浮空身份。 */
    function smackdownFlies(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (target.grounded === false) return true;
        const facts = target.facts;
        if (facts && Array.isArray(facts.types) && facts.types.indexOf("flying") >= 0) return true;
        return CompanionBehavior.status(context, target, "fly") || CompanionBehavior.status(context, target, "magnetrise")
            || CompanionBehavior.status(context, target, "telekinesis");
    }

    function smackdownWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 14);
    }

    CompanionBehavior.registerUse("smackdown", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!smackdownWants(context, capability, target)) return false;
            if (CompanionBehavior.ai<boolean>(capability, "flyersOnly", false) && !smackdownFlies(context, target)) return false;
            return true;
        },
        accepts: function (context, capability, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.ai<boolean>(capability, "flyersOnly", false) && !smackdownFlies(context, target)) return false;
            return true;
        },
        priority: function (context, capability, target) {
            if (!target || !smackdownWants(context, capability, target)) return 0;
            // 真正离地的目标最值（岩弹能实际把它拖下来）；只是会飞但站在地上的次之；走地的普通目标再次。
            if (target.grounded === false) return 50;
            return smackdownFlies(context, target) ? 38 : 20;
        }
    });

    addPreferences("smackdown", { ai: { maxChase: 14, flyersOnly: false } }, [
        field(pathOf("ai.flyersOnly"), "只打空中的", "boolean", {
            help: "开启：只对离地、会飞或浮空的敌人才投石（这一记留作防空，不浪费在走地的目标上）。关闭：也当普通远程石击用，什么目标都砸。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 22, step: 1,
            help: "伙伴在威胁离自己这么远以内时才投石；调小只在近处砸，调大愿意从更远处先手。"
        })
    ]);
}
