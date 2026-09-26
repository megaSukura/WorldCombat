/**
 * 冰锤 / icehammer 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记自由瞄准的近身裹冰单体重砸。目标可见、敌对、存活，且在 `ai.maxChase`（默认 6）格内；
 *   更远交给共享接近逻辑。和臂锤一样，这一记会让自身速度下降，所以只在够得到时用。
 * 对谁出手：`ai.chill`（默认开）打开时，**已经冰缓**的目标多一档分——冰壳更脆，这一记打得更重，也把冰缓接下去；
 *   只有目标脚下是**正式允许的自然暴露地表**时，才把它当成能留下冰滑价值的目标再加一档分；空中或不适合的地面不估。
 * 够不到怎么办：reach 就是本招射程，不够先走近；目标在起手期间跑掉、或拳路先碰上墙，就只留扑空的冰屑。
 * 放完之后：命中真的挂上冰缓、真的降速、真的铺成冰面才各自有反馈；交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function icehammerWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    /** 目标脚下是不是正式允许结冰的自然暴露地表；只有是，才把这一记的冰滑价值算进去。 */
    function icehammerGround(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const ground = WorldGeometry.ground(world, CompanionBehavior.point(target.point), 4);
        const block = world.block(WorldCombat.point(ground.x(), ground.y() - 1, ground.z()));
        if (block === null) return false;
        if (block.tagged("minecraft:dirt") || block.tagged("minecraft:base_stone_overworld")
            || block.tagged("minecraft:sand") || block.tagged("minecraft:snow")
            || block.tagged("minecraft:terracotta") || block.tagged("minecraft:substrate_overworld")) return true;
        const id = String(block.id());
        return id === "minecraft:grass_block" || id === "minecraft:podzol" || id === "minecraft:mycelium"
            || id === "minecraft:moss_block" || id === "minecraft:snow_block" || id === "minecraft:gravel"
            || id === "minecraft:packed_ice" || id === "minecraft:ice" || id === "minecraft:clay";
    }

    CompanionBehavior.registerUse("icehammer", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return icehammerWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !icehammerWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = 16;
            if (distance <= capability.data.range) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "chill", true) && CompanionBehavior.status(context, target, "chilled")) score += 10;
            if (icehammerGround(context, target)) score += 6;
            return score;
        }
    });

    addPreferences("icehammer", {}, [
        field(pathOf("glaciate"), "积冰式", "boolean", {
            help: "开启：冰缓时长 ×1.4、冰面更大更久，彻底冻住目标；代价是威力 ×0.92、起手 +2 刻、收招 +2 刻、冷却 +6 刻。关闭（碎冰式）：一击更重、出手更快，但冰缓短、冰面小。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动发起冰锤，先走近。调大愿意从稍远处上前砸，也越容易在起手期间被走位甩开。"
        }),
        field(pathOf("ai.chill"), "优先冰缓目标", "boolean", {
            help: "开启：已经带着冰缓身份的目标排得更前，冰壳更脆、这一记更重也把冰缓接下去；关闭则所有目标同价。"
        })
    ]);
}
