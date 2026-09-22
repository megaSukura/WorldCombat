/**
 * 日光刃 / solarblade 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活且在自己 `ai.maxChase`（默认 16）格内；出手前要求两者之间有一块空地
 *   （突进只走直线，中间被墙堵住就先换位，交给共享接近）。
 * 对谁出手：`ai.multiFirst`（默认开）打开时，先找「面前扇形里能一刀扫到最多人」的落点与目标，
 *   一次覆盖一排是它最值的时候；关闭则只按普通近身攻击排序。
 * 优先级：站在强日光下（context.facts.sunlight）时抬价，因为不用凝刃、没有站桩空档（`ai.sunFirst` 控制）。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进刀程之后再斩。
 * 放完接什么：交回共享交战计划；它是一记贴身横扫，不负责追击。
 */
namespace PokemonSkills {
    /** 从突进终点朝 target 方向的扇面里，当前可见敌人的数量；用于选择「这一刀能扫到几个」。 */
    function solarbladeFan(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const reach = typeof capability.data.range === "number" ? capability.data.range : 3.6;
        const thrust = !!(capability.data.config && capability.data.config.thrust);
        const arc = (thrust ? 50 : 150) * Math.PI / 360;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return 1;
        const hx = dx / length, hz = dz / length;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const limit = reach + 2.4;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const distance = Math.sqrt(ox * ox + oz * oz);
            if (distance > limit || distance < 0.01) continue;
            if (Math.acos(Math.max(-1, Math.min(1, (ox * hx + oz * hz) / distance))) > arc) continue;
            count++;
        }
        return Math.max(1, count);
    }

    /** 突进要走的这条直线是否畅通；放在 `ready` 之外，避免提交前扫描误判。 */
    function solarbladeClear(context: WorldBehavior.Context, goal: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(goal.point));
    }

    CompanionBehavior.registerUse("solarblade", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (_context, capability) { return capability.data.range; },
        selectTarget: function (context, capability, proposed) {
            if (proposed.friendly || !(proposed.health > 0) || !proposed.visible) return proposed;
            if (!CompanionBehavior.ai<boolean>(capability, "multiFirst", true)) return proposed;
            const self = CompanionBehavior.source(context);
            const limit = (typeof capability.data.range === "number" ? capability.data.range : 3.6) + 2.4;
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            let best = proposed, bestScore = CompanionBehavior.distance(self.point, proposed.point) <= limit
                ? solarbladeFan(context, capability, proposed) : -1;
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.friendly || !(other.health > 0) || !other.visible) continue;
                if (CompanionBehavior.distance(self.point, other.point) > limit) continue;
                const score = solarbladeFan(context, capability, other);
                if (score > bestScore) { best = other; bestScore = score; }
            }
            return best;
        },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (_context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const fan = solarbladeFan(context, capability, target);
            let score = fan >= 3 ? 44 : fan >= 2 ? 32 : 26;
            const sun = context.facts.sunlight;
            if (CompanionBehavior.ai<boolean>(capability, "sunFirst", true) && typeof sun === "number" && sun >= 0.85) score += 10;
            return score;
        },
        ready: function (context, _capability) {
            const goal = CompanionBehavior.goalEntity(context);
            return !goal || solarbladeClear(context, goal);
        }
    });

    const solarbladeThrust = field(pathOf("thrust"), "突刺形态", "boolean", {
        help: "开启（突刺）：向前踏得更远（×1.5）、斩击更重（×1.25）、刀锋略长，但扇面收成一条窄线（×0.42）、基本只砍到正前方一个，收招多 1 刻；关闭（横扫）：刀锋铺得更开（×1.25 角度），一次扫到挤在面前的一排，但单发更轻、冲得更短。"
    });
    const solarbladeChase = number("ai.maxChase", "交战半径", 3, 24, 1);
    solarbladeChase.help = "超过这个距离就不主动踏出，先由共享接近把身位收进刀程；越大越愿意追出去斩。";
    const solarbladeMulti = flag("ai.multiFirst", "先扫人多的方向");
    solarbladeMulti.help = "开启：优先选择面前扇形里能一次扫到最多敌人的目标；关闭则只按普通近身攻击排序。";
    const solarbladeSun = flag("ai.sunFirst", "阳光优先");
    solarbladeSun.help = "开启：站在强日光下时抬高优先级——那时不用凝刃、当场斩出且威力不减；关闭则不看天气。";

    addPreferences("solarblade", { thrust: false, ai: { maxChase: 16, multiFirst: true, sunFirst: true } },
        [solarbladeThrust, solarbladeChase, solarbladeMulti, solarbladeSun]);
}
