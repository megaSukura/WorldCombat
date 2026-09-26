/**
 * 掷泥 的伙伴 AI 用途：一套自己的出手计划，不是共享控制位的随手一放。
 *
 * 什么局面下出手：有可见威胁、在 `ai.maxChase` 之内。它是必定生效的糊眼起手，所以越近越值得先用；
 *   对手的命中越高，削它一下越值，priority 随目标的命中能力等级上抬。
 * 对谁出手：当前威胁；不可见、友方或已倒下的目标不接受。
 * 命中已经压到最低（-6）时，这招只剩「轻击」价值：仍可在射程内出手，但不再是优先起手。
 * 够不到怎么办：reach 就是本招射程，不够就先走近；`ai.leaveStation` 决定驻守时是否离位。
 * 放完之后：目标命中下降，交回共享顺序继续战斗。
 * 选取是 aim：玩家可朝方向/世界点空放，AI 仍只为攻击用途推荐敌人，两者分开处理。
 */
namespace PokemonSkills {
    /** 目标当前的命中能力等级（含临时窗口）；AI 只读不写。 */
    CompanionBehavior.registerFact("world_combat:move_mudslap/accuracy", function (access, actor) {
        if (!access.valid(actor)) return 0;
        return NativeEffects.effectiveStage(access, actor, "accuracy");
    });

    function mudslapAccuracy(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_mudslap/accuracy", target);
        return typeof value === "number" ? value : 0;
    }

    CompanionBehavior.registerUse("mudslap", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (gap > capability.data.range) return 0;
            const accuracy = mudslapAccuracy(context, target);
            // 命中已经最低：只剩轻击，仍可出手但排在普通起手之后。
            if (accuracy <= -6) return 6;
            // 对手越准（命中等级越高），糊住它越值；近距再抬一档作为先手。
            const worth = Math.max(0, accuracy) * 2;
            return (gap <= 3 ? 26 : 16) + worth;
        }
    });

    addPreferences("mudslap", {}, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不主动掷泥，先走近。越大越愿意在更远处先手糊眼。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为掷泥离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
