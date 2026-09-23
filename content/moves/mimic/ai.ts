/** Target selection follows each supported Pokémon or native-world branch and the configured chase policy. */
namespace PokemonSkills {
    /** 只读、决策内缓存：目标上一手是否可被模仿；返回招式 id 或 ""。 */
    CompanionBehavior.registerFact("world_combat:mimic-last", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return copiedNativeMove(access, actor);
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
