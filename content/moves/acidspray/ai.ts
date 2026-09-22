/**
 * 酸液炸弹 / acidspray —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且落在 `ai.maxChase`（默认 8）格内——射程很短，出手前要先贴近。
 * 对谁出手：`ai.crowd`（默认开）打开时，自己身边还围着别的敌人就抬高 priority——那正是这一口楔形最值的时候；
 *   关闭则只按普通攻击排序。
 * 够不到怎么办：交给共享接近逻辑走近到 `reach` 内再喷；`approachTarget` 让伙伴朝目标靠近。
 * 放完接什么：交回共享交战计划；它是一发贴脸喷淋，靠余雾封住一小块地，不负责收尾。
 */
namespace PokemonSkills {
    function acidsprayCrowd(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context).point, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const radius = typeof capability.data.range === "number" ? capability.data.range : 5;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === String(context.actor)) continue;
            if (CompanionBehavior.distance(other.point, self) <= radius) count++;
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
            return acidsprayCrowd(context, capability) >= 2 ? base + 12 : base;
        }
    });

    addPreferences("acidspray", {}, [
        field(pathOf("focus"), "聚焦喷口", "boolean", {
            help: "开启：张角收到 55%、射程拉到 1.3 倍、单发 ×1.15，但残雾更短、冷却 +5 刻，适合对一个目标贴脸磨。关闭（宽喷）：张角最宽，适合一次淋到挤在身前的多个目标。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动靠近，先在射程外待命；越大越愿意先朝目标接近再喷。"
        }),
        field(pathOf("ai.crowd"), "聚堆时优先", "boolean", {
            help: "开启后，自己身边还有别的敌人时优先喷雾，一次淋一片；关闭则只按普通攻击排序。"
        })
    ]);
}
