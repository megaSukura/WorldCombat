/**
 * 扫墓 / lastrespects 的伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享 attack 位上；这是走向对手的一记重扫，够不到时交给共享接近逻辑把身位收进射程，
 *   `ai.maxChase` 只决定「多远之内值得先手」，超过时压低排序但仍会走近。它不挑目标，只挑时机。
 * 对谁出手：`accepts` 只排除友方、已死、看不见的。
 * 什么时候抬价：`ai.mournful`（默认开）打开时，同阵营每有一位伙伴倒下就 +6 分（上限 +24）——替他们送行的
 *   时机；一位没倒时它就是普通回身短射。随行式（`trail`）再看通道里挡着几个敌人，每个 +5（上限 +15），
 *   沿路清场时排前。
 * 放完接什么：交回共享交战计划；倒下记录不因这一扫清空，之后的扫墓继续吃同一份哀悼。
 */
namespace PokemonSkills {
    /** 只读、回调内缓存的同阵营倒下伙伴数。 */
    CompanionBehavior.registerFact("world_combat:move_lastrespects/fallen", function (access, actor, _argument) {
        return access.valid(actor) ? lastrespectsCount(access, actor) : 0;
    });

    function lastrespectsFallenNow(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_lastrespects/fallen", target);
        return typeof value === "number" ? value : 0;
    }

    /** 「自己 → 目标」这条三维通道里，有多少个真实可见、未被墙挡住的敌人（不含目标本身）。 */
    function lastrespectsCorridor(context: WorldBehavior.Context, self: WorldMethods.Subject, target: WorldMethods.Subject,
        reach: number, width: number): number {
        const world = CompanionBehavior.world(context);
        const dx = target.point[0] - self.point[0], dy = target.point[1] - self.point[1], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (length < 0.01) return 0;
        const ux = dx / length, uy = dy / length, uz = dz / length;
        const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
            const ox = other.point[0] - self.point[0], oy = other.point[1] - self.point[1], oz = other.point[2] - self.point[2];
            const along = ox * ux + oy * uy + oz * uz;
            if (along < 0 || along > reach) continue;
            const px = ox - ux * along, py = oy - uy * along, pz = oz - uz * along;
            if (Math.sqrt(px * px + py * py + pz * pz) > width) continue;
            if (!world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(other.point))) continue;
            count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(lastrespectsId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            return !context.facts.mounted;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            const limit = CompanionBehavior.ai<number>(capability, "maxChase", 9);
            let value = gap <= capability.data.range ? 26 : gap <= limit ? 14 : 4;
            if (CompanionBehavior.ai<boolean>(capability, "mournful", true))
                value += Math.min(24, lastrespectsFallenNow(context, self) * 6);
            // 随行式沿路清场：通道里挡着的敌人越多越值得先手。
            if (capability.data.config && capability.data.config.trail === true) {
                const world = CompanionBehavior.world(context);
                const width = p(lastrespectsId, "width", { world: world, actor: world.source(), detail: { values: capability.data.config } });
                value += Math.min(15, lastrespectsCorridor(context, self, target, capability.data.range, width) * 5);
            }
            return Math.min(80, value);
        }
    });

    addPreferences(lastrespectsId, {}, [
        field(pathOf("trail"), "随行", "boolean", {
            help: "开启（随行）：鬼影沿路随行，这一扫变成一条走廊、打到路上所有人（每人 ×0.85），扫过更宽、冷却 +4——适合沿路清场。关闭（送行）：鬼影聚到一点，只打一个目标、单发 ×1.1、节奏更快。"
        }),
        field(pathOf("ai.maxChase"), "先手距离", "number", {
            min: 2, max: 18, step: 1,
            help: "这个距离之内愿意先走过去扫，超出则压到低优先（仍会交给共享接近逻辑走近）。它要走一段才落扫，调大也只是稍微更早起步。"
        }),
        field(pathOf("ai.mournful"), "为倒下者出手", "boolean", {
            help: "开启：同阵营每有一位伙伴倒下就抬高优先级——替他们送行正是这一记的时机；关闭：不问倒下记录，一律按普通近身攻击排序。"
        })
    ]);
}
