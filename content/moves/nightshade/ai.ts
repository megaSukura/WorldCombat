/**
 * 黑夜魔影 / nightshade 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、活着，且在 `ai.maxChase` 之内。幻影自己会追向目标，因此它是本组唯一
 * 能在中远距离先手兑现的固定伤害。`ai.crowd`（默认 2）只在**开了炸影式**时才参与：按本个体真实的
 * `splashRadius` 与爆点遮挡数一数会被一起罩住的非友方，罩到阈值就把优先级抬到抢手；单体式不带范围收益，
 * 只按普通远程固定伤排序。等级伤不看防御，所以对硬目标额外加一点分（`ai.bulwark`），贴脸时让近身招式处理。
 * 驻守且未开 `ai.leaveStation` 时只在原地够得到才放，超出射程交给共享接近逻辑。
 */
namespace PokemonSkills {
    /** 用本个体真实配置求一项参数；缺省时退回给定值。 */
    function nightshadeValue(context: WorldBehavior.Context, item: WorldBehavior.Capability, key: string, fallback: number): number {
        const world = CompanionBehavior.world(context);
        const value = p("nightshade", key, { world: world, actor: world.source(), skill: skills["nightshade"], detail: { values: item.data.config } });
        return typeof value === "number" && isFinite(value) ? value : fallback;
    }

    /** 在目标点按本个体真实的炸影半径与遮挡，数一数会被一起罩住的非友方（不含主目标）。 */
    function nightshadeSplashCoverage(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context);
        const at = CompanionBehavior.point(target.point);
        const radius = Math.max(1.4, nightshadeValue(context, item, "splashRadius", 1.7));
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let around = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(target.point, other.point) > radius) continue;
            // 被墙隔断的目标不会真的吃到爆，不算收益。
            if (WorldGeometry.blockHit(world, at, CompanionBehavior.point(other.point)) !== null) continue;
            around++;
        }
        return around;
    }

    CompanionBehavior.registerUse("nightshade", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > CompanionBehavior.ai<number>(capability, "maxChase", 11)) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay")
                && !CompanionBehavior.ai<boolean>(capability, "leaveStation", false)
                && distance > capability.data.range) return false;
            return true;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            const config = capability.data.config;
            if (config && config.splash === true) {
                const crowd = CompanionBehavior.ai<number>(capability, "crowd", 2);
                if (nightshadeSplashCoverage(context, capability, target) >= crowd) return 72;
            }
            let score = distance > 3 ? 34 : 16;
            const stats = CompanionBehavior.combatStats(context, target);
            const wall = stats && stats.stats ? Math.max(Number(stats.stats.def) || 0, Number(stats.stats.spd) || 0) : 0;
            if (wall >= CompanionBehavior.ai<number>(capability, "bulwark", 90)) score += 14;
            return score;
        }
    });

    addPreferences("nightshade", {}, [
        field(pathOf("splash"), "炸影式", "boolean", {
            help: "开启：命中后在范围内爆开、波及周围最多几个敌人，但每一发伤害降到五成五、冷却更久；关闭：只打单体、伤害足额。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不放幻影，先走近；越大越会在更远处先手。"
        }),
        field(pathOf("ai.crowd"), "聚群阈值", "number", {
            min: 1, max: 5, step: 1,
            help: "炸影式下，目标身边这么多敌人会被同一发罩住时优先放这一记；关闭炸影式时本项不参与排序。越大越只在密集处出手。"
        }),
        field(pathOf("ai.bulwark"), "硬目标门槛", "number", {
            min: 0, max: 200, step: 10,
            help: "目标的物防或特防达到这个数值时优先放这一记：等级伤不看防御，越硬的目标这一记越划算；设为 0 则始终享受加成。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为寻找射击位置离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
