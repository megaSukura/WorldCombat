/**
 * 预知未来 / futuresight 的伙伴 AI 用途。
 *
 * 什么局面下出手：有可见、敌对、存活且尚未被锁定（没有 futuresight 身份）的目标，且在 ai.maxChase
 *   （默认 14）格内。它是一次延迟投资，所以对生命比例还高的目标优先（priority 42），残血目标交给别的招。
 * 对谁出手：当前威胁；已经带着预知印记的目标跳过，不重复悬一团念力。
 * 够不到怎么办：交给共享接近逻辑；reach 就是由特攻与体型决定的锁定距离。
 * 放完之后：念力独立悬在目标头顶、按延迟落下；伙伴按共用计划继续交战。
 * 配置 prolonged（久候／速报）在「更重的延迟重击」与「更快的即时兑现」之间取舍。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(futureSightId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, futureSightStatus);
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var maximum = target.maximum;
            return typeof maximum === "number" && maximum > 0 && target.health / maximum > 0.6 ? 42 : 30;
        }
    });

    addPreferences(futureSightId, { prolonged: false, ai: { maxChase: 14 } }, [
        field(pathOf("prolonged"), "久候", "boolean", {
            help: "开启（久候）：兑现延迟 ×1.4、威力 ×1.2，重击更重但对手有更长时间治疗、加防或拉开。关闭（速报）：延迟 ×0.75、威力 ×0.85，来得更快、更难反应。"
        }),
        field(pathOf("ai.maxChase"), "锁定距离", "number", {
            min: 4, max: 24, step: 1,
            help: "目标在这个距离内才考虑预知未来；调大愿意锁定更远的敌人。"
        })
    ]);
}
