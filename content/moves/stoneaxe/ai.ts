/**
 * 岩斧 / stoneaxe —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 近身位上；带岩斧的伙伴把它当贴身斧劈，劈中后在落点留下有限的悬浮岩阵。
 *   对可见、敌对、存活、在 `ai.maxChase`（默认 6）以内、且中间有通视线的目标出手；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferCluster`（默认开）打开时，按预测落点半径里的入口流量给价——目标身边/必经处还挤着别人就抬价；
 *   同时评估顶棚净空（阵心到悬浮高度被方块挡住则落岩砸不实，降权）与已有库存（目标附近已有自己的石阵就不再叠）。
 *   关闭则只按普通近身攻击排序。
 * 够不到怎么办：3.2 格左右的短射程交给 `reach`，共享任务把身位收进射程后再出手。
 * 放完之后：落点留下有限石阵（崩解式只砸第一次），每个新进入的敌人消耗一枚、真实飞落接触才结算；静止不动的目标不会被反复砸。
 * 优先级：基础 22（已在射程内）／4（还要先走近）；入口流量 +12 起，顶棚遮挡与已有库存各降一档。
 */
namespace PokemonSkills {
    /** 读本招公式的参数值，给 AI 的现场判断用；与执行、悬浮说明同一棵树。 */
    function stoneaxeAiValue(context: WorldBehavior.Context, capability: WorldBehavior.Capability, key: string, fallback: number): number {
        try {
            const world = CompanionBehavior.world(context);
            const value = p(stoneaxeId, key, { world: world, actor: world.source(), skill: skills[stoneaxeId], detail: { values: capability.data.config } });
            return isFinite(value) ? value : fallback;
        } catch (error) { return fallback; }
    }

    /** 目标预测落点周围 `radius` 内还有几个可进入石阵的敌人（入口流量）。 */
    function stoneaxeCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity, radius: number): number {
        const nearby: CompanionBehavior.Entity[] = <any>context.facts.nearby || [];
        let count = 0;
        for (let index = 0; index < nearby.length && index < 32; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || String(other.ref) === String(target.ref)) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    /** 阵心向上到悬浮高度是否被方块挡住：挡住就落岩砸不实。 */
    function stoneaxeRoofed(context: WorldBehavior.Context, target: CompanionBehavior.Entity, lift: number): boolean {
        const world = CompanionBehavior.world(context);
        const foot = WorldCombat.point(target.point[0], target.point[1] - (target.height || 1.4) / 2, target.point[2]);
        return WorldGeometry.blockHit(world, foot, foot.plus(WorldCombat.point(0, lift + 0.4, 0))) !== null;
    }

    /** 目标附近是否已经有一片自己布下的石阵，避免在同一入口重复铺。 */
    function stoneaxeStocked(context: WorldBehavior.Context, target: CompanionBehavior.Entity, radius: number): boolean {
        const world = CompanionBehavior.world(context);
        const foot = WorldCombat.point(target.point[0], target.point[1] - (target.height || 1.4) / 2, target.point[2]);
        const own = String(world.source().ref()), areas = WorldEffects.areas(world, stoneaxeRule, foot, radius + 1);
        for (let index = 0; index < areas.length; index++) if (areas[index].source === own) return true;
        return false;
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
            const fieldRadius = Math.max(1.2, stoneaxeAiValue(context, capability, "fieldRadius", 2.4));
            if (CompanionBehavior.ai<boolean>(capability, "preferCluster", true)) {
                const crowd = stoneaxeCrowd(context, target, fieldRadius);
                if (crowd >= 1) value += 12 + Math.min(8, crowd * 3);
            }
            if (stoneaxeRoofed(context, target, stoneaxeAiValue(context, capability, "lift", 1.4))) value -= 14;
            if (stoneaxeStocked(context, target, fieldRadius)) value -= 18;
            return value;
        }
    });

    addPreferences(stoneaxeId, {}, [
        field(pathOf("shatter"), "崩解", "boolean", {
            help: "开启：余量第一次被闯进就一次全落、只结算一记（单次砸伤 ×1.8，不按石数叠加），但悬浮时长 ×0.7、范围 ×0.9、斧劈 ×0.92——一口气砸重的。关闭：悬岩式，每个新进入的敌人落一块、砸完即止，范围更大、斧劈 ×1.05，但每次砸伤 ×0.85。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动劈斧，先走近；越大越愿意主动扑上去劈。"
        }),
        field(pathOf("ai.preferCluster"), "优先扎堆", "boolean", {
            help: "开启后，预测落点周围还挤着别人时优先劈它，在敌人必经处留下的石阵能一块块砸到进出的多个目标（包括飞在低空的）；关闭则只按普通近身攻击排序。"
        })
    ]);
}
