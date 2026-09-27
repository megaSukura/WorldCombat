/**
 * 猛撞 / takedown 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内（更远先交给共享接近逻辑）。
 * 这是一记便宜、反伤轻、冲空安全的基准攻击，所以门槛低；但命中的反伤按实际伤害落在自己身上，
 * 所以 `ai.minHealth`（默认三成）要求自己还扛得住，只有对手已经残到值得一收时例外。
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
            if (!(!target.friendly && target.health > 0 && target.visible)) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.3);
            if (CompanionBehavior.ratio(self) >= minHealth) return true;
            // 低血补刀：只有自己剩余生命仍多于对手，才扛得住命中后的反震。
            return CompanionBehavior.ratio(target) <= 0.35 && self.health > target.health;
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
            help: "出手前的助跑距离。越长撞劲、冲程与自己被弹回的距离越高，但反作用力与起手也一起上去；0 是贴脸就撞，出手最快、反伤最轻。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动猛撞，先走近。越大越早发起，也越容易冲空。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.9, step: 0.05,
            help: "自身生命低于这个比例时不再主动猛撞（除非对手已残且自己血量仍高于对方）。越高越珍惜自己，也越少抢收残血。"
        }),
        field(pathOf("ai.preferWeak"), "优先残血", "boolean", {
            help: "开启：对手生命低于三成时优先用猛撞补刀；关闭：只按共享顺序与其它候选竞价。"
        })
    ]);
}
