/**
 * 延后 / quash 的 AI 用途。
 *
 * 什么局面下出手：挂在共享的 control 位上；带压制的伙伴在没有攻击可用时用它。对还没被压住的目标出手
 * （读共享身份 quash），够不到就先交给共享接近逻辑走近。
 * 对手正冲着自己在打时 priority 抬到 70——这一下最值得用来打断它正在蓄的动作；否则只给 40。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("quash", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.status(context, target, "quash")) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || CompanionBehavior.status(context, target, "quash")) return 0;
            var self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            return (target as any).attacking === self.ref ? 70 : 40;
        }
    });

    addPreferences("quash", {}, [
        field(pathOf("crushing"), "重压取向", "boolean", {
            help: "开启：压制窗口更长（时长 ×1.3），能压住更久，但冷却多 20 刻、出手更少；关闭：轻压取向，压制更短（×0.8）但冷却少 8 刻，能更频繁地抢拍。"
        }),
        field(pathOf("ai.maxChase"), "施压距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动压制，先走近。越大越执着追击，也越容易在白地追空。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为压制离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
