/** Target selection follows each supported Pokémon or native-world branch and the configured chase policy. */
namespace PokemonSkills {
    /** 只读、决策内缓存：目标最近一次可折返的招式 id；空串表示没有。 */
    CompanionBehavior.registerFact("world_combat:mirrormove-last", function (access, actor, _argument) {
        return String(actor.domain()) !== "cobblemon" ? DamageSemantics.recentAttack(access, actor, p(mirrormoveId, "focus", access)) ? "native" : "" : mirrorRead(access, actor);
    });

    function mirrorPower(id: string): number {
        try { return CobblemonCombat.moveTemplate(id).power(); } catch (error) { return 0; }
    }

    CompanionBehavior.registerUse(mirrormoveId, {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
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
