/**
 * 毒瓦斯 / poisongas 的 AI 用途。
 *
 * 什么局面下出手：挂在共享的 control 位上；带毒瓦斯的伙伴在没有攻击可用时用它。对可见、敌对、还活着的目标出手，
 * 够不到就先交给共享接近逻辑走近。以目标位置为落点施放，所以挤在一起的目标越多越值得用。
 * 目标周围 4 格内还有别的敌人时 priority 抬到 55（一次罩住一群），孤立目标只给 30。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("poisongas", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return false;
            // 目标已经站在一片毒云里就不重复铺云：读共享的场地查询，而不是自己再扫一遍世界。
            var areas = WorldEffects.areas(CompanionBehavior.world(context), "world_combat:field/poisoncloud");
            for (var i = 0; i < areas.length; i++) {
                var dx = areas[i].position[0] - target.point[0], dz = areas[i].position[2] - target.point[2];
                if (Math.sqrt(dx * dx + dz * dz) <= areas[i].radius) return false;
            }
            return true;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
            var clustered = nearby.filter(function (other) {
                return other.ref !== target.ref && !other.friendly && other.health > 0
                    && CompanionBehavior.distance(other.point, target.point) <= 4;
            }).length;
            return clustered >= 1 ? 55 : 30;
        }
    });

    addPreferences("poisongas", {}, [
        field(pathOf("dense"), "浓稠取向", "boolean", {
            help: "开启：覆盖更小（半径 ×0.8）但云存在更久（×1.4）、中毒更久（×1.4）、爆燃更猛（威力 ×1.2），适合封路；关闭：覆盖更宽（×1.15）但云更短（×0.8）、毒性更淡，适合一次罩住几人。"
        }),
        field(pathOf("ai.maxChase"), "喷吐距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动喷瓦斯，先走近。越大越执着接近，也越容易把云铺在够不到的地方。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为喷瓦斯离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
