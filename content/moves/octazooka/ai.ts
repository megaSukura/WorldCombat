/**
 * 章鱼桶炮 的伙伴 AI 用途：一套自己的出手计划。
 *
 * 什么局面下出手：有可见威胁、在 `ai.maxChase` 之内。它的价值在糊眼，所以在目标正出手时优先度更高——
 * 趁它动作中喷墨，让它接下来的攻击更容易偏。
 * 对谁出手：当前威胁；不可见、友方或已倒下的目标不接受。
 * 够不到怎么办：reach 就是本招射程，不够就先走近交给共享接近逻辑；`ai.leaveStation` 决定驻守时是否离位。
 * 放完之后：目标脸上糊墨、地上留墨渍一段，交回共享顺序继续战斗。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("octazooka", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 15);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const inReach = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range;
            const base = inReach ? 18 : 0;
            return target.attacking ? base + 10 : base;
        }
    });

    addPreferences("octazooka", {}, [
        field(pathOf("ai.maxChase"), "喷射距离", "number", {
            min: 3, max: 22, step: 1,
            help: "超过这个距离就不主动喷墨，先走近。越大越愿意在更远处先手糊眼。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找射界离开站位；关闭则只在原地够得到时喷墨。"
        })
    ]);
}
