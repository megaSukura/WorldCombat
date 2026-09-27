/** Uses the actual owner roster, independent of where the individual fainted; picks a window it can finish safely. */
namespace CompanionBehavior {
    /** 附近有正贴身、可见的敌人时不祈祷——跪着做完只会挨打。 */
    function revivalblessingSafeWindow(context: WorldBehavior.Context): boolean {
        const self = source(context);
        const nearby = context.facts.nearby as Entity[];
        const threat: Entity | null = context.senses["world_combat:threat"];
        if (threat && ratio(self) < 0.4) return false;
        return !nearby.some(other => !other.friendly && other.visible && other.health > 0
            && (other.hostile || other.attacking === self.ref || !!threat && other.ref === threat.ref)
            && distance(self.point, other.point) <= 4);
    }
    registerUse("revivalblessing", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            if (ai<boolean>(capability, "combatOnly", false) && !context.senses["world_combat:threat"]) return false;
            if (!revivalblessingSafeWindow(context)) return false;
            const reach = typeof capability.data.range === "number" && capability.data.range > 0 ? capability.data.range : 6;
            const access = world(context), actor = access.actor(source(context).ref);
            return !!actor && !!PokemonSkills.revivalblessingMember(access, actor, reach);
        },
        accepts: function (context, _capability, target) {
            return String(target.ref) === String(source(context).ref);
        },
        approachTarget: function (context) { return source(context); },
        priority: function (context) {
            // 不再是固定高权：自己进入危险区时让自救类目标优先，只有站得住时才值得跪祷。
            const health = ratio(source(context));
            if (health < 0.4) return 0;
            return 50 + Math.round(health * 10);
        }
    });

    const revivalblessingCombat = PokemonSkills.flag("ai.combatOnly", "只在交战中祈祷");
    revivalblessingCombat.help = "开启：只在自己正面对威胁时才会为倒下的伙伴祈祷；关闭（默认）：看到伙伴倒下就回应，哪怕暂时脱战。";

    PokemonSkills.addPreferences("revivalblessing", {}, [revivalblessingCombat]);
}
