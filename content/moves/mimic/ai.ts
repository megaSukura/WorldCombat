/**
 * 模仿 / mimic —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，在 `ai.maxChase`（默认 10）格内，有一条通视念线。挂在共享的 control 位上：
 *   模仿不抢攻击位置，但读到值得的招时主动插进来。
 * 对谁出手：读目标上一手（决策内缓存）。那一手是伤害类且威力不低时 priority 抬到 46；其他可借的招 18；还没有上一手时 12。
 * 注意：是否「有可模仿的上一手」由提交前的 ready 校验，不放进 available——否则对手还没出手时伙伴会以为无招
 *   可用而退开，模仿就等不到可借那一刻。伙伴照常贴近、反复尝试，对手一出过手就牵线。
 * 够不到怎么办：射程交给 reach，共享任务把身位收进通视射程后再牵线。
 * 放完接什么：目标的那一手已经织进自己的招式格，交回共享交战计划继续；下一轮它就能像自己的招一样打出去。
 * 配置 deep（细学）换取更长的记忆窗口与维持时长，代价是更慢的起手与更长的冷却。
 */
namespace PokemonSkills {
    /** 只读、决策内缓存：目标上一手是否可被模仿；返回招式 id 或 ""。 */
    CompanionBehavior.registerFact("world_combat:mimic-last", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return "";
        const state = NativeEffects.read(access, actor);
        if (!state.used || !skills[state.used]) return "";
        if (NativeLoadout.facts(CobblemonCombat.moveTemplate(state.used)).flags.failmimic) return "";
        return state.used;
    });
    /** 只读、决策内缓存：施法者是否已经拥有某一手（参数为招式 id）。 */
    CompanionBehavior.registerFact("world_combat:mimic-knows", function (access, actor, id) {
        return String(actor.domain()) === "cobblemon" && mimicKnows(access, CobblemonCombat.pokemon(actor), String(id));
    });

    CompanionBehavior.registerUse("mimic", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            const self = CompanionBehavior.source(context);
            if (context.facts.focus !== target.ref
                && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 10)) return false;
            if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
            return true;
        },
        accepts: function (_context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const id = CompanionBehavior.fact<string>(context, "world_combat:mimic-last", target);
            if (!id) return 12;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.fact<boolean>(context, "world_combat:mimic-knows", self, id)) return 4;
            const move = CobblemonCombat.moveTemplate(id);
            return String(move.category()) !== "status" && move.power() >= 60 ? 46 : 18;
        }
    });

    addPreferences("mimic", {}, [
        field(pathOf("deep"), "细学", "boolean", {
            help: "开启：记忆窗口 ×1.6、维持时长 ×1.35，能读到更早的出手、借来的招留得更久，但起手更慢、冷却 ×1.4；关闭：抢学，读写都快，记忆窗口与维持时长较短。"
        }),
        field(pathOf("ai.maxChase"), "模仿距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动牵念线，先走近；越大越愿意从远处先借一招。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为模仿离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
