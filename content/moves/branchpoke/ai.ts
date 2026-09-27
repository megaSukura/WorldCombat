/**
 * 木枝突刺 / branchpoke 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 7）格内；枝长，够不到先让共享接近逻辑送进来。
 * 对谁出手：`ai.fullExtension`（默认开）在目标处于枝条中远端（≥ 射程六成）时把这一招排得更前——
 *   末梢弹劲让这一戳越远越疼；目标贴脸（< 射程三成半）时优先级压到最低，先让别的近身招处理，不为了吃满射程而盲拉距离。
 *   `ai.finish` 收残血。判断一律用**身体接触距**（宿主给出目标体表最近点），不是两个中心的距离——
 *   体型大的对手更早进入枝长。出手位置：共享接近会停在射程约八成处，正好吃满弹劲；不需要贴脸。
 * 放完之后：交回共享计划；刺枝式已把目标挂住减速，可趁势补第二戳。
 */
namespace PokemonSkills {
    function branchpokeValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 与目标真实身体箱的接触距离（宿主给出最近体表点）；没有体表点时退回中心距。 */
    function branchpokeGap(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const host = context.services.behavior as WorldMethods.Host | undefined;
        const point = host && host.reachPoint ? host.reachPoint(target, self.point) : target.point;
        return CompanionBehavior.distance(self.point, point);
    }

    CompanionBehavior.registerUse("branchpoke", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!branchpokeValid(target)) return false;
            return branchpokeGap(context, target) <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) { return branchpokeValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const distance = branchpokeGap(context, target);
            const range = capability.data.range;
            if (distance > range) return 0;
            // 敌贴脸时不盲拉距：压到最低，把机会让给别的近身招。
            if (distance < range * 0.35) return 2;
            let score = 15;
            if (CompanionBehavior.ai<boolean>(capability, "fullExtension", true) && distance >= range * 0.6) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 8;
            return score;
        }
    });

    addPreferences("branchpoke", {}, [
        flag("thorn", "刺枝式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.fullExtension", "优先满射程"),
        flag("ai.finish", "优先收残血")
    ]);
}
