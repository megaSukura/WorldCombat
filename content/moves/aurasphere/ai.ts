/**
 * 波导弹 / aurasphere —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 20）格内；够不到交给共享接近逻辑。
 * 它射程最长、必中，是常规远程主力。
 * 对谁出手：`ai.pursue`（默认开）打开时，正在移动（追人或逃跑）的目标排前——球会拐弯，正合它的路；
 *   `ai.finish`（默认开）打开时，残血目标排前。目标在射程远端也略微加权，因为球会一路追过去。
 *   中间隔着实墙（`world.clear` 不通）时降权——球会先撞在墙上断掉，避免反复向实墙投必中球。
 * 够不到怎么办：reach 就是本招实际射程，先走近。
 * 放完之后：伤害交回共享交战计划。
 */
namespace PokemonSkills {
    function aurasphereWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 20);
    }

    CompanionBehavior.registerUse(aurasphereId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return aurasphereWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !aurasphereWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            const range = capability.data.range;
            let score = gap <= range ? 22 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "pursue", true)) {
                const velocity = CompanionBehavior.velocity(context, target);
                if (velocity && (velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.0004) score += 10;
            }
            if (typeof range === "number" && gap > range * 0.7) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 8);
            // 球会先撞墙断掉：通视不通的目标降权，避免反复对着实墙投必中球。
            const world = CompanionBehavior.world(context);
            if (!world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point)))
                score = Math.max(2, score - 16);
            return score;
        }
    });

    addPreferences(aurasphereId, {}, [
        field(pathOf("seek"), "远追", "boolean", {
            help: "开启（远追）：射程 ×1.18、转向 ×1.3，更远也追得更死，但威力 ×0.92、球速 ×0.9、起手 +2 刻、冷却 +5 刻。关闭（撞波）：球更粗更快更重、射程更近。一个换「多远都咬得住」，一个换「贴上来一炮打穿」。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 28, step: 1,
            help: "超过这个距离就不主动发球，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.pursue"), "追动目标", "boolean", {
            help: "开启后，正在移动的敌人优先成为发球目标（球会拐弯拦在前面）；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前；关闭则只按普通远程攻击排序。"
        })
    ]);
}
