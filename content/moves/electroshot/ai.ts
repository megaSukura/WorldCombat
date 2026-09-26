/**
 * 电光束 / electroshot 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 22）格内；电矛走直线，出手前要求视线畅通
 *   （中间被墙挡住就先换位，交给共享接近）。
 * 对谁出手：谁都可以；`ai.rainFirst`（默认开）打开时，下雨天抬价——那时不用聚电、当场就能打出（原生规则）。
 *   晴天若自己特攻还没满段，也会小幅抬价：站定聚电换来 1 级特攻，有窗口就值得。
 * 优先级：目标贴到 `ai.minRange` 以内时压价，避免站着聚电被打断。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程之后再射。
 * 放完接什么：交回共享交战计划；特攻提升留在身上继续参与后续结算。
 */
namespace PokemonSkills {
    /** 出手前视线是否畅通；放在 `ready` 之外，避免提交前扫描误判。 */
    function electroshotClear(context: WorldBehavior.Context, goal: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(goal.point));
    }

    /** 当前是否在下雨（WorldEnvironment 的 rain 观测值），用于雨天即时的优先级。 */
    function electroshotRaining(context: WorldBehavior.Context): boolean {
        const self = CompanionBehavior.source(context);
        const env = WorldEnvironment.read(CompanionBehavior.world(context), CompanionBehavior.point(self.point));
        return typeof env.rain === "number" && env.rain >= 0.35;
    }

    CompanionBehavior.registerUse("electroshot", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 22);
        },
        accepts: function (_context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 26;
            if (CompanionBehavior.ai<boolean>(capability, "rainFirst", true) && electroshotRaining(context)) score += 14;
            else {
                // 旱地窗口：特攻还没满段时，聚电换来的一级特攻仍有价值。
                const stage = CompanionBehavior.stage(context, self, "spa");
                if (typeof stage === "number" && stage < 4) score += 6;
            }
            if (distance < CompanionBehavior.ai<number>(capability, "minRange", 4)) score -= 8;
            return score;
        },
        ready: function (context, _capability) {
            const goal = CompanionBehavior.goalEntity(context);
            return !goal || electroshotClear(context, goal);
        }
    });

    const electroshotChase = field(pathOf("chase"), "追踪形态", "boolean", {
        help: "开启（追踪）：电矛转向更强（×1.6）、射程更远，但单发威力 ×0.9、飞行略慢，目标走位很难摆脱；关闭（直射）：飞得更快、威力更高（×1.15），但几乎不修正，容易被侧移躲开。"
    });
    const electroshotRange = number("ai.maxChase", "考虑距离", 5, 30, 1);
    electroshotRange.help = "超过这个距离就不主动出手，先走近；越大越愿意在更远处先手点射。";
    const electroshotMin = number("ai.minRange", "最近起手距离", 0, 10, 1);
    electroshotMin.help = "目标进到这个距离以内时压低出手优先级，避免站着聚电被打断；调到 0 表示贴身也照放。";
    const electroshotRain = flag("ai.rainFirst", "雨天优先");
    electroshotRain.help = "开启：下雨天抬高出优先级——那时不用聚电、当场发射，且特攻照样提升；关闭则不看天气。";

    addPreferences("electroshot", { chase: false, ai: { maxChase: 22, minRange: 4, rainFirst: true } },
        [electroshotChase, electroshotRange, electroshotMin, electroshotRain]);
}
