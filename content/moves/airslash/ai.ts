/**
 * 空气斩 / airslash 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 15）格内。它是本组打得最远的招，
 *   所以越远越先被考虑（在对手进入自己射程前先手切一刀）；贴身后依然可用，只是让位给更便宜的重击。
 * 选择倾向：目标身后还排着别的敌人时优先——这一刀会沿直线穿透，站成一排的人会一起被切开；
 *   前方被地形挡住（`world.clear` 不通）时降权——刃会先撞墙断掉，够不到目标。
 */
namespace PokemonSkills {
    /** 目标身后沿同一条 3D 线还站着几个敌人（供贯穿加分）；线宽、有效程长与贯穿上限取本招当前实际参数。 */
    function airslashAligned(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const self = CompanionBehavior.source(context).point;
        const world = CompanionBehavior.world(context);
        let reach = Number(capability.data.range) || 11, radius = 0.36, cap = 1;
        try {
            const values = { world: world, actor: world.source(), detail: { values: capability.data.config } };
            reach = Math.max(1, p(airslashId, "reach", values));
            radius = Math.max(0.1, p(airslashId, "radius", values));
            cap = Math.max(0, Math.round(p(airslashId, "pierce", values)));
        } catch (error) { }
        if (cap <= 0) return 0;
        const ax = target.point[0] - self[0], ay = target.point[1] - self[1], az = target.point[2] - self[2];
        const length = Math.sqrt(ax * ax + ay * ay + az * az);
        if (length < 0.5) return 0;
        const ux = ax / length, uy = ay / length, uz = az / length;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const dx = other.point[0] - self[0], dy = other.point[1] - self[1], dz = other.point[2] - self[2];
            const along = dx * ux + dy * uy + dz * uz;
            if (along <= length || along > reach) continue;
            const px = dx - along * ux, py = dy - along * uy, pz = dz - along * uz;
            const half = typeof other.width === "number" && isFinite(other.width) && other.width > 0 ? other.width / 2 : 0.3;
            if (Math.sqrt(px * px + py * py + pz * pz) > radius + half) continue;
            // 后排也要这条线本身通到：中间有墙就只能穿到墙为止。
            if (!world.clear(CompanionBehavior.point(self), CompanionBehavior.point(other.point))) continue;
            count++;
            if (count >= cap) break;
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
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let base = distance > 6 ? 30 : 20;
            const aligned = airslashAligned(context, capability, target);
            if (aligned > 0) base += Math.min(20, aligned * 8);
            const world = CompanionBehavior.world(context);
            if (!world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point)))
                base = Math.max(4, base - 14);
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
