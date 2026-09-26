/**
 * 大爆炸 / explosion 的伙伴 AI 用途。
 *
 * 什么局面下出手：这是一张明确的牺牲牌，默认**不主动提案**。只有玩家在偏好里打开「允许牺牲」后，
 *   伙伴才在近处出现能被爆心罩住的敌人时考虑它；默认要求推进后爆心能覆盖 `ai.minFoes`（默认 2）个
 *   可见、敌对、存活的目标；自己生命掉到 `ai.cornered`（默认 0.3）以下时门槛放宽到 1 个。
 * 对谁出手：候选是当前威胁；`accepts` 只排除友方、已死、看不见的。
 * 怎么送：走到 `ai.maxChase`（默认 7）内就引爆；提交后爆点固定，不再追踪改道。
 * 放完接什么：没有「之后」——使用者随之倒下，动作结束；弹坑与余烬留在原地自行消散。
 * 排序：目标每多一个 +12（上限 +36），残血再 +10；上限 98，压过普通攻击但不到「紧急」的 100。
 */
namespace PokemonSkills {
    /** 伙伴估算爆心覆盖时用的名义半径；引信环与真实爆心由本招自己算，AI 只做提案门槛。 */
    const explosionProbeRadius = 5.6;

    function explosionAllowed(capability: WorldBehavior.Capability): boolean {
        return CompanionBehavior.ai<boolean>(capability, "sacrifice", false);
    }

    /** 从自己出发朝某点推进、水平封顶在推进距离内的落点（AI 的廉价估算，不动世界）。 */
    function explosionLanding(self: CompanionBehavior.Entity, toward: number[]): number[] {
        const dx = toward[0] - self.point[0], dz = toward[2] - self.point[2];
        const span = Math.sqrt(dx * dx + dz * dz);
        if (span < 0.01) return [self.point[0], self.point[1], self.point[2]];
        const step = Math.min(4, span);
        return [self.point[0] + dx / span * step, self.point[1], self.point[2] + dz / span * step];
    }

    /** 在可达落点里，爆心最多能罩住几个可见、存活、敌对的目标。 */
    function explosionCount(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context);
        const limit = CompanionBehavior.ai<number>(capability, "maxChase", 7);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let best = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) > limit) continue;
            const landing = explosionLanding(self, other.point);
            let covered = 0;
            for (let j = 0; j < nearby.length; j++) {
                const peer = nearby[j];
                if (peer.friendly || peer.health <= 0 || !peer.visible) continue;
                if (CompanionBehavior.distance(landing, peer.point) <= explosionProbeRadius) covered++;
            }
            if (covered > best) best = covered;
        }
        return best;
    }

    function explosionWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse("explosion", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            if (capability.data.ready === false || context.facts.mounted) return false;
            if (!explosionAllowed(capability)) return false;
            const needed = CompanionBehavior.ratio(CompanionBehavior.source(context))
                <= CompanionBehavior.ai<number>(capability, "cornered", 0.3) ? 1 : CompanionBehavior.ai<number>(capability, "minFoes", 2);
            return explosionCount(context, capability) >= needed;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted || !explosionAllowed(capability)) return false;
            if (!target) return true;
            return explosionWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !explosionWants(context, capability, target)) return 0;
            const count = explosionCount(context, capability);
            let base = 70 + Math.min(36, Math.max(0, count - 1) * 12);
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) <= CompanionBehavior.ai<number>(capability, "cornered", 0.3)) base += 10;
            return Math.min(98, base);
        }
    });

    addPreferences("explosion", {}, [
        field(pathOf("ai.sacrifice"), "主动牺牲", "boolean", {
            help: "关闭（默认）：伙伴绝不主动用这招；开启：只有推进后爆心能罩住足够敌人时才会提案——它会点燃引信压进爆点、随即倒下。残血时门槛放宽到一个目标。手动下令时永远可以直接放。"
        }),
        field(pathOf("charged"), "蓄爆式", "boolean", {
            help: "开启（蓄爆式）：威力约 ×1.12、爆心 ×1.12、弹坑停留 ×1.6、引信 +3 刻，但起手 +6 刻、冷却 +14——蓄得越久回报越大，也越容易被对手打断或绕开。关闭（瞬爆式）：威力约 ×0.95、爆心 ×0.95、冷却 −8，出手更快、坑更短。无论哪个方向，使用者都会倒下。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动凑上去引爆，先走近；它是一圈之内的牌。"
        }),
        field(pathOf("ai.minFoes"), "引爆人数", "number", {
            min: 1, max: 6, step: 1,
            help: "推进后爆心能罩住的可见、存活目标至少这么多才引爆；调大只在被围住时用，调 1 见一个也炸。"
        }),
        field(pathOf("ai.cornered"), "残血阈值", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自己生命低于这个比例时，引爆门槛放宽到 1 个目标；越高越早拼命。"
        })
    ]);
}
