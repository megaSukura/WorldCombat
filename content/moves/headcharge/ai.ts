/**
 * 爆炸头突击 / headcharge 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内（更远先交给共享接近逻辑）。
 * 这招的价值在一串人：`ai.preferLine`（默认开）在目标身后还串着一排敌人、沿冲撞线能一连撞中好几个时把它排到前面——
 * 但每多撞一个就多一次反噬，扎得越深越可能把自己耗空。关闭后只按威胁本身选目标。
 * 锁定与否由玩家配置承担，不由 AI 选项重复。
 */
namespace PokemonSkills {
    function headchargeLine(context: WorldBehavior.Context, target: CompanionBehavior.Entity, chase: number): number {
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.5) return 0;
        const ux = dx / length, uz = dz / length;
        let count = 0;
        const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * ux + oz * uz;
            if (along <= 0.5 || along > chase) continue;
            const lateral = Math.abs(ox * uz - oz * ux);
            if (lateral <= 1.6) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("headcharge", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "preferLine", true)) {
                const chase = CompanionBehavior.ai<number>(capability, "maxChase", 12);
                if (headchargeLine(context, target, chase) >= 2) score += 20;
            }
            return score;
        }
    });

    addPreferences("headcharge", {}, [
        field(pathOf("hunt"), "锁定", "boolean", {
            help: "开启：冲锋中会朝最近敌人微调方向（有转向上限），更容易撞到侧移的对手，但威力与击退下降、起手更长；关闭：一条死直线，威力与击退拉满，但对手一个侧步就能让开。"
        }),
        field(pathOf("ai.maxChase"), "冲锋距离", "number", {
            min: 2, max: 20, step: 1,
            help: "对手离自己这么远以内才起冲；调小只贴脸冲，调大愿意从更远处助跑。"
        }),
        field(pathOf("ai.preferLine"), "优先串人", "boolean", {
            help: "开启：目标身后沿冲撞线还串着别人时优先冲锋；关闭：只按威胁本身选目标。"
        })
    ]);
}
