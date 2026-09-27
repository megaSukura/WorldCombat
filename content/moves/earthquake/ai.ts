/**
 * 地震 / earthquake 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、只掀地面的重扫场。`ready` 要求**实际波及半径**内至少站着
 * `ai.minFoes`（默认 2）个可见、敌对、存活、**站在地上**、且与施法者同层连续实地的目标——地震是拿来一次
 * 罩住一圈人的，只对着一个目标掀地不划算。人数门槛读本个体算出的 `fissureRadius`，不是追击距离。
 * `ai.maxChase`（默认 8）只管考虑距离，决定愿不愿意先追进去。`available` 还要求目标本身站在地上；
 * 空中的对手不在目标里，AI 不会为它转身。够不到交给共享接近逻辑；走到波及半径以内就原地砸下。
 */
namespace PokemonSkills {
    /** 本个体这一招的真实波及半径；AI 人数门槛与指示圈、判定圈同源。 */
    function earthquakeRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        return Math.max(2.8, p("earthquake", "fissureRadius",
            { world: world, actor: world.source(), skill: skills["earthquake"], detail: { values: item.data.config } }));
    }

    /** 施法者脚面下的真实支撑点；AI 的波段与判定的波段同源。 */
    function earthquakeCentre(context: WorldBehavior.Context, self: CompanionBehavior.Entity): CombatPoint {
        const world = CompanionBehavior.world(context);
        const feet = CompanionBehavior.point([self.point[0], self.point[1] - (self.height || 1.4) / 2, self.point[2]]);
        return SurfacePaths.support(world, feet, 0.6, 3) || feet;
    }

    /** 实际波及半径内、站在地上、且与施法者同层连续实地的敌人数；悬台/另一楼层不计。 */
    function earthquakeCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const world = CompanionBehavior.world(context);
        const centre = earthquakeCentre(context, self);
        const band = WorldGeometry.ring(centre, 0, earthquakeRadius(context, item), { below: 2, above: 3 });
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible || other.grounded === false) continue;
            const point = CompanionBehavior.point(other.point);
            if (!band.contains(point)) continue;
            if (!earthquakeGroundLink(world, centre, point)) continue;
            count++;
        }
        return count;
    }

    function earthquakeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (target.grounded === false) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }

    CompanionBehavior.registerUse("earthquake", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false && earthquakeCount(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 2);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return earthquakeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && target.grounded !== false;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !earthquakeWants(context, capability, target)) return 0;
            let base = 18;
            const count = earthquakeCount(context, capability);
            if (count >= 3) base += Math.min(26, (count - 2) * 8);
            if (context.facts.mounted) base = 0;
            return base;
        }
    });

    addPreferences("earthquake", {}, [
        field(pathOf("aftershock"), "余震式", "boolean", {
            help: "开启：主震威力约 ×0.86、起手与冷却更长，但主震后约 1 秒再掀一次半威力的余震，还没站稳的人会再挨一下，用来啃血厚站桩的目标。关闭（单震式）：主震约 ×1.15、立刻结清，用来掀脆皮或必须马上收手的时候。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑地震；调小只在贴身掀地，调大愿意先追进去。"
        }),
        field(pathOf("ai.minFoes"), "掀地人数", "number", {
            min: 1, max: 6, step: 1,
            help: "波及圈内至少站着这么多可见、站在地上的敌人才掀地；调大只被围住时用，调 1 见一个也掀。"
        })
    ]);
}
