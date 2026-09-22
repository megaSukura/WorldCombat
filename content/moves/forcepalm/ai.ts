/**
 * 发劲 / forcepalm 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑，先走到贴身距离。
 * 这是一记接触掌击，`ai.preferNumb`（默认开）在目标还没被麻痹时把它排到前面——把这一掌的麻痹机会留给
 * 还能被麻的人；代价是可能反复追着未麻目标、放过眼前更该打的对象。关闭则只按威胁本身排序。
 * 透劲式与崩劲式不改变出手条件，只改变力道收在一个人身上还是透到身后。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("forcepalm", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range * 2.2) return 0;
            // 未麻痹的目标排序更前，把这一掌的麻痹机会留给还能被麻的人；已被麻的仍可出手，只是不优先。
            if (CompanionBehavior.ai<boolean>(capability, "preferNumb", true) && !CompanionBehavior.status(context, target, "paralysis")) return 42;
            return 28;
        }
    });

    addPreferences("forcepalm", {}, [
        field(pathOf("through"), "透劲式", "boolean", {
            help: "开启：波从目标身体另一侧透出、打到背后直线上的最多两个目标（主目标那一下略轻、麻痹概率略低、冷却更长）。关闭（崩劲式，默认）：力道收在一个目标身上，单点更重、更容易打麻。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动贴身，先走近。越大越会在较远处就决定冲上去按掌。"
        }),
        field(pathOf("ai.preferNumb"), "优先打麻", "boolean", {
            help: "开启：目标还没麻痹时优先用它（这一掌的麻痹机会留给还能被麻的人）；关闭：只按威胁本身排序。"
        })
    ]);
}
