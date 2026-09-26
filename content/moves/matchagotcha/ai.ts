/**
 * 刷刷茶炮 / matchagotcha 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 11）格内。它是一记远程炮击，
 *   `priority` 在自身血量低于 `ai.healBelow`（默认 0.85）时抬一档（溅射到的每个目标都回一点），
 *   射程内挤着两个以上敌人时再加一档（茶汤一次烫到一片），目标被冻住时抬一档（热茶顺手解冻）。
 *   更远的先手交给共享接近逻辑。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。
 * 瞄哪里：不直接砸在某个人身上，而是取这一小撮敌人的水平中心、落到他们脚下的地面，茶圈把一圈人都罩进去；
 *   友方不算进中心，也不拿友方当取血的锚点。
 * 放完之后：落点周围一片都结算过，不占手，下一次决策就能再泼。
 */
namespace CompanionBehavior {
    function matchaGotchaCrowd(item: WorldBehavior.Capability, context: WorldBehavior.Context, self: CompanionBehavior.Entity): number {
        const reach = item.data.range, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= reach) count++;
        }
        return count;
    }

    registerUse("matchagotcha", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        /** 瞄点：以目标为中心，把邻近敌人（不含友方）的平均位置落到地面，让茶圈罩住这一小片。 */
        target: function (context, capability, selected) {
            const self = CompanionBehavior.source(context), world = CompanionBehavior.world(context);
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            let cx = selected.point[0], cz = selected.point[2], count = 1;
            for (let index = 0; index < nearby.length; index++) {
                const other = nearby[index];
                if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
                if (CompanionBehavior.distance(other.point, selected.point) > 2.4) continue;
                cx += other.point[0]; cz += other.point[2]; count++;
            }
            const actor = world.actor(selected.ref), body = actor === null ? null : world.observe(actor);
            const ground = body !== null ? body.boundsMin().y() : selected.point[1] - (selected.height || 1.4) * 0.5;
            const point = JSON.parse(JSON.stringify(selected));
            point.ref = "";
            point.point = [cx / count, ground + 0.1, cz / count];
            return point;
        },
        priority: function (context, capability, target) {
            if (!target || !capability) return 0;
            const self = CompanionBehavior.source(context);
            const dist = CompanionBehavior.distance(self.point, target.point);
            if (dist > CompanionBehavior.ai<number>(capability, "maxChase", 11)) return 0;
            const crowd = matchaGotchaCrowd(capability, context, self);
            let score = 17;
            if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "healBelow", 0.85)) score += 14;
            if (crowd >= 2) score += 6 + Math.min(12, crowd * 4);
            if (CompanionBehavior.status(context, target, "frozen")) score += 10;
            if (CompanionBehavior.status(context, target, "burn")) score -= 5;
            if (dist >= 4) score += 5; else if (dist <= capability.data.range) score += 4;
            return score;
        }
    });

    PokemonSkills.addPreferences("matchagotcha", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("whisk"), "刷泡式", "boolean", {
            help: "开启：一次泼到落点周围一片、溅射更宽、灼伤概率更高，但每个目标更轻、抽得更少、射程更近。关闭：点茶式，一束聚焦、单点更重、抽得更足、射得更远。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 18, step: 1,
            help: "超过这个距离就不主动泼茶，先走近。越大越愿意从更远处先手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.healBelow"), "回血优先阈值", "number", {
            min: 0.3, max: 1, step: 0.05,
            help: "自身生命低于这个比例时，把刷刷茶炮当续航手段优先出手；越高越早开始靠它回血。"
        })
    ]);
}
