/**
 * 岩斧 / stoneaxe —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 近身位上；带岩斧的伙伴把它当贴身斧劈，劈中后在落点留下悬浮岩阵。
 *   对可见、敌对、存活、在 `ai.maxChase`（默认 6）以内、且中间有通视线的目标出手；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferCluster`（默认开）打开时，目标身边还挤着别人就抬价——悬浮岩阵不要求目标落地，
 *   挤在一起的人和飞在低空的都会被砸到；关闭则只按普通近身攻击排序。
 * 够不到怎么办：3.2 格左右的短射程交给 `reach`，共享任务把身位收进射程后再出手。
 * 放完之后：落点留下悬浮岩阵（崩解式只砸第一次），伙伴交回共享顺序继续交战。
 * 优先级：基础 22（已在射程内）／4（还要先走近）；扎堆 +12。
 */
namespace PokemonSkills {
    /** 目标身边 3 格内还挤着几个敌人，用来读「扎堆」；只是候选排序的读法，不改变命中判定。 */
    function stoneaxeCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby: CompanionBehavior.Entity[] = <any>context.facts.nearby || [];
        let count = 0;
        for (let index = 0; index < nearby.length && count < 6; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || String(other.ref) === String(target.ref)) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.0) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(stoneaxeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return false;
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return 0;
            let value = gap <= capability.data.range ? 22 : 4;
            if (CompanionBehavior.ai<boolean>(capability, "preferCluster", true) && stoneaxeCluster(context, target) >= 1) value += 12;
            return value;
        }
    });

    addPreferences(stoneaxeId, {}, [
        field(pathOf("shatter"), "崩解", "boolean", {
            help: "开启：悬浮岩第一次被闯进就整片崩下来，单次砸伤 ×1.8，但悬浮时长 ×0.7、范围 ×0.9、斧劈 ×0.92——一口气砸重的。关闭：悬岩式，碎片持续悬浮、范围更大、斧劈 ×1.05，但每次砸伤 ×0.85、要反复砸。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动劈斧，先走近；越大越愿意主动扑上去劈。"
        }),
        field(pathOf("ai.preferCluster"), "优先扎堆", "boolean", {
            help: "开启后，目标身边还挤着别人时优先劈它，在落点留下的悬浮岩阵能一次砸到好几个（包括飞在低空的）；关闭则只按普通近身攻击排序。"
        })
    ]);
}
