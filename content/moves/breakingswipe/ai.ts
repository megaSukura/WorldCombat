/**
 * 广域破坏 / breakingswipe 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在扫击半径（`capability.data.range`）内；够不到交给共享接近逻辑，
 *   把身位收进去再甩尾。
 * 对谁出手：一个目标定方向，扫到的是它周围那片扇里的人；`ai.cluster`（默认开）打开时，用本个体**实际
 *   resolve 出的半径与张角**、逐人真实通视，数出这道真实扇面里还会被一起压低的敌人——一次能压低多人。
 * 够不到怎么办：交给共享接近逻辑；进不到半径内就先不扫。
 * 放完之后：被掀开并被压低攻击的一圈人交回共享交战计划；已经降到 -6 级攻击的目标排后。
 */
namespace PokemonSkills {
    /** 本次决策读出的真实扫击半径与张角；同一决策帧只算一次。 */
    function breakingswipeParams(context: WorldBehavior.Context, capability: WorldBehavior.Capability): { radius: number; arc: number } {
        const cached = context.scratch.breakingswipeParams;
        if (cached !== undefined) return cached;
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const actor = world.actor(self.ref);
        let radius = typeof capability.data.range === "number" ? capability.data.range : 3.5;
        let arc = capability.data.config && capability.data.config.wide === true ? 235 : 130;
        if (actor) {
            try {
                const read = { world: world, actor: actor, skill: skills["breakingswipe"], detail: { values: capability.data.config || {} } };
                radius = Math.max(1, p("breakingswipe", "radius", read));
                arc = Math.max(80, Math.min(320, p("breakingswipe", "arc", read)));
            } catch (error) { }
        }
        const result = { radius: radius, arc: arc };
        context.scratch.breakingswipeParams = result;
        return result;
    }

    function breakingswipeWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    /** 落在自身→目标所朝的那道真实扇面里、通视可达的敌人个数（含目标）。 */
    function breakingswipeCluster(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const params = breakingswipeParams(context, capability);
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const from = CompanionBehavior.point(self.point);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return 1;
        const hx = dx / length, hz = dz / length, halfArc = params.arc * Math.PI / 360;
        function inSector(other: CompanionBehavior.Entity): boolean {
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const distance = Math.sqrt(ox * ox + oz * oz);
            if (distance < 0.01 || distance > params.radius + 0.5) return false;
            if (Math.abs(Math.atan2(hx * oz - hz * ox, hx * ox + hz * oz)) > halfArc) return false;
            return WorldGeometry.blockHit(world, from, CompanionBehavior.point(other.point)) === null;
        }
        let count = inSector(target) ? 1 : 0;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (inSector(other)) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("breakingswipe", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return breakingswipeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !breakingswipeWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 20 : 0;
            // 已经降到 -6 级的目标再扫也降不动，压低这一记。
            if (CompanionBehavior.stage(context, target, "atk") <= -6) score = Math.round(score * 0.4);
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true) && !target.friendly && breakingswipeCluster(context, capability, target) >= 2) score += 16;
            return score;
        }
    });

    addPreferences("breakingswipe", {}, [
        field(pathOf("wide"), "广域式", "boolean", {
            help: "开启：扇形张角拉到 235°、半径 ×1.12，一次罩住一片人；代价是威力 ×0.85、起手 +2 刻、冷却 +8 刻。关闭（聚扫式）：威力 ×1.12，打得更重，但只扫到身前一道。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "目标进入这个距离内才主动甩尾；越大越早扫，但还没收进身位时容易扫空。"
        }),
        field(pathOf("ai.cluster"), "瞄准扎堆", "boolean", {
            help: "开启：目标所在的真实扇面里还有别的通视敌人时排得更前，一次压低多人；关闭则只按普通交战排序。"
        })
    ]);
}
