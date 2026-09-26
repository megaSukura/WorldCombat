/**
 * 捏碎 / crushgrip 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是全族最重的一握，威力随**目标剩余生命比例**走高，所以 `ai.preferHealthy`（默认开）把血量最满的目标排在前面。
 * 对谁出手：单体。`hoist`（高举式）开启时，它会用一次进攻换来「提起—按住—摔下」的控制窗口——但只有当目标头顶真的
 *   放得下、且原生受力允许（只读 `freeSpace` 探上方空间、`attributeValue` 读完全抗位移的 Boss），AI 才把这段控制算进
 *   价值；体型过大／举不动的目标只按初握的伤害评分，不虚算控制。代价是更慢更费。两种形态都是玩家能观察到的差异。
 * 放完之后：冷却较长、起手也重，是抓机会的一记；AI 在这段时间里交给共享交战次序，之后再找还满着血的目标。
 */
namespace PokemonSkills {
    /** 目标是否真的举得起来：既要有头顶空间，也要原生受力许可（完全抗位移的 Boss 不算控制价值）。 */
    function crushgripCanLift(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const actor = world.actor(String(target.ref));
        if (actor === null) return false;
        const resistance = world.attributeValue(actor, "minecraft:generic.knockback_resistance");
        if (resistance && resistance.value() >= 1) return false;
        const body = world.observe(actor);
        if (body === null) return false;
        const point = WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z());
        const width = target.width === undefined ? 0.9 : target.width;
        const height = target.height === undefined ? 1.4 : target.height;
        const lift = Math.max(0.2, p(crushgripId, "lift", world));
        return world.freeSpace(point.plus(WorldCombat.point(0, lift, 0)), width, height);
    }

    CompanionBehavior.registerUse(crushgripId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const ratio = CompanionBehavior.ratio(target);
            let score = 19;
            if (CompanionBehavior.ai<boolean>(capability, "preferHealthy", true))
                score += Math.round(ratio * 34);
            const config = capability.data.config;
            if (config && config.hoist && ratio > 0.5 && crushgripCanLift(context, capability, target)) score += 10;
            return score;
        }
    });

    addPreferences(crushgripId, {}, [
        field(pathOf("hoist"), "高举式", "boolean", {
            help: "开启：捏住后把目标提起，只有真的举离地面才按住再摔回地面，追加一记固定伤害并短暂定身；免疫位移或被顶住的目标只算初握。代价是首段威力 ×0.9、起手 +4 刻、收招 +4 刻、冷却 +8 刻。关闭：原地捏碎式，一记捏完，首段更重、更快。"
        }),
        field(pathOf("ai.maxChase"), "捏合距离", "number", {
            min: 2, max: 14, step: 1,
            help: "目标超过这个距离就先走近再捏。越大越会从远处伸手，也越容易在掌影浮出时被走开。"
        }),
        field(pathOf("ai.preferHealthy"), "先捏完好的目标", "boolean", {
            help: "开启：按目标的剩余生命比例排序，血量越满越优先（这一握对它最重）；关闭：只按威胁本身选目标，会先去捏残血。"
        })
    ]);
}
