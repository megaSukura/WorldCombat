/**
 * 爱心印章 / heartstamp 的伙伴 AI 用途。
 *
 * 什么局面下出手：近身的一记骗招，目标可见、敌对、存活且在 `ai.maxChase`（默认 8）格内。
 * 对谁出手：射程内的目标优先，越近越先——补击越可能赶在卖萌窗口结束之前落地；`ai.seizeFirst`（默认开）打开时，
 *   还没被挂上疏忽的目标排前，因为这一记卖萌在干净目标身上才真正制造出窗口。
 * 够不到怎么办：射程交给 `lunge`，共享任务把身位收进射程后再出手；扑击途中目标走远会扑空。
 * 放完接什么：交回共享交战计划；它是一记近身重击，不负责收尾。
 */
namespace PokemonSkills {
    function heartstampWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }

    CompanionBehavior.registerUse("heartstamp", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return heartstampWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !heartstampWants(context, capability, target)) return 0;
            const at = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            const close = at <= capability.data.range;
            let value = close ? 24 : 6;
            if (CompanionBehavior.ai<boolean>(capability, "seizeFirst", true) && !CompanionBehavior.status(context, target, "offguard")) value += 8;
            // 预计抵达时间：越近，补击越赶得上窗口。
            if (close) value += Math.max(0, Math.round((capability.data.range - at) * 2));
            return value;
        }
    });

    addPreferences("heartstamp", {}, [
        field(pathOf("guile"), "心机", "boolean", {
            help: "开启：卖萌更久、疏忽窗口更长、乘机加成更高，但基础一击约少 14%%、起手与冷却更长，适合先骗再打。关闭：直球，基础一击约多 16%%、起手更快，但乘机收益更小。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "只在威胁离自己这么远以内才卖萌起手；调大愿意先追一段，调小只在贴身时补击。"
        }),
        field(pathOf("ai.seizeFirst"), "先骗没疏忽的", "boolean", {
            help: "开启后，还没被挂上疏忽的目标优先（卖萌在干净目标身上才真正制造窗口）；关闭则所有目标同价，只按普通近战排序。"
        })
    ]);
}
