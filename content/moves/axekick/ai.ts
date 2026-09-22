/**
 * 下压踢 / axekick 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着、在 `ai.maxChase` 之内。它是本族自伤最轻的一记，
 * 所以敢在贴脸缠斗里用。`ai.spareConfused`（默认开）会跳过已经带着共享身份 confusion 的目标，
 * 不再把恍惚浪费在同一只身上；关闭则照样劈，只当普通输出。
 * 对谁出手：正在攻击自己或主人的目标优先级更高（恰到好处的打断）。
 * 放完之后：交给共享顺序继续——劈空的脚踵自伤轻，不需要特意后撤。
 */
namespace PokemonSkills {
    function axekickWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.ai<boolean>(item, "spareConfused", true) && CompanionBehavior.status(context, target, "confusion")) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }

    CompanionBehavior.registerUse("axekick", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return axekickWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !axekickWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 20;
            const owner = context.facts.owner;
            if (target.attacking === self.ref || !!owner && target.attacking === owner.ref) score += 12;
            return score;
        }
    });

    addPreferences("axekick", { ai: { maxChase: 8, spareConfused: true } }, [
        field(pathOf("high"), "高劈", "boolean", {
            help: "开启：抬腿更高、劈劲 ×1.08、判定更宽，但起手 +2 刻、冷却 +4 刻、射程 -0.4 格、劈偏自伤 +0.03。关闭：低位快劈，出手快、够得远、自伤轻，但劈不狠也不够宽。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "目标在这个距离以内才主动下劈，否则先走近。越大越早发起，也越容易劈空。"
        }),
        field(pathOf("ai.spareConfused"), "跳过已恍惚目标", "boolean", {
            help: "开启：目标已经带着恍惚（共享身份 confusion）时不再下压踢；关闭：照常下劈，只当普通输出。"
        })
    ]);
}
