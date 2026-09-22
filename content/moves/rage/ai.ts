/**
 * 愤怒 / rage 的伙伴 AI 用途。
 *
 * 什么局面下出手：有可见的敌对威胁、在 `ai.maxChase`（默认 7）格内，自己身上还没有怒火（有火时不重复开火），
 *   且生命高于 `ai.healthFloor`（默认 35%%）——火要靠挨打才旺，半条命以下再开就是送。它是先手的自我强化：
 *   伙伴会先把火点上，再迎着对手换血。
 * 对谁出手：当前威胁；若那矛头正对着自己（`attacking` 是自己）就排到前面——那正是「马上要挨打」的时机。
 * 够不到怎么办：射程由 `blink` 决定，共享任务把身位收进距离后再抡这一记。
 * 放完之后：火已经点着，交回共享交战计划、正常对拼，每一记挨打都在涨攻。
 */
namespace PokemonSkills {
    function rageWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.status(context, self, "rage")) return false;
        if (CompanionBehavior.ratio(self) * 100 < CompanionBehavior.ai<number>(item, "healthFloor", 35)) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(self.point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse(rageId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "rage")) return false;
            if (CompanionBehavior.ratio(self) * 100 < CompanionBehavior.ai<number>(capability, "healthFloor", 35)) return false;
            return !target || rageWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !rageWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            return target.attacking === self.ref ? 44 : 16;
        }
    });

    addPreferences(rageId, {}, [
        field(pathOf("fury"), "暴怒式", "boolean", {
            help: "开启：每挨一记涨 2 档攻击，但一次只封顶 4 档、火更短、起手慢 2 刻、冷却多 4 刻——两记就烧满，窗口也短。关闭：每记涨 1 档、封顶 6 档、火更长、出手更快，靠时间慢慢烧旺。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手离自己这么远以内才主动开火；本招欺身距离短，调大也常要靠近后才用得上。"
        }),
        field(pathOf("ai.healthFloor"), "开火下限", "number", {
            min: 10, max: 100, step: 5,
            help: "自身生命高于这个百分比才开火——火要靠挨打才旺，生命太低时开火风险大。调低更敢在残血时赌一把，调高则只在状态好时强化。"
        })
    ]);
}
