/**
 * 空气利刃 / aircutter 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 10）格内。它是本族起手最快、最便宜的
 *   范围切割，所以越挤越先被考虑：`ai.crowd`（默认开）在扇面方向同时罩着两个以上敌人时抬优先级——
 *   一次张开扫一片才是它的价值；只有单个目标时按普通近程切割排序。
 * 放完之后：交回共享交战计划；它是瞬发招，掷完不改变站位。
 */
namespace PokemonSkills {
    /** 身前扇面方向（以选定目标为轴）同时罩着几个敌人；供范围加分。 */
    function aircutterCone(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const reach = Number(capability.data.range) || 0;
        const ax = target.point[0] - self.point[0], az = target.point[2] - self.point[2];
        const length = Math.sqrt(ax * ax + az * az);
        if (length < 0.5) return 1;
        const ux = ax / length, uz = az / length;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible || other.ref === self.ref) continue;
            const dx = other.point[0] - self.point[0], dz = other.point[2] - self.point[2];
            const along = dx * ux + dz * uz;
            if (along < 0 || along > reach + 1) continue;
            const across = Math.abs(dx * uz - dz * ux);
            if (across <= Math.max(1.2, along * 0.75)) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(aircutterId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return !target.friendly && target.health > 0 && target.visible
                && CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                    <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > Number(capability.data.range)) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "crowd", true)) return 24;
            const cone = aircutterCone(context, capability, target);
            return cone >= 2 ? 24 + Math.min(20, (cone - 1) * 8) : 20;
        }
    });

    addPreferences(aircutterId, {}, [
        field(pathOf("focus"), "聚刃式", "boolean", {
            help: "开启：每道风刃更重（威力 ×1.22）、扇面半径 +1 格，但扇面张角收窄到 62%、刃数少 3、冷却多 5 刻，适合对单点砍准。关闭（广扇式，默认）：扇面张到全宽、刃数多 3，但每刀更轻（×0.94），适合一次扫过挤在一起的对手。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动出手，先走近。越大越愿意从远处先手张扇，也越容易在起手窗口被对手走位躲开。"
        }),
        field(pathOf("ai.crowd"), "扫一片", "boolean", {
            help: "开启：扇面方向同时罩着两个以上敌人时优先张扇，一次切一片；关闭：不数扇里的人数，当普通近程切割排序。"
        })
    ]);
}
