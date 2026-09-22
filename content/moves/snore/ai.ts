/**
 * 打鼾 / snore 的伙伴 AI 用途。
 *
 * 什么局面下出手：**只在施法者自己带着共享睡眠身份时**才有意义——睡着的人别的什么都做不了，
 * 这一声鼾就是它的全部还手。目标可见、敌对、存活且在 `ai.maxChase`（默认 12）格内时列入候选。
 * 对谁出手：范围内的敌人按普通攻击排序；目标越脆（生命比例越低）越优先补上这一下。
 * 够不到怎么办：射程交给 `span`，共享任务把身位收进射程后再出手；睡着了走不动，够不到就等。
 * 放完接什么：交回共享交战计划；它是一记睡眠中的点射，不负责收尾。
 */
namespace PokemonSkills {
    function snoreAwakeGuard(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity | null): boolean {
        if (context.facts.mounted) return false;
        if (!CompanionBehavior.status(context, CompanionBehavior.source(context), "sleep")) return false;
        if (!target) return true;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    CompanionBehavior.registerUse("snore", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context) { return CompanionBehavior.status(context, CompanionBehavior.source(context), "sleep"); },
        available: function (context, capability, purpose, target) { return snoreAwakeGuard(context, capability, target); },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !snoreAwakeGuard(context, capability, target)) return 0;
            // 睡眠中能做的事只有这一件，所以它比普通攻击更急；越脆的目标越值得先震。
            return CompanionBehavior.ratio(target) <= 0.5 ? 135 : 125;
        }
    });

    addPreferences("snore", {}, [
        field(pathOf("echo"), "回响", "boolean", {
            help: "开启：一次喷出两段鼾，每段威力约少 22%%、畏缩各掷一次，但起手与冷却更长。关闭：一记更响更重、更便宜。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 20, step: 1,
            help: "睡着时只在威胁离自己这么远以内才喷鼾；调小睡得更沉、更少主动，调大够得着就打。"
        })
    ]);
}
