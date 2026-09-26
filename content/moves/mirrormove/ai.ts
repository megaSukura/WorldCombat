/** Target selection follows each supported Pokémon or native-world branch and the configured chase policy. */
namespace PokemonSkills {
    function mirrormoveNativeReach(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const scope = CompanionBehavior.world(context), threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
        const target = threat && scope.actor(threat.ref);
        if (!target || String(target.domain()) === "cobblemon") return item.data.range;
        const replay = NativeAttackProjection.recent(scope, target, 1200);
        return replay ? Math.min(item.data.range, NativeAttackProjection.reach(scope, scope.source(), replay)) : item.data.range;
    }

    /** 只读、决策内缓存：目标最近一次可折返的招式 id；空串表示没有。 */
    CompanionBehavior.registerFact("world_combat:mirrormove-last", function (access, actor, _argument) {
        return String(actor.domain()) !== "cobblemon" ? NativeAttackProjection.recent(access, actor, p(mirrormoveId, "focus", access)) ? "native" : "" : mirrorRead(access, actor);
    });

    function mirrorPower(id: string): number {
        try { return CobblemonCombat.moveTemplate(id).power(); } catch (error) { return 0; }
    }

    CompanionBehavior.registerUse(mirrormoveId, {
        protocols: ["world_combat:attack"],
        reach: mirrormoveNativeReach,
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return false;
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            const self = CompanionBehavior.source(context);
            if (context.facts.focus !== target.ref
                && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
            if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
            return !!CompanionBehavior.fact<string>(context, "world_combat:mirrormove-last", target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, _item, target) {
            if (!target) return 0;
            const id = CompanionBehavior.fact<string>(context, "world_combat:mirrormove-last", target);
            if (!id) return 0;
            const power = mirrorPower(id);
            return power >= 60 ? 46 : 26;
        }
    });

    addPreferences(mirrormoveId, {}, [
        flag("keen", "锐镜"),
        number("ai.maxChase", "还手距离", 3, 22, 1),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
