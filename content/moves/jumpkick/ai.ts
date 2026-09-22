/**
 * 飞踢 / jumpkick 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase` 之内。它是一记便宜、反伤中等、
 * 至少不会凭空受伤的接触攻击，所以门槛低：够得着就排进候选。够不到交给共享接近逻辑先走近。
 * `ai.preferWeak`（默认开）在对手残血时把它往前提——一记踹开正适合补最后一下。
 * 放完之后交给共享顺序继续（收招后重新评估）；助跑与原地由玩家配置承担，不由 AI 重复。
 */
namespace PokemonSkills {
    function jumpkickWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 9);
    }

    CompanionBehavior.registerUse("jumpkick", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return jumpkickWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !jumpkickWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "preferWeak", true) && CompanionBehavior.ratio(target) <= 0.35) return 30;
            return 16;
        }
    });

    addPreferences("jumpkick", {}, [
        field(pathOf("running"), "助跑起跳", "boolean", {
            help: "开启：起跳前有一段助跑，踢劲 +8、腾空前移更远（弧线更长、更难被让开），但起手 +3 刻、踢偏时自伤 +0.03。关闭：原地起跳，出手更快、踢偏更轻，但冲得不远也不够狠。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "目标在这个距离以内才主动飞踢，否则先走近。越大越早发起，也越容易落在对手身后。"
        }),
        field(pathOf("ai.preferWeak"), "优先残血", "boolean", {
            help: "开启：对手生命低于三成时优先用飞踢补刀；关闭：只按共享顺序与其它候选竞价。"
        })
    ]);
}
