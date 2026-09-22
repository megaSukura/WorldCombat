/**
 * 精神利刃 / psychocut 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 13）格内；更远交给共享接近逻辑。
 * `ai.finishLow`（默认开）在残血目标上加分：目标生命低于 45% 时 priority 抬到 42，把这一刃当远程收尾；
 * 关闭后只按普通远程斩击排序。它是射程最长、会追人的一记，够不到时共享任务把身位收进射程。
 * 放完之后：交回共享交战计划；掷完站在原地，由共享顺序决定接着打还是走位。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(psychocutId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.45) return 42;
            return 25;
        }
    });

    addPreferences(psychocutId, {}, [
        field(pathOf("keen"), "凝刃式", "boolean", {
            help: "开启：威力 ×1.12、十字大 0.35 格、波及比例多 0.06，代价是飞行 ×0.85、冷却多 8 刻；关闭：飞行 ×1.15、冷却少 6 刻，代价是威力 ×0.94、十字小 0.2 格。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不主动凝刃，先走近；越大越愿意从远处掷刃。"
        }),
        field(pathOf("ai.finishLow"), "优先收尾", "boolean", {
            help: "开启：目标生命低于 45% 时优先掷出这一刃收尾；关闭：无论血量都按普通远程斩击排序。"
        })
    ]);
}
