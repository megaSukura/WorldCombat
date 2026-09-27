/** Recycle only a real consumption receipt when the carried slot is empty; rank by what the item gives back and how safe it is to stop. */
namespace PokemonSkills {
    /** 恢复的这件东西此刻能救急吗：回血、解掉身上异常、或把某种能力抬起来。 */
    function recycleUsefulNow(context: WorldBehavior.Context, self: CompanionBehavior.Entity, berry: NativeItems.Berry | null): boolean {
        if (berry === null) return false;
        if (berry.heal > 0 && CompanionBehavior.ratio(self) < 0.95) return true;
        for (let i = 0; i < berry.cures.length; i++) if (CompanionBehavior.status(context, self, berry.cures[i])) return true;
        return !!berry.boost;
    }

    CompanionBehavior.registerUse("recycle", {
        protocols: ["world_combat:fortify"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (context.facts.mounted) return false;
            var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
            if (!actor) return false;
            if (!recycleEmptyHanded(world, actor)) return false;
            return !!recycleMemory(world, actor).id;
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        approachTarget: function (context: WorldBehavior.Context): WorldMethods.Subject { return CompanionBehavior.source(context); },
        // 不固定压过紧急行动：按恢复物的即时用途（回血／解异常／升能力／补一件能打的）与安全窗口排序。
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
            if (!actor) return 0;
            var self = CompanionBehavior.source(context), memory = recycleMemory(world, actor);
            var berry = memory.id ? NativeItems.berryOfItem(memory.id) : null;
            var threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            var ratio = CompanionBehavior.ratio(self);
            var urgentHeal = !!berry && berry.heal > 0 && ratio < 0.5;
            var score = 40;
            if (urgentHeal) score = 95;
            else if (!!berry && berry.heal > 0 && ratio < 0.75) score = 80;
            else if (berry !== null && recycleUsefulNow(context, self, berry) && berry.cures.length > 0) score = 75;
            else if (berry !== null && recycleUsefulNow(context, self, berry)) score = 60;
            else if (threat) score = 55;
            else score = 45;
            // 安全窗口：贴脸时停下来俯身很不划算，除非这口正好是保命回血。
            if (threat && !urgentHeal) {
                var distance = CompanionBehavior.distance(self.point, threat.point);
                if (distance <= 3) score = Math.min(score, 30);
                else if (distance <= 6) score = Math.min(score, 55);
            }
            return score;
        }
    });

    addPreferences("recycle", { ai: {} }, []);
}
