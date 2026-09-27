/**
 * 流星光束 / meteorbeam 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标敌对、还活着，且在 `ai.maxChase`（默认 20）格内，而且执行时真能用当前速度解出一条
 *   从施法者到目标的通达弧（低弧优先、挡不住时用能越掩体的高弧）。可达性由执行与 AI 共用的 `meteorbeamPlan`
 *   判断：拿 AI 自己的世界作用域与目标点求解，找不到弧就不选它，避免提交后被拒。
 * 对谁出手：目标落点周围的人越多越优先（预判群敌落点）。`ai.overCover`（默认开）打开时，直线视线被挡、
 *   而规划出的弧确实越得过去，就抬价；掩体后的人不再因为「直线被挡」被一律排除，但射程与可达弧仍说了算。
 * 优先级：`ai.boostFirst`（默认开）打开时，自己特攻还没满段就抬价；目标贴到 `ai.minRange` 以内时压价。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程之后再抛。
 * 放完接什么：交回共享交战计划；特攻提升留在身上，由共享战斗计划继续使用。
 */
namespace PokemonSkills {
    /** 与执行同一份规划：AI 用自己的世界作用域、真实原点与目标点，解当前速度下的可达弧。 */
    function meteorbeamAiPlan(context: WorldBehavior.Context, target: CompanionBehavior.Entity): MeteorbeamPlan | null {
        const world = CompanionBehavior.world(context);
        const key = "meteorbeam-plan:" + String(target.ref) + ":" + target.point.join(",");
        const cached = context.scratch[key] as { tick: number; plan: MeteorbeamPlan | null } | undefined;
        if (cached !== undefined && cached.tick === context.tick) return cached.plan;
        let speed = 0;
        try { speed = meteorbeamSpeed(world); } catch (error) { speed = 0; }
        const plan = speed > 0
            ? meteorbeamPlan(world, CompanionBehavior.point(CompanionBehavior.source(context).point), CompanionBehavior.point(target.point), speed)
            : null;
        context.scratch[key] = { tick: context.tick, plan: plan };
        return plan;
    }

    /** 目标落点周围当前可见的敌人数；用于预判这一颗能溅射到几个。 */
    function meteorbeamCluster(context: WorldBehavior.Context, goal: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, goal.point) <= 2.6) count++;
        }
        return Math.max(1, count);
    }

    /** 只读、回调内缓存的特攻能力等级（宝可梦读原生等级，其他生物读 CombatStages）。 */
    function meteorbeamSpaStage(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const stage = CompanionBehavior.stage(context, target, "spa");
        return typeof stage === "number" ? stage : 0;
    }

    CompanionBehavior.registerUse("meteorbeam", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        memoryAim: true,
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 20)) return false;
            return meteorbeamAiPlan(context, target) !== null;
        },
        // memoryAim 只含共享层核实的三秒内最后目击点；不读取隐藏身体的现位置或生命值。
        accepts: function (_context, _capability, target) {
            return !!target.memoryAim || target.visible && !target.friendly && target.health > 0;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const world = CompanionBehavior.world(context);
            const self = CompanionBehavior.source(context);
            const plan = meteorbeamAiPlan(context, target);
            if (plan === null) return 0;
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 26;
            if (CompanionBehavior.ai<boolean>(capability, "boostFirst", true) && meteorbeamSpaStage(context, self) < 4) score += 10;
            // 直线被挡、而规划出的弧真实越得过去：掩体不再是拒答理由，而是这招的价值所在。
            if (CompanionBehavior.ai<boolean>(capability, "overCover", true)
                && !world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) score += 16;
            const cluster = meteorbeamCluster(context, target);
            if (cluster >= 3) score += 12; else if (cluster >= 2) score += 6;
            if (distance < CompanionBehavior.ai<number>(capability, "minRange", 4)) score -= 8;
            return score;
        }
    });

    const meteorbeamDeep = field(pathOf("deep"), "深空形态", "boolean", {
        help: "开启（深空）：聚星多抬 1 级特攻（共 +2 级）、落点更大，但聚星更久（×1.3）、抛出的直接威力 ×0.85、冷却多 5 刻；关闭：聚星更快、抛出更重，但只 +1 级特攻、落点较小。"
    });
    const meteorbeamChase = number("ai.maxChase", "考虑距离", 5, 28, 1);
    meteorbeamChase.help = "超过这个距离就不主动起手，先走近；越大越愿意在更远处先抛一颗。";
    const meteorbeamMin = number("ai.minRange", "最近起手距离", 0, 10, 1);
    meteorbeamMin.help = "目标进到这个距离以内时压低出手优先级，避免站着拉星被打断；调到 0 表示贴身也照抛。";
    const meteorbeamBoostFirst = flag("ai.boostFirst", "先攒特攻");
    meteorbeamBoostFirst.help = "开启：自己特攻还没到 +4 级时抬价，先把这 1 级特攻攒下来；关闭则不特意为增益出手。";
    const meteorbeamOverCover = flag("ai.overCover", "越过掩体");
    meteorbeamOverCover.help = "开启：通达弧能越过掩体时抬高优先级；失去视线后，最多朝 3 秒内最后看见的位置抛射。关闭则不为掩体抬价，仍须解出可达弧。";

    addPreferences("meteorbeam", { deep: false, ai: { maxChase: 20, minRange: 4, boostFirst: true, overCover: true } },
        [meteorbeamDeep, meteorbeamChase, meteorbeamMin, meteorbeamBoostFirst, meteorbeamOverCover]);
}
