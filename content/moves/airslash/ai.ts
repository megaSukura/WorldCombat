/**
 * 空气斩 / airslash 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 15）格内。它是本组打得最远的招，
 *   所以越远越先被考虑（在对手进入自己射程前先手切一刀）；贴身后依然可用，只是让位给更便宜的重击。
 * 选择倾向：目标身后还排着别的敌人时优先——这一刀会沿直线穿透，站成一排的人会一起被切开。
 */
namespace PokemonSkills {
    /** 目标身后沿同一条线还站着几个敌人（供贯穿加分）。 */
    function airslashAligned(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const self = CompanionBehavior.source(context).point;
        const ax = target.point[0] - self[0], az = target.point[2] - self[2];
        const length = Math.sqrt(ax * ax + az * az);
        if (length < 0.5) return 0;
        const ux = ax / length, uz = az / length;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const dx = other.point[0] - self[0], dz = other.point[2] - self[2];
            const along = dx * ux + dz * uz;
            if (along <= length || along > length + 9) continue;
            const across = Math.abs(dx * uz - dz * ux);
            if (across <= 1.1) count++;
        }
        return count;
    }

    function airslashWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 15);
    }

    CompanionBehavior.registerUse(airslashId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return airslashWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !airslashWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let base = distance > 6 ? 30 : 20;
            const aligned = airslashAligned(context, target);
            if (aligned > 0) base += Math.min(20, aligned * 8);
            return base;
        }
    });

    addPreferences(airslashId, {}, [
        field(pathOf("razor"), "利刃式", "boolean", {
            help: "开启：飞得更快、能多贯穿一个目标、射程略长，但刃身更窄、每刀更轻、畏缩更不稳、冷却更长，适合点掉成排的脆皮。关闭（阔风式，默认）：刃身更宽、每刀更重、畏缩更稳，但飞得更慢、少一个贯穿。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 24, step: 1,
            help: "超过这个距离就不主动出手，先走近。越大越会在远处先手切割，也越容易在起手窗口被对手走位躲开。"
        })
    ]);
}
