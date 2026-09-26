/**
 * 隐形岩 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、敌对、存活、在 `ai.maxChase`（默认 11）以内的威胁时抬石。石阵只对“进入那一下”
 *   结算，站住不动不会被持续砸，所以它更看重**目标会经过哪里**：`ai.lead` 给移动中的目标一点提前量，
 *   把石阵抬在它要去的门口／空道上；`ai.minFoes` 让威胁身边至少挤着这么多敌人才额外加分。跑动的目标
 *   加分、原地站定的目标减分，避免把静止的 Boss 当成持续伤害来源。
 * 对谁出手：当前威胁，落点是它（或提前量后）的位置。
 * 够不到怎么办：交给共享接近逻辑；`kind` 为 point，AI 会把石阵抬到目标所在位置。
 * 放完之后：石阵留在空中，谁跨进来就有一枚岩块飞出；同一片地上重放会刷新石阵。
 * 配置 heavy（沉岩／浮岩）改变每块岩的重量、范围与能否打到空中目标；ai.maxChase、ai.minFoes、ai.lead
 *   决定追多远、什么时候先布、预判多少。
 */
namespace PokemonSkills {
    function stealthrockWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 11);
    }

    /** 目标要去的落点：沿它当前水平速度提前 `lead` 刻；没有速度就取它自己。 */
    function stealthrockLead(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number[] {
        const lead = CompanionBehavior.ai<number>(item, "lead", 8), velocity = target.velocity;
        if (lead <= 0 || !velocity) return target.point;
        return [target.point[0] + Number(velocity[0] || 0) * lead, target.point[1], target.point[2] + Number(velocity[2] || 0) * lead];
    }

    function stealthrockHorizontalSpeed(target: CompanionBehavior.Entity): number {
        const velocity = target.velocity;
        return velocity ? Math.sqrt(Number(velocity[0] || 0) * Number(velocity[0] || 0) + Number(velocity[2] || 0) * Number(velocity[2] || 0)) : 0;
    }

    function stealthrockCluster(context: WorldBehavior.Context, aim: number[]): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, aim) <= 3.0) count++;
        }
        return count;
    }

    /** 用原生方块射线量门口／空道：两侧近处都是墙、正前方还通，就把石阵抬在这里比空地更值。 */
    function stealthrockBlocked(world: CombatWorld, from: CombatPoint, to: CombatPoint): boolean {
        const hit = world.clipBlocks(from, to);
        return !!hit && hit.blocked();
    }

    function stealthrockCorridor(world: CombatWorld, aim: number[], heading: CombatPoint): boolean {
        const here = WorldCombat.point(aim[0], aim[1] + 1.0, aim[2]);
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const forward = heading.length() > 0.01 ? heading : WorldCombat.point(0, 0, 1);
        return stealthrockBlocked(world, here, here.plus(side.scale(1.4)))
            && stealthrockBlocked(world, here, here.minus(side.scale(1.4)))
            && !stealthrockBlocked(world, here, here.plus(forward.scale(1.6)));
    }

    function stealthrockHeading(context: WorldBehavior.Context, target: CompanionBehavior.Entity, aim: number[]): CombatPoint {
        const velocity = target.velocity;
        if (velocity && (Number(velocity[0]) || Number(velocity[2]))) {
            const value = WorldCombat.point(Number(velocity[0]) || 0, 0, Number(velocity[2]) || 0);
            if (value.length() > 0.01) return value.unit();
        }
        const here = CompanionBehavior.source(context).point;
        const delta = WorldCombat.point(aim[0] - here[0], 0, aim[2] - here[2]);
        return delta.length() > 0.01 ? delta.unit() : WorldCombat.point(0, 0, 1);
    }

    CompanionBehavior.registerUse(stealthrockId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return stealthrockWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        target: function (context, capability, selected) {
            const aim = stealthrockLead(context, capability, selected);
            if (aim === selected.point) return selected;
            const copy = JSON.parse(JSON.stringify(selected));
            copy.point = aim;
            return copy;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !stealthrockWants(context, capability, target)) return 0;
            const world = CompanionBehavior.world(context), aim = stealthrockLead(context, capability, target);
            let base = 22;
            // 石阵只吃“进入那一下”：跑动的目标值得预判，站定的目标不该按持续伤害计价。
            base += stealthrockHorizontalSpeed(target) > 0.05 ? 10 : -6;
            if (stealthrockCluster(context, aim) >= CompanionBehavior.ai<number>(capability, "minFoes", 2)) base += 14;
            if (stealthrockCorridor(world, aim, stealthrockHeading(context, target, aim))) base += 14;
            if (CompanionBehavior.ratio(target) > 0.8) base += 4;
            return base;
        }
    });

    const stealthrockAiChase = number("ai.maxChase", "考虑距离", 2, 20, 1);
    stealthrockAiChase.help = "威胁离自己这么远以内才考虑抬石；调小只在近处布，调大愿意先把石阵抬在远处的路上。";
    const stealthrockAiFoes = number("ai.minFoes", "成群时优先", 1, 4, 1);
    stealthrockAiFoes.help = "威胁身边至少挤着这么多敌人才额外加分；调 1 表示看见就布。";
    const stealthrockAiLead = number("ai.lead", "提前量", 0, 20, 1);
    stealthrockAiLead.help = "对移动中的目标提前这么多刻落点；0 表示直接布在目标当前位置，调大更适合堵住冲过来的对手。";

    addPreferences(stealthrockId, { ai: { maxChase: 11, minFoes: 2, lead: 8 } }, [stealthrockAiChase, stealthrockAiFoes, stealthrockAiLead]);
}
