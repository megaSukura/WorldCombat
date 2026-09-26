/** 用水击进攻并打湿目标；施放者身在水里时水柱更猛，因此略微上调这种出手的优先级；清除敌方灼伤会损失持续伤害，因此默认降低这种出手的优先级。 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(aquajetId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
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
            let score = 23;
            if (self.wet) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "preserveBurn", true) && CompanionBehavior.status(context, target, "burn")) score -= 16;
            if (CompanionBehavior.ai<boolean>(capability, "preferDry", true) && CompanionBehavior.status(context, target, "soaked")) score -= 8;
            if (CompanionBehavior.ratio(target) <= 0.3) score += 8;
            return score;
        }
    });

    addPreferences(aquajetId, {}, [
        field(pathOf("deluge"), "激流贯注", "boolean", {
            help: "开启：水柱贯穿整条路径、浇透并打伤碰到的每个人、判定更宽、湿得更久，但单点伤害 ×0.82、冷却多 6 刻。关闭：单发鱼雷，命中即停、这一下最重。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "对手离自己这么远以内才主动喷射；本招射得比电光一闪远，设大愿意更早放。"
        }),
        field(pathOf("ai.preserveBurn"), "保留灼伤", "boolean", {
            help: "开启：对带有灼伤的敌人降低本招优先级，优先保留持续伤害；紧急顶退和残血补刀仍可出手。关闭：按普通进攻收益排序。"
        }),
        field(pathOf("ai.preferDry"), "先浇没湿的", "boolean", {
            help: "开启：已经带着 soaked 的目标排后，先换一个干的浇；关闭：当普通先制候选排序。"
        })
    ]);
}
