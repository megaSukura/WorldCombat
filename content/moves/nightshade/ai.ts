/**
 * 黑夜魔影 / nightshade 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、活着，且在 `ai.maxChase` 之内。幻影自己会追向目标，因此它是本组唯一
 * 能在中远距离先手兑现的固定伤害；`ai.crowd`（默认 2）在目标身边聚着这么多敌人时把优先级抬到抢手，
 * 配合炸影式一次摊到一群。等级伤不看防御，所以对硬目标额外加一点分（`ai.bulwark`，默认 90，
 * 取其物防/特防的较高值），贴脸时让近身招式处理，它不抢。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("nightshade", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            const crowd = CompanionBehavior.ai<number>(capability, "crowd", 2);
            let around = 0;
            const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
            for (let index = 0; index < nearby.length; index++) {
                const other = nearby[index];
                if (other.ref === self.ref || other.friendly || other.health <= 0) continue;
                if (CompanionBehavior.distance(target.point, other.point) <= 2.5) around++;
            }
            if (around >= crowd) return 72;
            let score = distance > 3 ? 34 : 16;
            const stats = CompanionBehavior.combatStats(context, target);
            const wall = stats && stats.stats ? Math.max(Number(stats.stats.def) || 0, Number(stats.stats.spd) || 0) : 0;
            if (wall >= CompanionBehavior.ai<number>(capability, "bulwark", 90)) score += 14;
            return score;
        }
    });

    addPreferences("nightshade", {}, [
        field(pathOf("splash"), "炸影式", "boolean", {
            help: "开启：命中后在范围内爆开、波及周围最多几个敌人，但每一发伤害降到五成五、冷却更久；关闭：只打单体、伤害足额。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不放幻影，先走近；越大越会在更远处先手。"
        }),
        field(pathOf("ai.crowd"), "聚群阈值", "number", {
            min: 1, max: 5, step: 1,
            help: "目标身边聚着这么多敌人时，优先放这一记（配合炸影式一次摊到一群）；越大越只在密集处出手。"
        }),
        field(pathOf("ai.bulwark"), "硬目标门槛", "number", {
            min: 0, max: 200, step: 10,
            help: "目标的物防或特防达到这个数值时优先放这一记：等级伤不看防御，越硬的目标这一记越划算；设为 0 则始终享受加成。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为寻找射击位置离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
