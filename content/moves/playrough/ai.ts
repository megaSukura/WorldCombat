/**
 * 嬉闹 / playrough —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 8）格内；够不到交给共享接近逻辑。
 * 它是近身接触招，要先把身位收进去。
 * 对谁出手：`ai.cluster`（默认开）且当前是撒欢式时，目标身边 `bounceRange` 内还挤着一个同高、无遮挡、自己也够得到的
 *   敌人，就优先出手——撒欢式能顺势转身撞第二个；不是撒欢式不加这个群体分。`ai.finish`（默认开）时残血目标排前。
 * 够不到怎么办：reach 就是本招实际射程（扑撞距离 + 余量），先走近。
 * 放完之后：被顶开的目标与降攻交回共享交战计划；如果翻到了第二个，它也会带着降攻的可能。
 */
namespace PokemonSkills {
    /** 本个体这一次真实的翻身范围；读不到时退回公式中点。 */
    function playroughBounceRange(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        try {
            const world = CompanionBehavior.world(context);
            const value = p(playroughId, "bounceRange", { world: world, actor: world.source(), detail: { values: capability.data.config } });
            if (isFinite(value) && value > 0) return value;
        } catch (error) { }
        return 3.2;
    }

    /** 第二个目标是否真的翻得过去：同高、在翻身范围内、中间无遮挡。 */
    function playroughReachable(context: WorldBehavior.Context, capability: WorldBehavior.Capability,
        target: CompanionBehavior.Entity, other: CompanionBehavior.Entity): boolean {
        if (Math.abs(other.point[1] - target.point[1]) > 1.5) return false;
        if (CompanionBehavior.distance(target.point, other.point) > playroughBounceRange(context, capability)) return false;
        try { return CompanionBehavior.world(context).clear(CompanionBehavior.point(target.point), CompanionBehavior.point(other.point)); }
        catch (error) { return false; }
    }

    function playroughWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    CompanionBehavior.registerUse(playroughId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return playroughWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !playroughWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const romp = !!(capability.data.config && capability.data.config.romp === true);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 20 : 0;
            // 群体收益只在撒欢式成立，而且第二个目标要真的同高、无遮挡、翻得过去、自己也够得到。
            if (romp && CompanionBehavior.ai<boolean>(capability, "cluster", true)) {
                const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref || other.ref === self.ref) continue;
                    if (!playroughReachable(context, capability, target, other)) continue;
                    if (CompanionBehavior.distance(other.point, self.point) > capability.data.range) continue;
                    score += 12;
                    break;
                }
            }
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 8);
            return score;
        }
    });

    addPreferences(playroughId, {}, [
        field(pathOf("romp"), "撒欢", "boolean", {
            help: "开启：扑得更远、滚得更快、顶得更开、翻身范围更大、起手与冷却更短，第一下更轻、顺势转身那一下略重、合计与实撞相近，降攻概率更低；关闭（实撞）：更短的一撞，第一下更重、转身那一下略轻、合计相近，更容易把对手撞得攻击下降。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 14, step: 1,
            help: "超过这个距离就不主动扑上去，先走近；越大越愿意从稍远处起蹦。"
        }),
        field(pathOf("ai.cluster"), "瞄准扎堆", "boolean", {
            help: "开启：当前为撒欢式、且目标身边有另一个同高、无遮挡、翻得过去的敌人时优先出手；关闭或实撞式只按普通近战排序。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前；关闭则只按普通近战排序。"
        })
    ]);
}
