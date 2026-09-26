/**
 * 仿效 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：附近（span 内）有一条仍在窗口内、已实装、可被仿效的出手；若那一手需要指向敌人，
 *   最近的威胁必须在 ai.maxChase 以内，否则回声打不到人，白花 PP。回复类自用招在满血时不复制，不做无用功。
 * 对谁出手：本招是 aim 型——玩家自己瞄准；AI 沿被借招式的用途给它目标：需要敌人的取其最近威胁，自用给自身。
 * 候选之间怎么排：捡到的是伤害类且威力不低时 priority 抬到 24；其余可捡的招按普通攻击排序（-6 兜底）。
 * 够不到怎么办：回声由 NativeLoadout.call 映射目标，够不到时那一手会自然失效；AI 先用 maxChase 收敛。
 * 放完接什么：交回共享交战计划；仿效不改变自身状态，下一轮重新看附近最新响起的声音。
 * 配置 deep（深回声）换取更长的记忆窗口与更密的回声，代价是更慢的起手与更长的冷却。
 */
namespace PokemonSkills {
    /** 借来的那一手是不是会给满血自己用的回复招；是的话这次复制没有收益。 */
    function copycatWasteful(context: WorldBehavior.Context, id: string): boolean {
        const skill = skills[id];
        if (!skill || skill.kind !== "self" && skill.kind !== "friend") return false;
        let heal = false;
        try { heal = !!NativeLoadout.facts(CobblemonCombat.moveTemplate(id)).flags.heal; } catch (error) { heal = false; }
        return heal && CompanionBehavior.ratio(CompanionBehavior.source(context)) >= 1;
    }

    /** 附近最新的一条合法回声；用本个体这次解析出的回荡距离筛掉远处战斗。 */
    function copycatEchoFor(context: WorldBehavior.Context, item: WorldBehavior.Capability): CopycatEcho | null {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const radius = Math.max(1, Number(item.data.range) || 1);
        return copycatCandidate(world, CompanionBehavior.point(self.point), radius);
    }

    CompanionBehavior.registerUse(copycatId, {
        protocols: ["world_combat:attack"],
        available: function (context, item) {
            const self = CompanionBehavior.source(context);
            if (!CompanionBehavior.pokemonFacts(context, self)) return false;
            if (CompanionBehavior.status(context, self, "sleep") || CompanionBehavior.status(context, self, "frozen")) return false;
            const echo = copycatEchoFor(context, item);
            if (echo === null) return false;
            const id = copycatReadable(CompanionBehavior.world(context), echo);
            if (id === "" || copycatWasteful(context, id)) return false;
            const kind = skills[id] ? skills[id].kind : "self";
            if (kind === "self" || kind === "friend") return true;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(item, "maxChase", 12);
        },
        priority: function (context, item) {
            const echo = copycatEchoFor(context, item);
            if (echo === null) return 0;
            const id = copycatReadable(CompanionBehavior.world(context), echo);
            if (id === "") return 0;
            const move = CobblemonCombat.moveTemplate(id);
            return String(move.category()) !== "status" && move.power() >= 60 ? 24 : -6;
        }
    });

    addPreferences(copycatId, {}, [
        flag("deep", "深回声"),
        number("ai.maxChase", "回声距离", 3, 26, 1),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
