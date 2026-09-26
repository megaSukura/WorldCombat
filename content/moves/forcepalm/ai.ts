/**
 * 发劲 / forcepalm 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑，先走到贴身距离。
 * 这是一记接触掌击，`ai.preferNumb`（默认开）在目标还没被麻痹时把它排到前面——把这一掌的麻痹机会留给
 * 还能被麻的人；代价是可能反复追着未麻目标、放过眼前更该打的对象。关闭则只按威胁本身排序。
 * 透劲式不改变出手条件，只改变力道收在一个人身上还是透到身后；开启后，目标身后还排着敌人时收益更高，
 * 这类局面会被抬高（前后有敌时更值得上步按掌）。主目标不可接近时不会空放：命中由真实接触决定。
 */
namespace PokemonSkills {
    /** 另一个敌人是否落在「自己 → 目标」延长线上、目标身后 `reach` 内且偏离很小。 */
    function forcepalmBehind(self: WorldMethods.Subject, target: WorldMethods.Subject, other: WorldMethods.Subject, reach: number): boolean {
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return false;
        const ox = other.point[0] - target.point[0], oz = other.point[2] - target.point[2];
        const along = (ox * dx + oz * dz) / length;
        if (along <= 0.2 || along > reach) return false;
        const off = Math.abs((ox * dz - oz * dx) / length);
        return off <= Math.max(0.5, along * 0.1);
    }

    CompanionBehavior.registerUse("forcepalm", {
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
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range * 2.2) return 0;
            // 未麻痹的目标排序更前，把这一掌的麻痹机会留给还能被麻的人；已被麻的仍可出手，只是不优先。
            let score = CompanionBehavior.ai<boolean>(capability, "preferNumb", true) && !CompanionBehavior.status(context, target, "paralysis") ? 42 : 28;
            // 透劲开启且目标身后还排着敌人时收益更高，这类前后有敌的局面抬高优先。
            if (capability.data.config && capability.data.config.through === true) {
                const reach = capability.data.range;
                let behind = 0;
                const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                    if (forcepalmBehind(self, target, other, reach)) behind++;
                }
                if (behind > 0) score += 10 + Math.min(12, behind * 6);
            }
            return score;
        }
    });

    addPreferences("forcepalm", {}, [
        field(pathOf("through"), "透劲式", "boolean", {
            help: "开启：主击成功后，波从真实命中点透出、打到背后直线窄带上的最多两个目标（主目标那一下略轻、麻痹概率略低、冷却更长）。关闭（崩劲式，默认）：力道收在一个目标身上，单点更重、更容易打麻。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动贴身，先走近。越大越会在较远处就决定冲上去按掌。"
        }),
        field(pathOf("ai.preferNumb"), "优先打麻", "boolean", {
            help: "开启：目标还没麻痹时优先用它（这一掌的麻痹机会留给还能被麻的人）；关闭：只按威胁本身排序。"
        })
    ]);
}
