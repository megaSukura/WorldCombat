/**
 * 鬼火 / willowisp 的 AI 用途。
 *
 * 什么局面下出手：挂在共享的 control 位上；带鬼火的伙伴在没有攻击可用时用它。只对还没被点着的目标出手
 * （读共享身份 burn，别人点的火也算），够不到就先交给共享接近逻辑走近。
 * 目标尚未灼伤时 priority 抬到 50；鬼火是唯一能把“打不动的高物攻目标”慢慢磨掉的手段，值得先手。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("willowisp", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.status(context, target, "burn")) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || CompanionBehavior.status(context, target, "burn")) return 0;
            return 50;
        }
    });

    addPreferences("willowisp", {}, [
        field(pathOf("swift"), "迅捷取向", "boolean", {
            help: "开启：鬼火飞得更快、转得更紧（速度 ×1.35、转向 ×1.25），但灼伤更短（×0.7），更快命中也更早熄灭；关闭：盘绕取向，鬼火更慢但烧得更久（×1.15），更能拖住目标。"
        }),
        field(pathOf("ai.maxChase"), "点着距离", "number", {
            min: 4, max: 24, step: 1,
            help: "超过这个距离就不主动放鬼火，先走近。越大越执着追击，也越容易在开阔地被目标甩掉。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为放鬼火离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
