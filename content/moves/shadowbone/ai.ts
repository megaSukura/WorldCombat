/**
 * 暗影之骨 / shadowbone 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是全族唯一的远程攻击，`reach` 直接取招式射程，所以它会在中远距离先手出手；`ai.spookFirst`（默认开）
 * 在目标还没被慑住时抬高优先级——用地最远的一记先挂上慑防；目标已经带着破防身份就把优先级降下来。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("shadowbone", {
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
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            const spook = CompanionBehavior.ai<boolean>(capability, "spookFirst", true);
            if (!spook) return 22;
            if (CompanionBehavior.status(context, target, "guardbroken")) return 10;
            // 远程一记在中远处最值：贴脸时先让近身招式处理。
            return distance > 3 ? 32 : 18;
        }
    });

    addPreferences("shadowbone", {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不掷骨，先走近。越大越会在更远处先手。"
        }),
        field(pathOf("ai.spookFirst"), "先手慑防", "boolean", {
            help: "开启：优先对还没带破防身份的目标掷骨，先挂上慑防；关闭：当普通远程攻击排序。"
        })
    ]);
}
