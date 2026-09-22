/**
 * 踩踏 / stomp 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着、**站在地上**，且在 `ai.maxChase`（默认 7）格内。空中目标直接不接受
 * （本招只砸得到站地的对手），所以伙伴不会对着跳起来的敌人白抬脚。它起手慢、冷却长，所以只在真正够得着时出手；
 * `ai.finish`（默认开）把「目标生命低于三成时的一脚」排在前面收残。
 */
namespace PokemonSkills {
    function stompWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible || target.grounded !== true) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse("stomp", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return stompWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && target.grounded === true;
        },
        priority: function (context, capability, target) {
            if (!target || !stompWants(context, capability, target)) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.35) return 55;
            return CompanionBehavior.status(context, target, "flinch") ? 30 : 26;
        }
    });

    addPreferences("stomp", {}, [
        field(pathOf("heavy"), "重踏式", "boolean", {
            help: "开启：抬得更高、砸得更重、塌陷与震波更广、更容易震懵，但起手更慢、冷却更久。关闭：快压，出手快、范围小、单发略轻。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动踩踏，先走近。变大了伙伴会为一记慢招走很远，容易在起手时被拉开。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时优先踩这一脚收掉；关闭：只按普通近身候选排序。"
        })
    ]);
}
