/**
 * 麻痹粉 / Stun Spore — 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 control 位上；带麻痹粉的伙伴在没有攻击可用时用它。对可见、敌对、还活着、
 *   在 ai.maxChase 以内、与施法者通视的目标抛粉。目标已经麻痹时默认跳过（ai.renew 开启则可重复罩，用来拖住
 *   走出旧云的人）。
 * 对谁出手：当前威胁；草属性与电属性对它的效果免疫，直接跳过。
 * 够不到怎么办：由共享任务走到 reach；accepts 不按距离硬拒，会先靠近再抛。
 * 放完之后：落点留下一片持续的麻痹云，伙伴交回共享顺序——可以绕着云继续交战，或把敌人往云里逼。
 * 优先级：基础 50；正在逃跑的威胁抬到 70（先留住它，云会把它留在里面）。
 */
namespace PokemonSkills {
    /** 草属性穿过粉末、电属性穿过麻痹：两种目标都不值得为它撒粉。 */
    function stunsporeImmune(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const facts = CompanionBehavior.pokemonFacts(context, target);
        return !!facts && (facts.types.indexOf("grass") >= 0 || facts.types.indexOf("electric") >= 0);
    }

    CompanionBehavior.registerUse(stunsporeId, {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.status(context, target, "paralysis")
                && !CompanionBehavior.ai<boolean>(capability, "renew", false)) return false;
            if (stunsporeImmune(context, target)) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return false;
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || stunsporeImmune(context, target)) return 0;
            if (CompanionBehavior.status(context, target, "paralysis")
                && !CompanionBehavior.ai<boolean>(capability, "renew", false)) return 0;
            return CompanionBehavior.fleeing(context, target) ? 70 : 50;
        }
    });

    addPreferences(stunsporeId, {}, [
        field(pathOf("thick"), "厚云", "boolean", {
            help: "开启：云半径 ×0.8、存在时长 ×1.3、麻痹 ×1.25，但冷却 ×1.15，用来把一小片地彻底封住；关闭：散云式，半径 ×1.2，更容易一次罩住走位中的几个人，但云更短、麻痹更淡。"
        }),
        field(pathOf("ai.maxChase"), "撒粉距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动撒粉，先走近。越大越执着接近，云也越容易落在够不到的地方。"
        }),
        field(pathOf("ai.renew"), "对已麻痹目标重复撒", "boolean", {
            help: "开启后，对已经麻痹的目标也会再撒一片云（重在用云的位置限制走位）；关闭则只对还没被麻住的目标出手。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为撒粉离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
