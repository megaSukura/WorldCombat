/**
 * 舌舔 / lick 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；够不到交给共享接近逻辑。
 * 这是一记便宜的长舌单点，价值在麻痹，所以 `ai.opening` 默认是“优先未麻痹目标”——把这一舔留给还能被麻的人，
 * 但已经发麻的敌人也不会被排除，仍可当普通轻击舔中。速度快的伙伴舌长更长、麻意更重，由公式承担。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("lick", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            // 已麻痹的目标也能当普通轻击舔；「只对未麻痹」只体现在优先级上，不再排除。
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 18;
            const numb = CompanionBehavior.status(context, target, "paralysis");
            if (!numb) score += 8;
            else if (CompanionBehavior.ai<string>(capability, "opening", "unparalyzed") === "unparalyzed") score -= 4;
            return score;
        }
    });

    addPreferences("lick", {}, [
        field(pathOf("coil"), "缠绕式", "boolean", {
            help: "开启：命中后把目标往身前拽一段、麻痹概率略高，但起手多 3 刻、收招与冷却更长。关闭：快舔，出手更快、代价更小，只留伤害与麻意。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不伸舌，先走近。越大越会在长舌够得到的边缘先手。"
        }),
        field(pathOf("ai.opening"), "出手时机", "choice", {
            options: [
                { value: "anytime", label: "随时" },
                { value: "unparalyzed", label: "优先未麻痹目标" }
            ],
            help: "默认优先舔还没发麻的目标，把麻痹留给还能被麻的人，但已经发麻的敌人也能被当作普通轻击舔中；选“随时”则一视同仁。"
        })
    ]);
}
