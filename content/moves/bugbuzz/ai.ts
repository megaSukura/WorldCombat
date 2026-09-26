/**
 * 虫鸣 / bugbuzz —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且在 `ai.maxChase`（默认 11）格内；声波是瞬时锥形，交战时先收身位再鸣。
 * 对谁出手：`ai.crowd`（默认开）打开时，数一数目标方向前方的实际锥面里还挤着几个非友方（含目标），
 *   按本个体真实的音波张角判定——一道声波能同时判定多人，那正是它最值的时候；关闭则只按普通远程攻击排序。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进锥长之后再鸣。
 * 放完接什么：交回共享交战计划；它是一次性覆盖，不负责收尾。
 */
namespace PokemonSkills {
    /** 以目标方向为中线，按本个体实际的锥形张角与射程数一数锥内还挤着几个非友方（含目标）。 */
    function bugbuzzCrowdCount(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: WorldMethods.Subject): number {
        const self = CompanionBehavior.source(context).point, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const length = typeof capability.data.range === "number" ? capability.data.range : 9;
        const angle = p("bugbuzz", "coneAngle", CompanionBehavior.world(context));
        const cosHalf = Math.cos(Math.min(180, Math.max(5, angle)) * Math.PI / 360);
        const dx = target.point[0] - self[0], dz = target.point[2] - self[2], length2 = Math.sqrt(dx * dx + dz * dz);
        if (length2 < 1e-6) return 1;
        const ux = dx / length2, uz = dz / length2;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === String(context.actor)) continue;
            const ox = other.point[0] - self[0], oz = other.point[2] - self[2], distance = Math.sqrt(ox * ox + oz * oz);
            if (distance > length) continue;
            if (distance < 1e-6 || (ox / distance) * ux + (oz / distance) * uz >= cosHalf - 1e-12) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("bugbuzz", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const base = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 20 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "crowd", true)) return base;
            return bugbuzzCrowdCount(context, capability, target) >= 2 ? base + 14 : base;
        }
    });

    addPreferences("bugbuzz", {}, [
        field(pathOf("deep"), "沉鸣形态", "boolean", {
            help: "开启：张角缩小到 0.72、射程 +2 格、远端少衰减、冷却 +3 刻、起手 +1 刻，但威力 ×0.94，适合远距穿线。关闭：宽而较散的一嗓子，威力更足，适合近身覆盖。"
        }),
        field(pathOf("ai.maxChase"), "鸣叫距离", "number", {
            min: 4, max: 20, step: 1,
            help: "超过这个距离就不主动鸣叫，先走近；越大越愿意在更远处先手发声。"
        }),
        field(pathOf("ai.crowd"), "瞄准成排", "boolean", {
            help: "开启后，目标方向前方的实际锥面里还挤着别的敌人时优先鸣叫，一道声波能多震一个；关闭则只按普通远程攻击排序。"
        })
    ]);
}
