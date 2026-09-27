/**
 * 欢乐时光 / happyhour 的伙伴 AI 用途：这是这招自己的一套出手计划——开打前先摆开庆典，把之后的战果变现。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，身上还没有庆典光环，且圈内至少站着 ai.minFoes 个
 *   看得见的非友方。评分偏向「即将倒下」与「正在交战、短时间内会留下」的敌人；同一块地上队友已经铺了
 *   庆典时，重复铺场的价值减半，优先让已有的那圈继续收成。
 * 对谁出手：自己；庆典以自身为圆心铺开，不需要选中谁。
 * 够不到怎么办：不需要够——对手太远就先不铺，等它靠近再开，免得场地空放。
 * 放完之后：场地亮着的那段时间里，圈内每倒下一名对手都留下一捧真币；光环还在时不再重复施放。
 */
namespace CompanionBehavior {
    registerFact("world_combat:happyhour/radius", (access, actor, config) => PokemonSkills.p("happyhour", "radius",
        { world: access, actor: actor, detail: { values: config } }));
    function happyhourRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        return fact<number>(context, "world_combat:happyhour/radius", source(context), item.data.config)!;
    }
    /** 真实地面圈的 XZ 距离，和 happyhourCovers 的感应范围一致。 */
    function happyhourFlatDistance(a: number[], b: number[]): number {
        const dx = a[0] - b[0], dz = a[2] - b[2];
        return Math.sqrt(dx * dx + dz * dz);
    }
    /** 庆典半径内看得见的非友方数量（真实人数，供 ai.minFoes 判断）。 */
    function happyhourCrowd(context: WorldBehavior.Context, self: Entity, radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (happyhourFlatDistance(other.point, self.point) <= radius) count++;
        }
        return count;
    }
    /** 圈内战果评分：低血（即将倒下）加倍，最近挨过打的（正在交战）再加半分。 */
    function happyhourScore(context: WorldBehavior.Context, self: Entity, radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let score = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (happyhourFlatDistance(other.point, self.point) > radius) continue;
            let weight = 1;
            if (ratio(other) <= 0.5) weight += 1;
            if (other.hurtAgo <= 100) weight += 0.5;
            score += weight;
        }
        return score;
    }
    /** 自己这一点已被队友的庆典圈盖住：重复铺场的收益降低。 */
    function happyhourAlliedCover(context: WorldBehavior.Context, self: Entity): boolean {
        const access = world(context), areas = WorldEffects.areas(access, "world_combat:field/happyhour");
        for (let i = 0; i < areas.length; i++) {
            const area = areas[i];
            if (area.pending || area.source === String(self.ref)) continue;
            const owner = access.actor(area.source);
            if (owner === null || !access.valid(owner) || !access.friendly(owner)) continue;
            if (happyhourFlatDistance(area.position, self.point) <= area.radius) return true;
        }
        return false;
    }

    registerUse("happyhour", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability) {
            if (context.facts.mounted) return false;
            const self = source(context);
            if (status(context, self, "happyhour")) return false;
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (distance(self.point, threat.point) > ai<number>(capability, "maxChase", 12)) return false;
            const radius = happyhourRadius(context, capability);
            return happyhourCrowd(context, self, radius) >= ai<number>(capability, "minFoes", 1);
        },
        accepts: function (context, _capability, target) { return target.ref === source(context).ref; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, capability) {
            const self = source(context);
            const radius = happyhourRadius(context, capability);
            const score = happyhourScore(context, self, radius);
            if (score <= 0) return 0;
            let value = 44 + score * 8;
            if (happyhourAlliedCover(context, self)) value = Math.round(value * 0.5);
            return Math.max(12, Math.min(84, value));
        }
    });

    PokemonSkills.addPreferences("happyhour", { ai: { maxChase: 12, minFoes: 1, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 4, 24, 1),
        PokemonSkills.number("ai.minFoes", "庆典最少人数", 1, 4, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
