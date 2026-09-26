/**
 * 冤冤相报 / bittermalice 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 12）格内、到目标的射线畅通时；它是隔空招，
 *   不必贴脸，够不到交给共享接近逻辑。
 * 对谁出手：单个敌人；`ai.afflicted`（默认开）打开时优先已经带着异常的目标（纠缠式当场加倍）；
 *   `ai.devour`（默认开）决定怨念式下是否愿意吞掉敌人的异常——关闭时避开带异常的敌人，把异常留给队友的条件收益；
 *   `ai.wounded`（默认开）打开时，自身生命越低越愿意放（怨念随伤势加深）。
 * 够不到怎么办：reach 就是本招实际射程（施放距离）；够不到就先走近。
 * 放完之后：被攥住并被压低攻击的目标交回共享交战计划；怨念式顺手解掉了它的异常。
 */
namespace PokemonSkills {
    function bittermaliceStatused(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.status(context, target, "burn")
            || CompanionBehavior.status(context, target, "paralysis")
            || CompanionBehavior.status(context, target, "poison")
            || CompanionBehavior.status(context, target, "frozen")
            || CompanionBehavior.status(context, target, "sleep");
    }

    function bittermaliceWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    /** 到目标的直线是否畅通；有墙体遮挡时怨念之手半路会撞墙，AI 不该把它当成必中。同一决策帧内缓存。 */
    function bittermaliceLane(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "bittermalice:lane:" + target.ref, function () {
            const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            return world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        });
    }

    CompanionBehavior.registerUse("bittermalice", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return bittermaliceWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !bittermaliceWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 22 : 0;
            const grudge = !!(capability.data.config && capability.data.config.grudge === true);
            if (bittermaliceStatused(context, target)) {
                // 怨念式会吞掉异常：愿意吞就优先，想把异常留给队友就避开；纠缠式永远优先带异常者（当场加倍）。
                if (grudge && !CompanionBehavior.ai<boolean>(capability, "devour", true)) score -= 6;
                else if (CompanionBehavior.ai<boolean>(capability, "afflicted", true)) score += 12;
            }
            if (CompanionBehavior.ai<boolean>(capability, "wounded", true) && CompanionBehavior.ratio(self) < 0.5) score += 8;
            if (!bittermaliceLane(context, target)) score -= 12;
            return score;
        }
    });

    addPreferences("bittermalice", {}, [
        field(pathOf("grudge"), "怨念式", "boolean", {
            help: "开启：命中时吞掉目标身上一个主异常（灼伤／麻痹／中毒／冰冻／睡眠），换来威力 ×1.35、掉攻 2 级，代价是替对手解掉了那份异常、出手更慢。关闭（纠缠式）：保留异常，目标带异常时这一记 ×1.6，但掉攻只有 1 级。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "目标进入这个距离内才主动放怨念；越大越早出手，也越可能在飞行途中被走位躲开。"
        }),
        field(pathOf("ai.afflicted"), "优先带异常者", "boolean", {
            help: "开启：已经带着异常的敌人排得更前（纠缠式当场加倍）；关闭则只按普通交战排序。"
        }),
        field(pathOf("ai.wounded"), "残血更愿放", "boolean", {
            help: "开启：自身生命低于一半时更愿意放这一招（怨念随伤势加深，这一记更重）；关闭则不按自身血量加权。"
        }),
        field(pathOf("ai.devour"), "怨念式吞异常", "boolean", {
            help: "怨念式专属。开启：优先对带主异常的敌人出手，吞掉那份异常换 ×1.35 与掉攻 2 级；关闭：避开带异常的敌人，把异常留给队友的条件收益（只挑没异常的）。纠缠式不受此项影响。"
        })
    ]);
}
