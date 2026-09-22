/**
 * 藤鞭 / vinewhip 的 AI 用途。
 *
 * 什么局面下出手：有可见威胁、在 `ai.maxChase` 之内就列入候选。这是本族里最便宜、回气最快的一记，
 * 适合当作随时可用的填充招式。`ai.interrupt`（默认开）让正在出手攻击自己的目标排得更前——一记快抽正好打断它的节奏。
 * 对谁出手：当前近身威胁；不可见、友方、已倒下的不接受。
 * 够不到怎么办：`reach` 就是本招射程，不够就先走近。
 * 放完之后：交回共享交战计划；`ai.finish` 开启时残血目标排得更前。
 */
namespace PokemonSkills {
    function vinewhipValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    CompanionBehavior.registerUse("vinewhip", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!vinewhipValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, capability, target) { return vinewhipValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const self = CompanionBehavior.source(context);
            let score = 16;
            if (CompanionBehavior.ai<boolean>(capability, "interrupt", true) && target.attacking === self.ref) score += 12;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 16;
            return score;
        }
    });

    addPreferences("vinewhip", {}, [
        field(pathOf("double"), "双抽式", "boolean", {
            help: "开启：一次动作里快抽两记（总伤略高、更容易在对方让位前补上第二记），但收招与冷却更久、单记更轻。关闭（单抽式）：一记更快更重、回气更短的干脆抽击。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 10, step: 1,
            help: "超过这个距离就不主动抽鞭，先靠近。这是一记贴身快抽，调大只在追击时更容易扑空。"
        }),
        field(pathOf("ai.interrupt"), "先打断出手的", "boolean", {
            help: "开启：正在攻击自己的目标排得更前——一记快抽正好打断它的节奏；关闭：只按威胁与距离排序。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时优先补这一鞭；关闭：只按普通近身候选参与排序。"
        })
    ]);
}
