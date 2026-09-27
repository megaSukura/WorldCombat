/**
 * 舌舔 / lick 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；够不到交给共享接近逻辑。
 * 这是一记便宜的长舌单点，价值在麻痹，所以 `ai.opening` 默认是“优先未麻痹目标”——把这一舔留给还能被麻的人，
 * 但已经发麻的敌人也不会被排除，仍可当普通轻击舔中。速度快的伙伴舌长更长、麻意更重，由公式承担。
 *
 * 前排阻挡：舌头真实首碰决定落点，所以若一条线的前排站着**同伴或自己**，这一舔会先被同伴挡住、够不到目标，
 * priority 直接归零（交给选择前排敌人的候选）；若是别的敌人挡在中间，这一舔仍会舔中它，只略微降分，让真正
 * 站在前排的敌人优先。
 */
namespace PokemonSkills {
    /** 目标前方是否站着别的身体：返回阻挡者，按到施法者的水平距离判定；没有返回 null。 */
    function lickBlocker(context: WorldBehavior.Context, target: CompanionBehavior.Entity): CompanionBehavior.Entity | null {
        const self = CompanionBehavior.source(context);
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        const from = CompanionBehavior.point(self.point), to = CompanionBehavior.point(target.point);
        const delta = to.minus(from), length = Math.sqrt(delta.x() * delta.x() + delta.y() * delta.y() + delta.z() * delta.z());
        if (!(length > 0.4)) return null;
        const heading = delta.unit();
        let best: CompanionBehavior.Entity | null = null, bestAlong = length;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.ref === self.ref || other.health <= 0) continue;
            const point = CompanionBehavior.point(other.point);
            const along = point.minus(from).x() * heading.x() + point.minus(from).y() * heading.y() + point.minus(from).z() * heading.z();
            if (along <= 0.2 || along >= bestAlong) continue;
            const closest = from.plus(heading.scale(along));
            const offset = point.minus(closest).length();
            if (offset <= (other.width || 0.9) / 2 + 0.3) { best = other; bestAlong = along; }
        }
        return best;
    }

    CompanionBehavior.registerUse("lick", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            // 已麻痹的目标也能当普通轻击舔；「只对未麻痹」只体现在优先级上，不再排除。
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const blocker = lickBlocker(context, target);
            if (blocker !== null && blocker.friendly) return 0;
            let score = 18;
            if (blocker !== null) score -= 6;
            const numb = CompanionBehavior.status(context, target, "paralysis");
            if (!numb) score += 8;
            else if (CompanionBehavior.ai<string>(capability, "opening", "unparalyzed") === "unparalyzed") score -= 4;
            return Math.max(0, score);
        }
    });

    addPreferences("lick", {}, [
        field(pathOf("coil"), "缠绕式", "boolean", {
            help: "开启：命中后把目标往身前拽一段、麻痹概率略高，但起手多 3 刻、收招与冷却更长。关闭：快舔，出手更快、代价更小，只留伤害与麻意。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不伸舌，先走近。越大越会在长舌够得到的边缘先手。"
        }),
        field(pathOf("ai.opening"), "出手时机", "choice", {
            options: [
                { value: "anytime", label: "随时" },
                { value: "unparalyzed", label: "优先未麻痹目标" }
            ],
            help: "默认优先舔还没发麻的目标，把麻痹留给还能被麻的人，但已经发麻的敌人也能被当作普通轻击舔中；选“随时”则一视同仁。"
        })
    ]);
}
