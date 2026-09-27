/**
 * 重踏 / bulldoze 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身脚底为中心、只打同层连续实地的近距扫场。`available` 要求施法者自己站在地上、
 * 有可见、敌对、存活且落在 `ai.maxChase`（默认 7）格内的目标；空中的对手扫不到，因此低优先。
 * 排序按**实际能到的接地人数**：`ai.cluster` 打开时，自己真实地震半径内站着 2 个以上、站在地上且与施法者
 * 同层连续实地的敌人就抬高 priority（用与判定同一个 `bulldozeGroundLink`，悬台/另一楼层不计）。
 * 对手跑得越快，削这一脚速度越值。够不到交给共享接近逻辑；走到气场半径以内就原地踏下。
 */
namespace PokemonSkills {
    /** 本个体这一招的真实地震半径；AI 人数门槛与指示圈、判定圈同源。 */
    function bulldozeRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(1.8, p("bulldoze", "waveRadius",
                { world: world, actor: world.source(), skill: skills["bulldoze"], detail: { values: item.data.config || {} } }));
        } catch (error) {
            return typeof item.data.range === "number" && isFinite(item.data.range) ? item.data.range : 3.4;
        }
    }

    /** 施法者脚面下的真实支撑点；AI 的波段与判定的波段同源。 */
    function bulldozeCentre(context: WorldBehavior.Context, self: CompanionBehavior.Entity): CombatPoint {
        const world = CompanionBehavior.world(context);
        const feet = CompanionBehavior.point([self.point[0], self.point[1] - (self.height || 1.4) / 2, self.point[2]]);
        return SurfacePaths.support(world, feet, 0.6, 3) || feet;
    }

    function bulldozeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    /** 真实地震半径内、站在地上、且与施法者同层连续实地的敌人数；空中、悬台与另一楼层不计。 */
    function bulldozeReachable(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const world = CompanionBehavior.world(context);
        const centre = bulldozeCentre(context, self);
        const radius = bulldozeRadius(context, item);
        const band = WorldGeometry.ring(centre, 0, radius, { below: 2, above: 3 });
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible || other.grounded === false) continue;
            const point = CompanionBehavior.point(other.point);
            if (!band.contains(point)) continue;
            const feet = CompanionBehavior.point([other.point[0], other.point[1] - (other.height || 1.4) / 2, other.point[2]]);
            if (!bulldozeGroundLink(world, centre, feet)) continue;
            count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("bulldoze", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return bulldozeRadius(context, capability); },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (context.facts.self.grounded === false) return false;
            if (!target) return true;
            return bulldozeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !bulldozeWants(context, capability, target)) return 0;
            var base = 16;
            // 空中的目标不在这一圈的判定里：能放但基本扫空，留作最后手段。
            if (target.grounded === false) base = 4;
            else if (CompanionBehavior.ai<boolean>(capability, "cluster", true)) {
                var around = bulldozeReachable(context, capability);
                if (around >= 2) base += Math.min(20, (around - 1) * 8);
            }
            var speed = target.velocity ? Math.sqrt(target.velocity[0] * target.velocity[0] + target.velocity[2] * target.velocity[2]) : 0;
            if (speed > 0.1) base += Math.min(12, Math.round(speed * 40));
            return base;
        }
    });

    addPreferences("bulldoze", {}, [
        field(pathOf("deep"), "深踏式", "boolean", {
            help: "开启：地裂收窄、单次更重、多降一级速度，起手与冷却更长，用来砸单个硬目标。关闭：震得更广、出手更快，适合一次扫一片、追跑得快的对手。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动踏入人堆，先朝目标走近。越大越愿意先接近再踏。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，自己真实地震半径内、与自己同层实地相连的落地敌人有 2 个以上时优先重踏，一次震住脚边一圈；关闭则只按普通攻击排序。"
        })
    ]);
}
