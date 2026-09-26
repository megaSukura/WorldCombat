/**
 * 三重攻击 / triattack —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack／ranged 位上；带三重攻击的伙伴把它当中距离齐射。
 *   对可见、敌对、存活、在 `ai.maxChase`（默认 13）以内、且中间有通视线的目标出手；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferCluster`（默认开）打开时，目标身边还挤着别的人就抬价——广域式能让三束分头点过去；
 *   `ai.seekUnmarked`（默认开）打开时，还没带着三种元素余痕的目标略高，别把余痕机会丢在已经有状态的人身上。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程后再出手。
 * 放完之后：三束各结算一次，伙伴交回共享顺序继续交战；它是一记压血手段，不负责收尾。
 * 优先级：基础 20（已在射程内）／4（还要先走近）；扎堆 +10，未带元素余痕 +4。
 */
namespace PokemonSkills {
    /** 目标身边 3 格内还挤着几个敌人，用来读「扎堆」；只是候选排序的读法，不改变命中判定。 */
    function triattackCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby: CompanionBehavior.Entity[] = <any>context.facts.nearby || [];
        let count = 0;
        for (let index = 0; index < nearby.length && count < 6; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || String(other.ref) === String(target.ref)) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.0) count++;
        }
        return count;
    }

    /** 目标是否已经带着三种元素余痕中的任意一种。 */
    function triattackMarked(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.status(context, target, "burn")
            || CompanionBehavior.status(context, target, "frozen")
            || CompanionBehavior.status(context, target, "paralysis");
    }

    CompanionBehavior.registerUse(triattackId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 13)) return false;
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > CompanionBehavior.ai<number>(capability, "maxChase", 13)) return 0;
            let value = gap <= capability.data.range ? 20 : 4;
            if (CompanionBehavior.ai<boolean>(capability, "preferCluster", true) && triattackCluster(context, target) >= 1) value += 10;
            if (CompanionBehavior.ai<boolean>(capability, "seekUnmarked", true) && !triattackMarked(context, target)) value += 4;
            return value;
        }
    });

    addPreferences(triattackId, {}, [
        field(pathOf("wide"), "广域式", "boolean", {
            help: "开启：三束光线分头找主目标附近最多三个不同的有效敌，覆盖更广；找不到足够的人时多出的束回到同一合法目标，不白白落空。代价是每束 ×0.85、余痕几率 ×0.85、起手 +1 刻、冷却 ×1.15。关闭：集束式，三束都打同一目标、单点 ×1.04、余痕几率 ×1.1。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 24, step: 1,
            help: "超过这个距离就不主动齐射，先走近；越大越愿意从更远处先手压血。"
        }),
        field(pathOf("ai.preferCluster"), "优先扎堆", "boolean", {
            help: "开启后，目标身边还挤着别人时优先点它，广域式能让三束分头带过去；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.seekUnmarked"), "优先未带余痕", "boolean", {
            help: "开启后，还没带着灼伤／冰冻／麻痹的目标优先级略高，别把余痕机会丢在已经有状态的人身上；关闭则一视同仁。"
        })
    ]);
}
