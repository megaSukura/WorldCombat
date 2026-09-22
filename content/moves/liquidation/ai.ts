/**
 * 水流裂破 / liquidation 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内时才有意义；更远交给共享接近逻辑。
 * 开启 `ai.crack`（默认开）时，还没有被破防（不带 `world_combat:status/sundered`）的目标排得更前——
 * 把这一发留给护甲还完好的对手；已经被撕开的目标只按普通近身候选排。够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("liquidation", {
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
            const close = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range;
            if (!close) return 0;
            const cracked = CompanionBehavior.status(context, target, "sundered");
            if (CompanionBehavior.ai<boolean>(capability, "crack", true) && !cracked) return 42;
            return cracked ? 12 : 24;
        }
    });

    addPreferences("liquidation", {}, [
        field(pathOf("shred"), "破甲式", "boolean", {
            help: "开启：破防概率更高、一次能压两级、湿身更久，但正面威力降低、起手与冷却更久；关闭：重压式，正面威力更高、只压一级。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动发起水流裂破，先靠近。越大追击越执着。"
        }),
        field(pathOf("ai.crack"), "留给未破防的目标", "boolean", {
            help: "开启：优先对还没被撕开护甲的目标出手（命中挂上破甲）；关闭：只按威胁与距离排序。"
        })
    ]);
}
