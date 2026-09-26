/**
 * 钢翼 / steelwing 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 7）格内；更远交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）；这是两侧翼缘的横扫，站位比目标身份更重要——
 *   `ai.preferCrowd`（默认开）在目标身边挤着别人时抬价，两条翼缘能分别扫到两侧的人。
 *   `glide` 开启时用只读世界入口 `CompanionBehavior.world(context)` 的 `freeSpace` 探一下前方通道，
 *   前方被挡就压低滑翔优先级——滑翔需要一段真实推进的空间，不是往墙上撞。
 * 为什么先出手：`ai.braceUp`（默认开）在自己防御还没到 +4 级时抬价，先把翼面磨硬再去吃伤害。
 * 放完之后：防御等级留在身上，交回共享交战计划继续交战。
 */
namespace PokemonSkills {
    /** 自己 `reach` 范围内实打实挤着几个敌人，用来读「一片人」；只是候选排序的读法，不改变命中判定。 */
    function steelwingCrowd(context: WorldBehavior.Context, self: CompanionBehavior.Entity, reach: number): number {
        const nearby: CompanionBehavior.Entity[] = <any>context.facts.nearby || [];
        let count = 0;
        for (let index = 0; index < nearby.length && count < 6; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || String(other.ref) === String(self.ref)) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= reach) count++;
        }
        return count;
    }

    /** 滑翔式需要一个大致畅通的前方：用只读世界的 freeSpace 探一段，被挡就别硬滑。 */
    function steelwingChannel(context: WorldBehavior.Context, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        if (!world) return true;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-4) return true;
        const test = Math.min(1.2, length - 0.3);
        if (test <= 0) return true;
        const ahead = CompanionBehavior.point([self.point[0] + dx / length * test, self.point[1], self.point[2] + dz / length * test]);
        return world.freeSpace(ahead, typeof self.width === "number" ? self.width : 0.9,
            typeof self.height === "number" ? self.height : 1.4);
    }

    CompanionBehavior.registerUse("steelwing", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "preferCrowd", true)
                && steelwingCrowd(context, self, capability.data.range) >= 2) score += 14;
            if (capability.data.config && capability.data.config.glide === true && !steelwingChannel(context, self, target)) score -= 12;
            if (CompanionBehavior.ai<boolean>(capability, "braceUp", true)) {
                const stage = CompanionBehavior.stage(context, self, "def");
                if ((typeof stage === "number" ? stage : 0) < 4) score += 8;
            }
            return score;
        }
    });

    addPreferences("steelwing", {}, [
        field(pathOf("glide"), "滑翔扫", "boolean", {
            help: "开启：先向前真实滑出一段、滑行期间保持两侧全幅翼缘，展翼更宽、击退更远、升防更稳，但起手与冷却更久，也可能为扫人而滑进敌阵；关闭（原地扫）：站定展开双翼扫过身侧，更快更便宜、翼展略短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "对手离自己这么远以内才主动展翼；调大愿意主动凑上去扫两侧。"
        }),
        field(pathOf("ai.preferCrowd"), "优先扫两侧", "boolean", {
            help: "开启：目标身边还挤着别人时优先展翼，两条翼缘分别扫到两侧的人；关闭则只按普通近战排序。"
        }),
        field(pathOf("ai.braceUp"), "先磨防御", "boolean", {
            help: "开启：自己防御还没到 +4 级时抬价，先把翼面磨硬再去吃伤害；关闭则不特意为增益出手。"
        })
    ]);
}
