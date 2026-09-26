/**
 * 自爆 / selfdestruct 的伙伴 AI 用途。
 *
 * 什么局面下出手：这是一张用命换一圈的牌，默认只在**残血应急**时才按——自己生命低于
 *   `ai.cornered`（默认 0.35）并且**真实爆圈里**有可见、敌对、存活的目标才提案；满血不会因为
 *   隔着一段距离的两只怪就自我牺牲。玩家可以把 `ai.sacrifice`（主动牺牲）打开，允许伙伴在
 *   任何血量下用命换，进攻性更强、也更容易折损。
 * 对谁出手：候选是当前威胁；`accepts` 只排除友方、已死、看不见的。它不以单体为目标，走到圈够大就炸。
 *   是否够得着按 `blastRadius`（本招解析出的实际爆心半径）与命中判定同样的竖直带统计，圈外目标不空炸。
 * 够不到怎么办：交给共享接近逻辑；贴身不足 `ai.minFoes` 时先不炸，跟着目标走。
 * 放完接什么：没有「之后」——使用者随之倒下，动作结束。
 * 排序：目标每多一个 +10（上限 +30）；残血时再 +10。上限 95，仍可与普通攻击竞争，但不到「紧急」的 100。
 */
namespace PokemonSkills {
    /** 伙伴是否愿意用命换：默认只在残血时；开启 `ai.sacrifice` 后满血也愿意。 */
    function selfdestructWilling(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        if (CompanionBehavior.ai<boolean>(item, "sacrifice", false)) return true;
        return CompanionBehavior.ratio(CompanionBehavior.source(context))
            <= CompanionBehavior.ai<number>(item, "cornered", 0.35);
    }

    /** 真实爆圈（`blastRadius` 和伤害判定同一竖直带）内可命中的敌人数。 */
    function selfdestructCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const declared = Number(item.data.range);
        const blast = isFinite(declared) && declared > 0 ? declared : CompanionBehavior.ai<number>(item, "maxChase", 6);
        const band = blast * 0.8;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            const dx = other.point[0] - self.point[0], dy = other.point[1] - self.point[1], dz = other.point[2] - self.point[2];
            if (dx * dx + dz * dz > blast * blast || Math.abs(dy) > band) continue;
            count++;
        }
        return count;
    }

    function selfdestructWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 6);
    }

    CompanionBehavior.registerUse("selfdestruct", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            if (capability.data.ready === false || context.facts.mounted) return false;
            if (!selfdestructWilling(context, capability)) return false;
            const needed = CompanionBehavior.ratio(CompanionBehavior.source(context))
                <= CompanionBehavior.ai<number>(capability, "cornered", 0.35) ? 1 : CompanionBehavior.ai<number>(capability, "minFoes", 2);
            return selfdestructCount(context, capability) >= needed;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!selfdestructWilling(context, capability)) return false;
            if (!target) return true;
            return selfdestructWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !selfdestructWants(context, capability, target)) return 0;
            if (!selfdestructWilling(context, capability)) return 0;
            const count = selfdestructCount(context, capability);
            if (count < 1) return 0;
            let base = 60 + Math.min(30, Math.max(0, count - 1) * 10);
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) <= CompanionBehavior.ai<number>(capability, "cornered", 0.35)) base += 10;
            return Math.min(95, base);
        }
    });

    addPreferences("selfdestruct", { ai: { sacrifice: false } }, [
        field(pathOf("focus"), "聚爆式", "boolean", {
            help: "开启（聚爆式）：威力约 ×1.28、爆心收窄到 0.74 倍、起手 −2 刻，但冷却 +6——贴着一个重点目标狠炸。关闭（扩散式）：威力约 ×0.88、爆心 ×1.18 更广、起手 +2 刻、冷却 −6——一次罩住一圈人。无论哪个方向，使用者都会倒下。"
        }),
        field(pathOf("ai.sacrifice"), "主动牺牲", "boolean", {
            help: "开启（主动牺牲）：只要爆圈里有足够目标，伙伴在满血时也愿意自爆；关闭（默认）：只有生命低于残血阈值才考虑。无论哪种设置，使用者都会倒下。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动凑上去自爆，先走近；它是贴身的牌。"
        }),
        field(pathOf("ai.minFoes"), "自爆人数", "number", {
            min: 1, max: 6, step: 1,
            help: "爆心半径内至少这么多可见、存活的目标才自爆；调大只在被围住时用，调 1 见一个也炸。"
        }),
        field(pathOf("ai.cornered"), "残血阈值", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自己生命低于这个比例时，自爆门槛放宽到 1 个目标；越高越早拼命。"
        })
    ]);
}
