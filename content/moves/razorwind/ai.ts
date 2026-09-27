/**
 * 旋风刀 / razorwind 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 14）格以内、又不近于 `ai.minRange`（默认 4）格——
 *   蓄力期间站定不动，贴脸时先拉开再蓄。自己与目标之间视线要通，否则一扇甩进墙里。
 *   **近身受压**（任一可见敌人贴到 `ai.minRange` 以内）时压低这一记——安全后排对成片敌人才值得长蓄风。
 * 对谁出手：`ai.cluster`（默认开）打开时，用本个体**实际 resolve 出的扇面半角与射程**、逐人真实通视，
 *   数出这一扇实际罩得住几个，并按蓄风时长外推目标的预计位置；最值的时候是把成排的敌人一起切到。
 * 优先级：扫到 3 个以上抬价，2 个中等；目标贴到最近起手距离以内时压价，避免站着挨打断。
 * 放完之后：交回共享交战计划；它是一记范围远程，不负责收尾。
 */
namespace PokemonSkills {
    /** 本次决策读出的真实射程、扇面半角、蓄风刻数与风刃上限；同一决策帧只算一次。 */
    function razorwindParams(context: WorldBehavior.Context, capability: WorldBehavior.Capability): { reach: number; fan: number; charge: number; blades: number } {
        const cached = context.scratch.razorwindParams;
        if (cached !== undefined) return cached;
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const actor = world.actor(self.ref);
        let reach = typeof capability.data.range === "number" ? capability.data.range : 8;
        let fan = 42, charge = 20, blades = 6;
        if (actor) {
            try {
                const read = { world: world, actor: actor, skill: skills[razorwindId], detail: { values: capability.data.config || {} } };
                reach = Math.max(2, p(razorwindId, "reach", read));
                fan = p(razorwindId, "fan", read);
                charge = p(razorwindId, "chargeTicks", read);
                blades = Math.round(p(razorwindId, "blades", read));
            } catch (error) { }
        }
        const result = { reach: reach, fan: Math.max(10, fan), charge: Math.max(0, Math.round(charge)), blades: Math.max(1, Math.round(blades)) };
        context.scratch.razorwindParams = result;
        return result;
    }

    /** 正前方真实扇面内、逐人通视的可见敌人数量；按蓄风时长外推目标的预计位置再判一次。 */
    function razorwindCluster(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const params = razorwindParams(context, capability);
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const from = CompanionBehavior.point(self.point);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return 1;
        const hx = dx / length, hz = dz / length, slant = Math.tan(Math.min(89, params.fan) * Math.PI / 180);
        function inWedge(x: number, z: number): boolean {
            const along = x * hx + z * hz;
            return along > 0.2 && along <= params.reach && Math.abs(x * hz - z * hx) <= along * slant;
        }
        function covered(other: CompanionBehavior.Entity): boolean {
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const velocity = other.velocity || [0, 0, 0];
            const px = ox + velocity[0] * params.charge, pz = oz + velocity[2] * params.charge;
            if (!inWedge(ox, oz) && !inWedge(px, pz)) return false;
            return WorldGeometry.blockHit(world, from, CompanionBehavior.point(other.point)) === null;
        }
        let count = covered(target) ? 1 : 0;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || !(other.health > 0) || !other.visible) continue;
            if (covered(other)) count++;
        }
        return Math.max(1, Math.min(params.blades, count));
    }

    /** 视线检查：扇面远程，被墙挡住就不值得起手。放在辅助函数里，让准备判断保持只读。 */
    function razorwindSight(context: WorldBehavior.Context, goal: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(goal.point));
    }

    /** 近身是否受压：附近有可见、存活、非友方的敌人贴到 `ai.minRange` 以内，就不值得站定长蓄风。 */
    function razorwindPressed(context: WorldBehavior.Context, capability: WorldBehavior.Capability): boolean {
        const self = CompanionBehavior.source(context);
        const pressure = Math.max(2, CompanionBehavior.ai<number>(capability, "minRange", 4));
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) < pressure) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse(razorwindId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability, purpose) { return capability.data.range; },
        ready: function (context, _capability) {
            const goal = CompanionBehavior.goalEntity(context);
            return !goal || razorwindSight(context, goal);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            return distance <= CompanionBehavior.ai<number>(capability, "maxChase", 14)
                && distance >= CompanionBehavior.ai<number>(capability, "minRange", 4);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance < CompanionBehavior.ai<number>(capability, "minRange", 4)) return 0;
            if (razorwindPressed(context, capability)) return 0;
            const cluster = CompanionBehavior.ai<boolean>(capability, "cluster", true) ? razorwindCluster(context, capability, target) : 1;
            return cluster >= 3 ? 44 : cluster >= 2 ? 32 : 22;
        }
    });

    const razorwindChase = number("ai.maxChase", "蓄力距离", 5, 24, 1);
    razorwindChase.help = "超过这个距离不主动蓄风，先走近；越大越愿意从更远处先手甩扇。";
    const razorwindNear = number("ai.minRange", "最近蓄力距离", 0, 10, 1);
    razorwindNear.help = "目标进到这个距离以内就压低出手优先级，先拉开再蓄；调到 0 表示贴脸也照蓄。";
    const razorwindRank = flag("ai.cluster", "瞄准成排");
    razorwindRank.help = "开启：正前方一条扇面里敌人越多越优先甩出去，一扇能扫到几个；关闭则只按普通远程攻击排序。";

    addPreferences(razorwindId, { spread: false, ai: { maxChase: 14, minRange: 4, cluster: true } },
        [razorwindChase, razorwindNear, razorwindRank]);
}
