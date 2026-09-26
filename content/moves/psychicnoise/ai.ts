/**
 * 精神噪音 / psychicnoise 的伙伴 AI 用途。
 *
 * 什么局面下出手：有可见、敌对、存活的目标，且在 ai.maxChase（默认 12）格内。
 * 对谁出手：当前威胁；它同时也造成伤害，所以不像纯封锁招那样跳过已有身份的敌人。
 * 更想封谁：带治疗招式／治疗树果或刚实际回复过的目标优先（priority 45）；已经封住的只剩伤害价值（18）；
 *   普通目标 30，不再只按血量高低猜需不需要封治疗。
 * 够不到怎么办：交给共享接近逻辑；reach 就是由特攻与体型决定的音波射程。
 * 放完之后：目标一段时间内回不了血，伙伴按共用计划继续交战。
 * 配置 pierce（贯穿啸叫）让音波穿过几个人，代价是威力与封回复都变轻。
 */
namespace PokemonSkills {
    // 感知事实：目标是否有治疗手段、是否刚实际回复过。只读探针，决策帧内缓存。
    CompanionBehavior.registerFact("world_combat:move/psychicnoise/heals", function (access, actor) {
        return psychicNoiseHealCapable(access, actor);
    });
    CompanionBehavior.registerFact("world_combat:move/psychicnoise/recent-heal", function (access, actor) {
        return psychicNoiseRecentHeal(access, actor);
    });

    CompanionBehavior.registerUse(psychicNoiseId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            // 已经封住的敌人再封一次只剩伤害，价值降低；真正会回血的敌人优先，纯血量高低不再作为依据。
            if (CompanionBehavior.status(context, target, psychicNoiseStatus)) return 18;
            if (CompanionBehavior.fact<boolean>(context, "world_combat:move/psychicnoise/heals", target)
                || CompanionBehavior.fact<boolean>(context, "world_combat:move/psychicnoise/recent-heal", target)) return 45;
            return 30;
        }
    });

    addPreferences(psychicNoiseId, { pierce: false, ai: { maxChase: 12 } }, [
        field(pathOf("pierce"), "贯穿啸叫", "boolean", {
            help: "开启（贯穿啸叫）：音波可以穿过最多 4 个目标，但威力 ×0.8、封回复时长 ×0.85；关闭（聚焦）：只打一个目标，威力与封锁更足。"
        }),
        field(pathOf("ai.maxChase"), "射程距离", "number", {
            min: 4, max: 20, step: 1,
            help: "目标在这个距离内才考虑精神噪音；调大愿意在更远处先封住回复。"
        })
    ]);
}
