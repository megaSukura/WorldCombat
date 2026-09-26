/**
 * 水流裂破 / liquidation 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）之内；更远交给共享接近逻辑。
 * 对谁出手：这一记是正面一片扇形横切，`selectTarget` 挑「扇里人最多」的那个方向当正面——串得越多越优先，
 * 站在侧面的两个敌人因此能被同一趟扫到。单体 Boss 也在候选里，照常吃满横切与破防。
 * 什么时候最想出手：开启 `ai.crowd`（默认开）时，扇里人多则 priority 抬高；开启 `ai.crack`（默认开）时，
 * 还没被破防（不带 `world_combat:status/sundered`）的目标再抬一截——把这一发留给护甲还完好的对手。
 * 免推的大型目标照样优先：命中结算不依赖能否推开，破防与湿身照挂。
 */
namespace PokemonSkills {
    /** 扇里还站着几个敌人：以施法者为顶点、候选方向为轴，数半张角 80°、射程内的人。 */
    function liquidationCrowd(context: any, capability: any, subject: any): number {
        const self = CompanionBehavior.source(context), limit = capability.data.range, half = 80 * Math.PI / 180;
        const dx = subject.point[0] - self.point[0], dz = subject.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz) || 1, cosHalf = Math.cos(half);
        let count = 1;
        (context.facts.nearby as any[]).forEach(function (other: any) {
            if (other.ref === subject.ref || other.friendly || other.health <= 0 || !other.visible) return;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const range = Math.sqrt(ox * ox + oz * oz);
            if (range > limit || range < 1e-6) return;
            if ((ox * dx + oz * dz) / (range * length) >= cosHalf) count++;
        });
        return count;
    }

    CompanionBehavior.registerUse("liquidation", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        selectTarget: function (context, capability, proposed) {
            if (proposed && proposed.ref === context.facts.focus) return proposed;
            const self = CompanionBehavior.source(context), limit = CompanionBehavior.ai<number>(capability, "maxChase", 6);
            const candidates = (context.facts.nearby as any[]).filter(function (other: any) {
                return !other.friendly && other.health > 0 && other.visible && CompanionBehavior.distance(self.point, other.point) <= limit;
            });
            if (!candidates.length) return proposed || null;
            let best = candidates[0], bestScore = liquidationCrowd(context, capability, candidates[0]);
            for (let index = 1; index < candidates.length; index++) {
                const score = liquidationCrowd(context, capability, candidates[index]);
                if (score > bestScore) { bestScore = score; best = candidates[index]; }
            }
            return best;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const cracked = CompanionBehavior.status(context, target, "sundered");
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "crowd", true)) score += Math.min(20, (liquidationCrowd(context, capability, target) - 1) * 8);
            if (CompanionBehavior.ai<boolean>(capability, "crack", true) && !cracked) score += 18;
            else if (cracked) score -= 8;
            return Math.max(0, Math.min(78, score));
        }
    });

    addPreferences("liquidation", {}, [
        field(pathOf("shred"), "破甲式", "boolean", {
            help: "开启：破防概率更高、一次能压两级、湿身更久，但横切威力降低、起手与冷却更久；关闭：重压式，横切威力更高、只压一级。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动发起水流裂破，先靠近。越大追击越执着；这一招是短横切，太远追上去时对手常已散开。"
        }),
        field(pathOf("ai.crack"), "留给未破防的目标", "boolean", {
            help: "开启：优先对还没被撕开护甲的目标出手（命中挂上破甲）；关闭：只按威胁与距离排序。"
        }),
        field(pathOf("ai.crowd"), "扎堆时优先", "boolean", {
            help: "开启：瞄准前方一排里敌人最多的方向，让同一趟横切擦到更多人；关闭：只按威胁与距离排序。"
        })
    ]);
}
