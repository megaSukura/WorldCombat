/**
 * 十万马力 / highhorsepower 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 9）格内；更远交给共享接近逻辑。
 *   它准备约 7 刻，是一记慢重的正面重撞：优先在目标不会横向快速撤离、自己有完整蓄势窗口时出手。
 * 对谁出手：`ai.closer`（默认开）打开时，优先挑最近的那具身体——这是一记贴地冲撞，跑过别人去撞更远的
 *   目标不合算；关闭则只按普通中近程接触招排序，不看谁最近。
 * 受迫时降权：刚被贴身打中、需要立刻解围的场合让给冲岩这类更短促的先手，别硬等这 7 刻蓄势。
 * 够不到怎么办：reach 就是本招射程，不够先交给共享任务走近。
 * 放完之后：交回共享交战计划；压身式把目标留在近处，顶头式把目标送远，接着打还是走位由共享顺序决定。
 */
namespace PokemonSkills {
    function highhorsepowerNearest(context: WorldBehavior.Context, subject: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let best: CompanionBehavior.Entity | null = null, bestDistance = Infinity;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || !(other.health > 0) || other.ref === self.ref) continue;
            const distance = CompanionBehavior.distance(self.point, other.point);
            if (distance < bestDistance) { bestDistance = distance; best = other; }
        }
        return best !== null && best.ref === subject.ref;
    }

    CompanionBehavior.registerUse(highhorsepowerId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range + 1.5) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "closer", true) && highhorsepowerNearest(context, target)) score += 8;
            // A target sliding fast across the charge line outruns the long wind-up.
            const velocity = CompanionBehavior.velocity(context, target);
            if (velocity !== null) {
                const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
                const length = Math.sqrt(dx * dx + dz * dz);
                if (length > 0.2 && Math.abs(velocity[0] * (-dz / length) + velocity[2] * (dx / length)) > 0.12) score -= 10;
            }
            // Immediately pressured: let a short first strike break out instead of winding up this one.
            if (self.hurtAgo < 20) score -= 12;
            return score;
        }
    });

    addPreferences(highhorsepowerId, {}, [
        field(pathOf("press"), "压身式", "boolean", {
            help: "开启：威力 ×1.08、撞击点向下压出一圈更重的尘环，但顶开 ×0.6、冲程 ×0.9、冷却 +6 刻——把对手留在近身继续打。关闭（顶头式）：顶开 ×1.25、冲程 ×1.1、冷却 −4 刻，代价是威力 ×0.95——把目标撞离阵地、拉开距离。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 14, step: 1,
            help: "超过这个距离就不主动起撞，先走近；越大追得越执着。"
        }),
        field(pathOf("ai.closer"), "专挑最近", "boolean", {
            help: "开启：优先冲撞离自己最近的那具身体，不绕过去打更远的目标；关闭：只按普通中近程接触招排序，不看谁最近。"
        })
    ]);
}
