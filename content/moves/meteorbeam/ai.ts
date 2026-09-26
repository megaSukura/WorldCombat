/**
 * 流星光束 / meteorbeam 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 20）格内。
 * 对谁出手：`ai.overCover`（默认开）打开时，如果直线视线被挡，会沿真实抛物线探一遍——弧线真的越得过去才抬价，
 *   越不过去反而压价，避免对着挡死的弧线空抛。目标落点周围的人越多越优先（可以预判群敌落点）。
 * 优先级：`ai.boostFirst`（默认开）打开时，自己特攻还没满段就抬价——先攒下这 1 级再去打别的；
 *   目标贴到 `ai.minRange` 以内时压价，避免站着拉星。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程之后再抛。
 * 放完接什么：交回共享交战计划；特攻提升留在身上，由共享战斗计划继续使用。
 */
namespace PokemonSkills {
    /** 沿服务端同一条 ballistic 弧线走一遍，看看真实路径是否被方块截断。 */
    function meteorbeamArcClears(context: WorldBehavior.Context, goal: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const self = CompanionBehavior.source(context);
        const origin = CompanionBehavior.point(self.point);
        const target = CompanionBehavior.point(goal.point);
        const distance = CompanionBehavior.distance(self.point, goal.point);
        const speed = 0.85, gravity = 0.05;
        const launch = LivingActions.ballistic(origin, target, speed, gravity);
        if (launch === null) return false;
        let velocity = launch.scale(speed), position = origin;
        for (let step = 0; step < 80; step++) {
            velocity = WorldCombat.point(velocity.x() * 0.99, velocity.y() * 0.99 - gravity, velocity.z() * 0.99);
            const next = position.plus(velocity);
            if (!world.clear(position, next)) return false;
            position = next;
            if (position.minus(origin).length() >= distance + 0.4) break;
        }
        return true;
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
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 20);
        },
        accepts: function (_context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const world = CompanionBehavior.world(context);
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 26;
            if (CompanionBehavior.ai<boolean>(capability, "boostFirst", true) && meteorbeamSpaStage(context, self) < 4) score += 10;
            if (CompanionBehavior.ai<boolean>(capability, "overCover", true)
                && !world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) {
                score += meteorbeamArcClears(context, target) ? 16 : -10;
            }
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
    meteorbeamOverCover.help = "开启：直线视线被挡时，沿真实抛物线探一遍——弧线真的越得过去才优先出手，越不过去反而压低；关闭则不看掩体，只按普通远程攻击排序。";

    addPreferences("meteorbeam", { deep: false, ai: { maxChase: 20, minRange: 4, boostFirst: true, overCover: true } },
        [meteorbeamDeep, meteorbeamChase, meteorbeamMin, meteorbeamBoostFirst, meteorbeamOverCover]);
}
