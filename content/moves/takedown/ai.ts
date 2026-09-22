/**
 * 猛撞 / takedown 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内（更远先交给共享接近逻辑）。
 * 这是一记便宜、反伤轻、冲空安全的基准攻击，所以门槛低：只要够得着就排进候选。
 * `ai.preferWeak`（默认开）在对手已经残血时把它往前提——冲程短、出手快，正适合补最后一下；
 * 关闭后只按共享顺序在同等候选里竞价。助跑距离由玩家配置承担，不由 AI 选项重复。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("takedown", {
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
            if (CompanionBehavior.ai<boolean>(capability, "preferWeak", true) && CompanionBehavior.ratio(target) <= 0.35) return 32;
            return 16;
        }
    });

    addPreferences("takedown", {}, [
        field(pathOf("runup"), "助跑", "number", {
            min: 0, max: 3, step: 0.5,
            help: "出手前的助跑距离。越长撞劲、冲程与击退越高，但反作用力、扬尘与起手也一起上去；0 是贴脸就撞，出手最快、反伤最轻。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动猛撞，先走近。越大越早发起，也越容易冲空。"
        }),
        field(pathOf("ai.preferWeak"), "优先残血", "boolean", {
            help: "开启：对手生命低于三成时优先用猛撞补刀；关闭：只按共享顺序与其它候选竞价。"
        })
    ]);
}
