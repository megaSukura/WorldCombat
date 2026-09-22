/**
 * 吹捧 的伙伴 AI 用途：这是这招自己的一套出手计划，不是共享控制位的随手一放。
 *
 * 什么局面有意义：有可见威胁、目标还没被陶醉缠上、它在 ai.maxChase 以内。
 * 对谁出手：当前威胁；已经带着共享身份 confusion 的目标会被跳过。
 * 什么时候最想出手：目标离自己还有一段距离（ai.keepAway 以上）时，趁它走神把它钉住、拉开身位。
 * 放完之后：目标特攻更高、可能走神、被短暂钉住，伙伴会顺势重新调整站位。
 */
namespace PokemonSkills {
    function flatterWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "confusion")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 14);
    }

    CompanionBehavior.registerUse("flatter", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (!target) return true;
            return flatterWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !flatterWants(context, capability, target)) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            return gap >= CompanionBehavior.ai<number>(capability, "keepAway", 6) ? 70 : 40;
        }
    });

    addPreferences("flatter", {}, [
        field(pathOf("tone"), "吹捧语气", "boolean", {
            help: "连珠吹捧：礼物 +1 级、失手几率 +12%%、定身更久，但陶醉时长 ×0.7、反噬 ×1.3。缓缓称颂：陶醉 ×1.35、反噬 ×0.7，适合长时间消耗。"
        }),
        field(pathOf("ai.maxChase"), "吹捧距离", "number", {
            min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑吹捧；越大越早开口。"
        }),
        field(pathOf("ai.keepAway"), "保持距离", "number", {
            min: 2, max: 16, step: 1,
            help: "目标离自己还有这么远时优先吹捧，趁它走神拉开身位；更近时只按普通次序考虑。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去吹捧。"
        })
    ]);
}
