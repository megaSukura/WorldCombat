/** Target selection follows each supported Pokémon or native-world branch and the configured chase policy. */
namespace PokemonSkills {
    /** 只读、决策内缓存：目标上一手是否可被描摹；返回招式 id 或 ""。 */
    CompanionBehavior.registerFact("world_combat:sketch-last", function (access, actor, _argument) {
        return sketchRead(access, actor);
    });
    /** 只读、决策内缓存：施法者是否已经拥有某一手（参数为招式 id）。 */
    CompanionBehavior.registerFact("world_combat:sketch-knows", function (access, actor, id) {
        return String(actor.domain()) === "cobblemon" && sketchKnows(access, CobblemonCombat.pokemon(actor), String(id));
    });

    CompanionBehavior.registerUse("sketch", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            const self = CompanionBehavior.source(context);
            if (context.facts.focus !== target.ref
                && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
            if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
            const id = CompanionBehavior.fact<string>(context, "world_combat:sketch-last", target);
            if (!id) return true;
            if (CompanionBehavior.fact<boolean>(context, "world_combat:sketch-knows", self, id)) return false;
            const info = CobblemonCombat.moveTemplate(id);
            if (String(info.category()) === "status") return true;
            return info.power() >= CompanionBehavior.ai<number>(capability, "minPower", 50);
        },
        accepts: function (_context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const id = CompanionBehavior.fact<string>(context, "world_combat:sketch-last", target);
            if (!id) return 12;
            const info = CobblemonCombat.moveTemplate(id);
            if (String(info.category()) === "status") return 45;
            return info.power() >= 80 ? 70 : info.power() >= 50 ? 45 : 25;
        }
    });

    addPreferences("sketch", {}, [
        field(pathOf("ai.minPower"), "描摹威力门槛", "number", {
            min: 0, max: 150, step: 5,
            help: "伤害类招式威力低于这个值就不落笔（状态类招式不受限制）。写生只有一次机会，调高只在读到真正的好招时才用。"
        }),
        field(pathOf("ai.maxChase"), "描摹距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动落笔，先走近；越大越愿意从远处先描一手。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为描摹离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
