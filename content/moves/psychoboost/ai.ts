/**
 * 精神突进 / psychoboost 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 16）格之内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.channel`（默认开）打开时，只有到自己与目标之间有一条安全视线才考虑——念环要合拢，
 *   被墙挡住就会散掉白费；停在原地的慢目标也排前，因为收拢的几刻里它来不及走开。
 *   `ai.tough`（默认开）打开时，生命比例最高的目标排前，把全族最重的一记交给最硬的对手。
 * 够不到怎么办：reach 就是本招射程，不够就靠近；身边近身敌人多时明显降权，凝聚式更要收手。
 * 放完之后：一记最高威力的单体特殊并大幅削自己的特攻；交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function psychoboostWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
    }

    /** 自身身边贴得有多近：取 5 格内敌对目标数，近身压力越大越不该慢慢凝聚。 */
    function psychoboostPressure(context: WorldBehavior.Context, self: CompanionBehavior.Entity): number {
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= 5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("psychoboost", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return psychoboostWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !psychoboostWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            const world = CompanionBehavior.world(context);
            const clear = world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
            if (!clear && CompanionBehavior.ai<boolean>(capability, "channel", true)) return 0;
            let score = 26;
            if (distance <= capability.data.range) score += 6;
            if (!clear) score -= 10;
            if (CompanionBehavior.ai<boolean>(capability, "tough", true) && CompanionBehavior.ratio(target) > 0.5) score += 8;
            if ((context.facts.specialAttack || 0) >= (context.facts.attack || 0)) score += 4;
            const velocity = CompanionBehavior.velocity(context, target);
            if (velocity !== null &&
                Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1] + velocity[2] * velocity[2]) < 0.03) score += 6;
            const pressure = psychoboostPressure(context, self);
            score -= pressure * 5;
            if (capability.data.config && capability.data.config.hold === true && pressure > 0) score -= 8;
            return score;
        }
    });

    addPreferences("psychoboost", {}, [
        field(pathOf("hold"), "凝聚式", "boolean", {
            help: "开启：收拢时间 ×1.5、单次威力 ×1.15，把全部力气压进唯一一响；起手 +3 刻、冷却 +7 刻，给你更长的一整个破绽窗口。关闭（瞬爆式）：合拢更快、出手更省，单次略低。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 7, max: 22, step: 1,
            help: "超过这个距离就不主动内爆，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.tough"), "挑最硬的打", "boolean", {
            help: "开启：生命比例最高的目标排前，把最重的一记交给最硬的对手；关闭则所有目标同价。"
        }),
        field(pathOf("ai.channel"), "安全视线才凝聚", "boolean", {
            help: "开启：只有到自己与目标之间有一条不被方块挡住的视线才考虑这一招，否则完全不出手；关闭则视线被挡也照常排序，只是降权。"
        })
    ]);
}
