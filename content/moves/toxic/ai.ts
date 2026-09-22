/**
 * 剧毒 / toxic 的 AI 用途。
 *
 * 什么局面下出手：挂在共享的 control 位上；带毒招的伙伴在没有攻击可用时用它。对还没中毒的目标下毒
 * （读共享身份，毒与剧毒都算“已经有毒”），已经中毒的目标不重复下手；够不到就先交给共享接近逻辑走近。
 * 对手身上还没有毒时 priority 抬到 45，让它在多个控制候选里先把毒铺开；目标体型越大越值得先毒。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("toxic", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.status(context, target, "poison")) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.status(context, target, "poison")) return 0;
            // A big, healthy target is the best place to plant a poison that grows.
            return target.maximum >= 80 ? 55 : 45;
        }
    });

    addPreferences("toxic", {}, [
        field(pathOf("virulent"), "毒力取向", "boolean", {
            help: "开启：毒素持续更短（×0.72）但加深更快（间隔 ×0.62）、爆发更重（×1.3），更快咬穿目标；关闭：持续更久（×1.08）、加深更慢，把战斗拖成长期消耗。"
        }),
        field(pathOf("ai.maxChase"), "施毒距离", "number", {
            min: 3, max: 24, step: 1,
            help: "超过这个距离就不主动施毒，先走近。越大越执着追击，也越容易在开阔地喷空。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为施毒离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
