/**
 * 仿效 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：账本里有一条仍在窗口内、已实装、可被仿效的出手；若那一手需要指向敌人，
 *   最近的威胁必须在 ai.maxChase 以内，否则回声打不到人，白花 PP。
 * 对谁出手：本招是 self 型——原地重复那一手；目标由 borrowed 招式自己的类型决定。
 * 候选之间怎么排：捡到的是伤害类且威力不低时 priority 抬到 24；其余可捡的招按普通攻击排序（-6 兜底）。
 * 够不到怎么办：回声由 NativeLoadout.call 映射目标，够不到时那一手会自然失效；AI 先用 maxChase 收敛。
 * 放完接什么：交回共享交战计划；仿效不改变自身状态，下一轮重新看场上最后响起的声音。
 * 配置 deep（深回声）换取更长的记忆窗口与更密的回声，代价是更慢的起手与更长的冷却。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(copycatId, {
        protocols: ["world_combat:attack"],
        available: function (context, item) {
            const self = CompanionBehavior.source(context);
            if (!CompanionBehavior.pokemonFacts(context, self)) return false;
            if (CompanionBehavior.status(context, self, "sleep") || CompanionBehavior.status(context, self, "frozen")) return false;
            const world = CompanionBehavior.world(context);
            const echo = copycatReadable(world, copycatLedger);
            if (!echo) return false;
            const kind = skills[echo] ? skills[echo].kind : "self";
            if (kind === "self" || kind === "friend") return true;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(item, "maxChase", 12);
        },
        priority: function (context) {
            const echo = copycatReadable(CompanionBehavior.world(context), copycatLedger);
            if (!echo) return 0;
            const move = CobblemonCombat.moveTemplate(echo);
            return String(move.category()) !== "status" && move.power() >= 60 ? 24 : -6;
        }
    });

    addPreferences(copycatId, {}, [
        flag("deep", "深回声"),
        number("ai.maxChase", "回声距离", 3, 26, 1),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
