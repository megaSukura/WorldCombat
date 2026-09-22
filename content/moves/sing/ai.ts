/**
 * 唱歌 的伙伴 AI 用途：这招自己的一套出手计划——把自己送进人堆，再开口唱。
 *
 * 什么局面有意义：有可见威胁、且以自己为圆心、声场半径内至少站着 ai.minFoes 个还醒着的非友方。
 *   站着的人越多越值得唱；如果圈里的人都睡着了就不再开口。它是一件持续的事，唱的时候自己站定不动，
 *   所以只在能一次罩住几个人时才用。
 * 对谁出手：当前威胁；声场跟着自己走，所以伙伴会先走进/等对方进入声场。
 * 够不到怎么办：reach 就是声场半径，由共享任务把身体带到够得到的位置；accepts 不按距离硬拒。
 * 放完之后：圈里还醒着的人各记一分睡意、够数的当场睡下；伙伴交回共享顺序，可以转火还没睡的目标。
 * 优先级：基础 45；圈里每多一个醒着的非友方 +7，最高 85。
 */
namespace PokemonSkills {
    /** 与参数公式同源的声场半径估算（AI 读不到特攻，只用等级；实际命中仍走招式自己的公式）。 */
    function singFieldRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const facts = CompanionBehavior.pokemonFacts(context, CompanionBehavior.source(context));
        const level = facts && typeof facts.level === "number" ? facts.level : 30;
        const soothing = !!(item.data.config && item.data.config.soothing);
        return Math.max(3, Math.min(8, (4.5 + Math.max(0, level - 30) * 0.06 + 0.3) * (soothing ? 0.85 : 1.15)));
    }

    /** 声场里还醒着的非友方数量。 */
    function singAwakeFoes(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, centre) > radius) continue;
            if (CompanionBehavior.status(context, other, "sleep")) continue;
            count++;
        }
        return count;
    }

    function singWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        return singAwakeFoes(context, self.point, singFieldRadius(context, item)) >= CompanionBehavior.ai<number>(item, "minFoes", 1);
    }

    CompanionBehavior.registerUse(singId, {
        protocols: ["world_combat:control"],
        reach: function (context, item) { return singFieldRadius(context, item); },
        available: function (context, item, purpose, target) { return !target || singWants(context, item, target); },
        accepts: function (context, item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (context, item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !singWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            const awake = singAwakeFoes(context, self.point, singFieldRadius(context, item));
            return Math.min(85, 45 + awake * 7);
        }
    });

    addPreferences(singId, { ai: { minFoes: 1, leaveStation: false } }, [
        field(pathOf("ai.minFoes"), "开口人数", "number", {
            min: 1, max: 5, step: 1,
            help: "声场里至少站着这么多还醒着的非友方才开口；调 1 表示身边有醒着的人就唱，调高则等人聚齐再唱。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会为唱歌离开原位；关闭则只在原地够得到时开口。"
        })
    ]);
}
