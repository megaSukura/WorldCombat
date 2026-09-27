/**
 * 喷烟 / lavaplume 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、向上竖喷的烟柱，威胁正上方与贴身空间。`available` 要求有可见、敌对、存活
 *   且落在 `ai.maxChase`（默认 8）格内的目标；`ai.lofted` 打开时，目标真的落在**本个体当前的柱体**里（水平半径、
 *   顶棚截断后的实际高度与真实通路都算过）才抬高 priority；高大的 Boss 近身也略优先。它不看水平方向的成片敌群，
 *   因为柱子的横向范围有限。目标还没被烧着、且不是原生免火时略优先。
 * 够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    /** 原生免火事实：真实实体方法，不是推断；取不到就按不免火处理。 */
    function lavaplumeFireImmune(world: CombatWorld, ref: string): boolean {
        const actor = world.actor(ref);
        if (actor === null) return false;
        const native = world.nativeEntity(actor);
        return native !== null && typeof native.fireImmune === "function" && native.fireImmune() === true;
    }

    function lavaplumeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }

    /** 目标是否真的落在本个体当前的柱体里：水平半径、顶棚截断后的实际高度与真实通路三者都过。 */
    function lavaplumeReachable(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const self = CompanionBehavior.point(CompanionBehavior.source(context).point);
        let radius = typeof item.data.range === "number" && isFinite(item.data.range) ? item.data.range : 3.2, height = 1.6;
        try {
            const values = { world: world, actor: world.source(), detail: { values: item.data.config } };
            radius = Math.max(2.2, p("lavaplume", "ringRadius", values));
            height = Math.max(1.0, p("lavaplume", "plumeHeight", values));
        } catch (error) { }
        // 真实顶棚把它截断在下面，超出截断高度的人烧不到。
        const ceilingHit = WorldGeometry.blockHit(world, self, self.plus(WorldCombat.point(0, height + 0.2, 0)));
        const reach = ceilingHit !== null ? Math.max(0.6, ceilingHit.position().y() - self.y()) : height;
        const to = CompanionBehavior.point(target.point), delta = to.minus(self);
        if (Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z()) > radius) return false;
        if (delta.y() < -0.5 || delta.y() > reach) return false;
        return WorldGeometry.blockHit(world, self, to) === null;
    }

    CompanionBehavior.registerUse("lavaplume", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return lavaplumeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !lavaplumeWants(context, capability, target)) return 0;
            var base = 18;
            const world = CompanionBehavior.world(context);
            if (!lavaplumeFireImmune(world, target.ref) && !CompanionBehavior.status(context, target, "burn")) base += 6;
            if (CompanionBehavior.ai<boolean>(capability, "lofted", true) && lavaplumeReachable(context, capability, target)) base += 14;
            var height = typeof target.height === "number" ? target.height : 1.4;
            if (height >= 2.0) base += 8;
            return base;
        }
    });

    addPreferences("lavaplume", {}, [
        field(pathOf("fume"), "浓烟式", "boolean", {
            help: "开启：烟柱约少 12%%，但同一根柱内留下一层余热，反复烫没走开的人，冷却 +10 刻，用来封住你的正上方与脚边。关闭：一发更重的烟柱、没有余热，冷却更短，用来打疼贴身与低空的敌人。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动靠近，先在烟柱射程外待命。越大越愿意先朝目标接近再喷。"
        }),
        field(pathOf("ai.lofted"), "对空优先", "boolean", {
            help: "开启后，目标真的落在本个体当前柱体里（算过水平半径、顶棚截断后的实际高度与真实通路）时优先喷烟，高大的 Boss 近身也略优先；关闭则只按普通攻击排序。"
        })
    ]);
}
