/**
 * 飞踢 / jumpkick 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，在 `ai.maxChase` 之内，且自身生命比例不低于 `ai.minSelf`——
 * 踢偏要按最大生命自伤，血太少时这一记可能把自己送走，所以低血时它会主动放弃、改用别的办法。
 * 它是一记便宜、反伤中等、至少不会凭空受伤的接触攻击，所以门槛低：够得着就排进候选。够不到交给共享接近
 * 逻辑先走近。起跳脚下要有真实碰撞支撑、目标脚下要有可落面、头顶留得下这次拔起，否则不选（断崖、水面、
 * 低顶都不算可用）。`ai.preferWeak`（默认开）在对手残血时把它往前提——一记踹开正适合补最后一下。
 * 放完之后交给共享顺序继续（收招后重新评估）；长跃与原地由玩家配置承担，不由 AI 重复。
 */
namespace PokemonSkills {
    function jumpkickWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(item, "minSelf", 0.2)) return false;
        if (CompanionBehavior.distance(self.point, target.point)
            > CompanionBehavior.ai<number>(item, "maxChase", 9)) return false;
        const world = CompanionBehavior.world(context);
        // 短直线可接近：到目标要有直视线，墙后不拐向原敌。
        if (!world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
        // 真实起落净空：起跳脚、目标脚各自要有可落支撑，头顶要留得下这次拔起。
        const height = self.height || 1.4;
        const selfFeet = CompanionBehavior.point([self.point[0], self.point[1] - height * 0.5, self.point[2]]);
        if (SurfacePaths.support(world, selfFeet, 0.7, 3) === null) return false;
        const targetFeet = CompanionBehavior.point([target.point[0], target.point[1] - (target.height || 1.4) * 0.5, target.point[2]]);
        if (SurfacePaths.support(world, targetFeet, 0.7, 6) === null) return false;
        const climb = p("jumpkick", "leapHeight", { world: world, actor: world.source(), skill: skills["jumpkick"],
            detail: { values: item.data.config || {} } });
        const head = CompanionBehavior.point([self.point[0], self.point[1] + height * 0.5, self.point[2]]);
        const ceiling = world.clipBlocks(head, head.plus(WorldCombat.point(0, Math.max(1, climb) + 0.4, 0)));
        return ceiling !== null && !ceiling.blocked();
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
            // 快敌仍需预判：横移越快的目标越容易在被锁死的浅弧窗口里让开，降权但不禁用。
            const velocity = target.velocity;
            const moving = velocity ? Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) : 0;
            return moving > 0.25 ? 12 : 16;
        }
    });

    addPreferences("jumpkick", {}, [
        field(pathOf("running"), "长跃飞踢", "boolean", {
            help: "开启：腾空前移更远、踢劲 +8，弧线更长、更难被让开，但起手 +3 刻、踢偏时自伤 +0.03。关闭：原地短跃，出手更快、踢偏更轻，但冲得不远也不够狠。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "目标在这个距离以内才主动飞踢，否则先走近。越大越早发起，也越容易落在对手身后。"
        }),
        field(pathOf("ai.minSelf"), "最低自身血量", "number", {
            min: 0, max: 1, step: 0.05,
            help: "自身生命比例低于这个值时不再飞踢（踢偏的自伤可能致命）。调高更保守，调低更愿意冒险。"
        }),
        field(pathOf("ai.preferWeak"), "优先残血", "boolean", {
            help: "开启：对手生命低于三成时优先用飞踢补刀；关闭：只按共享顺序与其它候选竞价。"
        })
    ]);
}
