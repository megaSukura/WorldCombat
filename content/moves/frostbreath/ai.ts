/**
 * 冰息 / frostbreath —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 14）格内；够不到交给共享接近逻辑。
 * 对谁出手：`ai.cluster`（默认开）打开时，目标附近还挤着别的敌人就抬高 priority——扇形的价值在「罩一片」；
 *   `ai.finish`（默认开）打开时，残血目标排前；`ai.advantage`（默认开）打开时，慢的或防御厚的目标排前
 *   （必暴冷雾最能啃厚甲，疾走者则容易在雾漫到前走出扇面，横向速度越高越降权）。冷雾慢到、走出扇面就躲开。
 * 够不到怎么办：reach 就是本招实际射程，先走近。
 * 放完之后：冷雾的冻僵与落点霜交回共享交战计划，霜是租借地形会自己到期还原。
 */
namespace PokemonSkills {
    function frostbreathWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
    }

    CompanionBehavior.registerUse(frostbreathId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return frostbreathWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !frostbreathWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const range = capability.data.range;
            let score = CompanionBehavior.distance(self.point, target.point) <= range ? 20 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true)) {
                const nearby = context.facts.nearby as CompanionBehavior.Entity[];
                for (let index = 0; index < nearby.length; index++) {
                    const other = nearby[index];
                    if (other.friendly || other.health <= 0 || other.ref === target.ref) continue;
                    if (CompanionBehavior.distance(other.point, target.point) <= 4
                        && CompanionBehavior.distance(self.point, other.point) <= range) { score += 14; break; }
                }
            }
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 8);
            if (CompanionBehavior.ai<boolean>(capability, "advantage", true)) {
                // 疾走者会在冷雾漫到前走出扇面，横向速度越高越降权。
                const velocity = CompanionBehavior.velocity(context, target);
                const flat = velocity ? Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) : 0;
                score -= Math.min(18, Math.round(flat * 45));
                // 厚甲架势吃必暴冷雾最划算：防御越高排得越前。
                const stats = CompanionBehavior.combatStats(context, target);
                const defence = stats && stats.stats && typeof stats.stats.def === "number" ? stats.stats.def : null;
                if (defence !== null) score += Math.max(0, Math.min(12, (defence - 60) * 0.1));
            }
            return score;
        }
    });

    addPreferences(frostbreathId, {}, [
        field(pathOf("wide"), "广呼", "boolean", {
            help: "开启（广呼）：雾弧 ×1.35、雾团更厚、结霜更多更久、冻僵更久，但呼程 ×0.85、雾速 ×0.8、威力 ×0.92、起手 +2 刻、冷却 +5 刻。关闭（细呼）：窄而远、快而重的一道冷气，代价是覆盖面收窄。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 22, step: 1,
            help: "超过这个距离就不主动呼出冷雾，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.cluster"), "罩人堆", "boolean", {
            help: "开启：目标身边还挤着别的敌人时优先呼出，一团冷雾罩多个；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.advantage"), "择慢打厚", "boolean", {
            help: "开启：优先选移速慢、或防御厚的敌人——厚甲吃必定要害的冷雾最划算，疾走者容易在雾漫到前走出扇面、相应降权。关闭：只按普通远程攻击排序，不区分走位与防御。"
        })
    ]);
}
