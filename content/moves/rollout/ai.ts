/**
 * 滚动 / rollout 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 6）格以内；更远交给共享接近逻辑。
 * 对谁出手：当前威胁；命中后把人顶开，伙伴会重新贴上再滚下一趟。带着层数时若原本的目标够不到，
 * 共享调度会让它改评另一个在射程内、实际可达的敌人。
 * 为什么优先接着滚：`ai.pressOn`（默认开）下，身上带着连滚身份时优先级抬高——层数断掉就从最轻的一趟重来。
 * 路线：用原生空域探针沿「自己→目标」方向看一段是否开阔；开阔可接续的路线加分，密墙处降权，
 * 重滚式（惯性大、更难接住）在密墙处降得更多，不贪一次必断的连滚。
 * 放完之后：只要还在连滚窗口里，伙伴会倾向继续滚动；被打断或被拉开距离就交回共享顺序重新判断。
 */
namespace PokemonSkills {
    /** 沿自己到目标的方向探一段开阔度：可接续的滚行路线加分，被墙夹住时降权。按决策帧缓存一次。 */
    function rolloutOpenRoute(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "world_combat:move_rollout/route/" + target.ref, function () {
            const world = CompanionBehavior.world(context);
            if (typeof (world as any).freeSpace !== "function") return true;
            const self = CompanionBehavior.source(context);
            const actor = world.actor(self.ref);
            const body = actor === null ? null : world.observe(actor);
            if (body === null) return true;
            const at = body.position();
            const width = Math.max(0.4, body.width()), height = Math.max(0.6, body.height());
            const dx = target.point[0] - at.x(), dz = target.point[2] - at.z();
            const length = Math.sqrt(dx * dx + dz * dz);
            if (length < 0.5) return true;
            const spacing = 0.7, samples = Math.max(1, Math.ceil(Math.min(length, 4) / spacing));
            for (let i = 1; i <= samples; i++) {
                const probe = CompanionBehavior.point([at.x() + dx / length * spacing * i, at.y(), at.z() + dz / length * spacing * i]);
                if (!world.freeSpace(probe, width, height)) return false;
            }
            return true;
        });
    }

    CompanionBehavior.registerUse(rolloutId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const pressing = CompanionBehavior.ai<boolean>(capability, "pressOn", true)
                && CompanionBehavior.status(context, self, rolloutStreak);
            const heavy = !!(capability.data.config && capability.data.config.heavy);
            const open = rolloutOpenRoute(context, target);
            let score = pressing ? 32 : 21;
            if (open) score += pressing ? 6 : 3;
            else score -= heavy ? 16 : 4;
            return Math.max(4, score);
        }
    });

    addPreferences(rolloutId, {}, [
        flag("heavy", "重滚式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.pressOn", "接住滚动")
    ]);
}
