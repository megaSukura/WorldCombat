/**
 * 延后 / quash 的 AI 用途。
 *
 * 什么局面下出手：挂在共享的 control 位上；带压制的伙伴在没有攻击可用时用它。对还没被压住的目标出手
 * （读共享身份 quash），够不到就先交给共享接近逻辑走近。
 * 时机：目标此刻确实在准备一个可中断的动作时 priority 抬到 80（这一下真能打断）；
 *   attacking() 只表示它的仇恨目标，不当作“正在准备”，只给 55；其余 40。
 * 目标已被压制（次数或减速还在）时不重放，把次数留给新目标。
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
            // attacking() is only the target's aggro target; a real interruptible preparation is the strong cue.
            const world = CompanionBehavior.world(context), opponent = world.actor(target.ref);
            if (opponent !== null && LivingActions.preparing(world, opponent).length > 0) return 80;
            return target.attacking === self.ref ? 55 : 40;
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
