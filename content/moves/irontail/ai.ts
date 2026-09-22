/**
 * 铁尾 / irontail 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是一记慢而重的下砸，所以 `ai.heavyFirst`（默认开）在目标还没被砸凹、血还厚、又站得近时抬高优先级——
 * 重砸用在硬目标上最值；目标已经带着破防身份（碎岩开的或别处留下的）就降下来，先让便宜招式去拆。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("irontail", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "heavyFirst", true)) return 22;
            if (CompanionBehavior.status(context, target, "guardbroken")) return 8;
            return target.health >= target.maximum * 0.5 ? 34 : 18;
        }
    });

    addPreferences("irontail", {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不抬尾，先走近。越大越会从远处抡起，也越容易在抬尾期被走出落点。"
        }),
        field(pathOf("ai.heavyFirst"), "留给硬目标", "boolean", {
            help: "开启：优先对还没被砸凹、血量过半的目标重砸；关闭：当普通近身攻击排序。"
        })
    ]);
}
