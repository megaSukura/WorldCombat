/**
 * 酸液炸弹 / acidspray —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且落在 `ai.maxChase`（默认 8）格内——射程很短，出手前要先贴近。
 * 对谁出手：`ai.crowd`（默认开）打开时，优先数出射程内**特防还没被削过**的敌人：两个以上就最有价值，
 *   一个也值得先手，替队伍的后续特殊招把防线打开；关闭则只按普通攻击排序。
 * 够不到怎么办：交给共享接近逻辑走近到 `reach` 内再喷；`approachTarget` 让伙伴朝目标靠近。
 * 放完接什么：交回共享交战计划；它是一发即喷即散的贴脸削防，不负责留场。
 */
namespace PokemonSkills {
    function acidsprayUnlowered(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context).point, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const radius = typeof capability.data.range === "number" ? capability.data.range : 5;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === String(context.actor)) continue;
            if (CompanionBehavior.distance(other.point, self) > radius) continue;
            // 只数还没被削掉特防的：等级 0 或更高都算没削过，已经是负数的目标收益低。
            if (CompanionBehavior.stage(context, other, "spd") >= 0) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("acidspray", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const base = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 20 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "crowd", true)) return base;
            const unlowered = acidsprayUnlowered(context, capability);
            return unlowered >= 2 ? base + 14 : unlowered === 1 ? base + 6 : base;
        }
    });

    addPreferences("acidspray", {}, [
        field(pathOf("focus"), "聚焦喷口", "boolean", {
            help: "开启：张角收到 55%、射程拉到 1.3 倍，但没有额外威力或冷却代价，适合对单个目标点名。关闭（宽喷）：张角最宽，适合一次淋到挤在身前的多个目标。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动靠近，先在射程外待命；越大越愿意先朝目标接近再喷。"
        }),
        field(pathOf("ai.crowd"), "先削没掉防的", "boolean", {
            help: "开启后，射程内特防还没被削过的敌人越多越优先喷雾，替队伍后续特殊招打开防线；关闭则只按普通攻击排序。"
        })
    ]);
}
