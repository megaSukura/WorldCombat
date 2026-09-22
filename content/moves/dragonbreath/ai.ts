/**
 * 龙息 / dragonbreath 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；这是一道扇形吐息，
 * 所以 `ai.cluster`（默认开）在身前锥形里能罩住两个以上敌人时把它排到前面——代价是可能为了找角度而
 * 偏离最好的站位；关闭则只当它是一记普通法术。`ai.opening` 选“只对未麻痹目标”时跳过已经发麻的敌人，
 * 把这一口留给还能被麻的人。够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    /** 另一个敌人是否落在“自己 → 目标”方向、半角约为 30° 的锥内。 */
    function dragonbreathInCone(self: WorldMethods.Subject, direction: WorldMethods.Subject, other: WorldMethods.Subject, reach: number): boolean {
        const dx = direction.point[0] - self.point[0], dz = direction.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return false;
        const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
        const od = Math.sqrt(ox * ox + oz * oz);
        if (od < 0.01 || od > reach) return false;
        return (ox * dx + oz * dz) / (od * length) >= 0.86;
    }

    CompanionBehavior.registerUse("dragonbreath", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.ai<string>(capability, "opening", "anytime") === "unparalyzed" && CompanionBehavior.status(context, target, "paralysis")) return false;
            return true;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const reach = capability.data.range;
            if (CompanionBehavior.distance(self.point, target.point) > reach) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true)) {
                let crowded = 1;
                const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                    if (dragonbreathInCone(self, target, other, reach)) crowded++;
                }
                if (crowded >= 2) score += 20;
            }
            return score;
        }
    });

    addPreferences("dragonbreath", {}, [
        field(pathOf("wide"), "广息式", "boolean", {
            help: "开启：吐息张得更开（约 1.25 倍张角）、能罩住更多人，但长度与单点威力略低。关闭：聚焦式，气息更窄更长、单点更重，代价是范围小、起手与冷却略长。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不喷息，先走近。越大越会在更远处先手扫射。"
        }),
        field(pathOf("ai.cluster"), "成列时优先", "boolean", {
            help: "开启：身前锥形里能罩住两个以上敌人时优先喷息（可能为找角度偏离站位）；关闭：只当普通法术用。"
        }),
        field(pathOf("ai.opening"), "出手时机", "choice", {
            options: [
                { value: "anytime", label: "随时" },
                { value: "unparalyzed", label: "只对未麻痹目标" }
            ],
            help: "选“只对未麻痹目标”时跳过已经发麻的敌人，把这一口留给还能被麻的人。"
        })
    ]);
}
