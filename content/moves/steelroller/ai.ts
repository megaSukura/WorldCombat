/**
 * 铁滚轮 / steelroller 的 AI 用途。
 *
 * 什么局面下出手：**自己脚下正站在一片场地上**（青草／电气／薄雾／精神的共享身份，或按决策帧缓存一次区域读取
 * 兜底覆盖特性掀起的场地），且目标可见、敌对、存活且在 `ai.maxChase`（默认 7）格内。没有场地时不提议——
 * 那只会白扣 5 点 PP；场地外不提案。够不到交给共享接近逻辑。
 *
 * priority：目标也站在同一片场地上时最高（吃掉场地同时剥夺对方的场地收益），在场内 34/20。
 * 把己方还要用的场地只为一点普通伤害吃掉是浪费：自身生命尚可且目标不在场上时压低。放了之后把伤害交回共用交战计划。
 */
namespace PokemonSkills {
    function steelrollerTerrain(context: WorldBehavior.Context, subject: CompanionBehavior.Entity): boolean {
        for (let i = 0; i < steelrollerTerrainNames.length; i++)
            if (CompanionBehavior.status(context, subject, steelrollerTerrainNames[i])) return true;
        // 没有共享身份标记时（例如特性掀起的场地），按决策帧缓存一次区域读取兜底；缓存键带 subject，避免同帧互相覆盖。
        return CompanionBehavior.observedFlag(context, "world_combat:move_steelroller/ground/" + subject.ref, function () {
            return steelrollerAreas(CompanionBehavior.world(context), CompanionBehavior.point(subject.point)).length > 0;
        });
    }

    function steelrollerWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (!steelrollerTerrain(context, CompanionBehavior.source(context))) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse(steelrollerId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return steelrollerWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !steelrollerWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const inReach = CompanionBehavior.distance(self.point, target.point) <= capability.data.range;
            // 目标也站在同一片场地上：吃掉场地同时剥夺对方的场地收益，值得优先。
            if (steelrollerTerrain(context, target)) return inReach ? 46 : 30;
            // 己方还健康、场地是己方的收益时，不为普通伤害花掉它。
            return CompanionBehavior.ratio(self) > 0.55 ? (inReach ? 24 : 12) : (inReach ? 34 : 20);
        }
    });

    addPreferences(steelrollerId, {}, [
        field(pathOf("grind"), "碾磨式", "boolean", {
            help: "开启：威力多一成八、钢屑更密，但滚得近（距离 ×0.8）、速度 ×0.9、收招多 5 刻、冷却多 8 刻。关闭：滚掠式，滚得远而快、收得干净，单发略轻。"
        }),
        field(pathOf("ai.maxChase"), "碾压距离", "number", {
            min: 2, max: 14, step: 1,
            help: "目标离自己这么远以内才滚过去；本招滚动距离中等，设大也常常够不到。"
        })
    ]);
}
