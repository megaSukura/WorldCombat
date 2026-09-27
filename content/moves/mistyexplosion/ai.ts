namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_mistyexplosion/mist", (world, actor) => mistyexplosionInMist(world, actor));
    function mistyexplosionWilling(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.ratio(self) > CompanionBehavior.ai<number>(item, "cornered", .35)) return false;
        return (context.facts.nearby as CompanionBehavior.Entity[]).some(other =>
            other.ref !== self.ref && other.friendly && other.health > 0 && other.visible
            && CompanionBehavior.distance(self.point, other.point) <= 8);
    }
    function mistyexplosionCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = Math.min(item.data.range, CompanionBehavior.ai<number>(item, "maxChase", 6));
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function mistyexplosionWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 6);
    }

    CompanionBehavior.registerUse(mistyexplosionId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            if (capability.data.ready === false || context.facts.mounted || !mistyexplosionWilling(context, capability)) return false;
            const needed = CompanionBehavior.ratio(CompanionBehavior.source(context))
                <= CompanionBehavior.ai<number>(capability, "cornered", 0.35) ? 1 : CompanionBehavior.ai<number>(capability, "minFoes", 2);
            return mistyexplosionCount(context, capability) >= needed;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted || !mistyexplosionWilling(context, capability)) return false;
            if (!target) return true;
            return mistyexplosionWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !mistyexplosionWilling(context, capability) || !mistyexplosionWants(context, capability, target)) return 0;
            const count = mistyexplosionCount(context, capability);
            // Its low-health rescue window must run before the shared retreat decision.
            let base = 100 + Math.min(12, Math.max(0, count - 1) * 4);
            if (CompanionBehavior.fact<boolean>(context, "world_combat:move_mistyexplosion/mist", CompanionBehavior.source(context))) base += 8;
            return Math.min(120, base);
        }
    });

    addPreferences(mistyexplosionId, {}, [
        field(pathOf("denseMist"), "浓雾式", "boolean", {
            help: "开启（浓雾式）：残雾半径 ×1.3、停留 ×1.3、失准 +30 刻，但这一爆威力 ×0.92、起手 +3、冷却 +10——以较轻爆发换命中者更久的失准。关闭（薄爆式）：威力 ×1.08、残雾 ×0.8，炸得更脆更快。两种都需要完整牺牲，残雾只作淡去视效。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动凑上去引爆，先走近；它是一圈之内的牌。"
        }),
        field(pathOf("ai.minFoes"), "引爆人数", "number", {
            min: 1, max: 6, step: 1,
            help: "雾环半径内至少这么多可见、存活的目标才引爆；调大只在被围住时用，调 1 见一个也炸。"
        }),
        field(pathOf("ai.cornered"), "残血阈值", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自己生命低于这个比例时，引爆门槛放宽到 1 个目标；越高越早拼命。"
        })
    ]);
}
