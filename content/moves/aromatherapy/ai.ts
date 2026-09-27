/**
 * 芳香治疗 的伙伴 AI 用途：这是一片整队的净化香云，不是伤害招。
 *
 * 什么局面有意义：自己或附近伙伴身上带着有害状态效果，且施放范围内存在一个落点能把其中至少 `ai.cleanseCount`
 *   个真的罩进香圈。它不再是「数到远方的病人就往脚下铺」——候选落点取自己与每个患者的身体位置，按实际香云半径
 *   数每个落点能覆盖几个患者，选覆盖最多的那一个；落点必须落在施放范围内（AI 不追人）。
 * 对谁出手：point 招，AI 以算出的最佳落点为施放点；`accepts` 只确认共享给的自身目标有效。
 * 什么时候最急：自己也被挂上异常时 priority 100；否则 50，等共享交战次序轮到准备动作再铺。
 * 够不到怎么办：AI 不追人；患者都在施放范围之外就先不铺（铺了也罩不到）。
 * 配置：dense（浓香／弥香）在参数层改变半径与停留；ai.cleanseCount 是至少覆盖几人，ai.scentReach 是多少距离内的患者进入候选。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_aromatherapy/harmful", (world, actor) => CombatStatus.hasHarmful(world, actor));
    const aromatherapyCleanseCount = PokemonSkills.number("ai.cleanseCount", "铺云门限", 1, 4, 1);
    aromatherapyCleanseCount.help = "一片香云至少要罩住这么多个带异常的伙伴（含自己）才值得铺；调到 1 一有人中招就铺，调高则等更多人一起中招、一片云罩一队。";
    const aromatherapyScentReach = PokemonSkills.number("ai.scentReach", "香云尺度", 2, 6, 1);
    aromatherapyScentReach.help = "只有离自己这个距离以内的伙伴才进入候选；调小只在贴身时铺，调大愿意为稍远的伙伴铺云。";

    PokemonSkills.addPreferences("aromatherapy", { dense: false, ai: { cleanseCount: 1, scentReach: 4 } },
        [aromatherapyCleanseCount, aromatherapyScentReach]);

    /** 自己与 `within` 距离内所有带着有害状态的伙伴。 */
    function aromatherapyAfflicted(context: WorldBehavior.Context, within: number): Entity[] {
        const self = source(context), found: Entity[] = [];
        if (fact<boolean>(context, "world_combat:move_aromatherapy/harmful", self)) found.push(self);
        (context.facts.nearby as Entity[]).forEach(function (other) {
            if (other.friendly && other.health > 0 && String(other.ref) !== String(self.ref)
                && distance(self.point, other.point) <= within
                && fact<boolean>(context, "world_combat:move_aromatherapy/harmful", other)) found.push(other);
        });
        return found;
    }

    /** 这份配置实际铺出的香云半径，与出招走的同一棵公式。 */
    function aromatherapyRadius(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(1.5, PokemonSkills.p(PokemonSkills.aromatherapyId, "scentRadius",
                { world: world, actor: world.source(), skill: PokemonSkills.skills[PokemonSkills.aromatherapyId],
                    detail: { values: capability.data.config || {} } }));
        } catch (error) { return 3.0; }
    }

    function aromatherapyHorizontal(a: number[], b: number[]): number {
        const dx = a[0] - b[0], dz = a[2] - b[2];
        return Math.sqrt(dx * dx + dz * dz);
    }

    /** 施放范围内能罩住最多患者的落点，没有则 null。落点取自己与每个患者的身体位置。 */
    function aromatherapyBest(context: WorldBehavior.Context, capability: WorldBehavior.Capability): Entity | null {
        const self = source(context), reach = Number(capability.data.range) || 5;
        const afflicted = aromatherapyAfflicted(context, ai<number>(capability, "scentReach", 4));
        if (!afflicted.length) return null;
        const radius = aromatherapyRadius(context, capability);
        let best: Entity | null = null, bestCovered = 0;
        ([self].concat(afflicted)).forEach(function (candidate) {
            if (distance(self.point, candidate.point) > reach) return;
            let covered = 0;
            afflicted.forEach(function (ally) {
                if (aromatherapyHorizontal(ally.point, candidate.point) <= radius) covered++;
            });
            if (covered > bestCovered) { bestCovered = covered; best = candidate; }
        });
        return bestCovered >= Math.max(1, ai<number>(capability, "cleanseCount", 1)) ? best : null;
    }

    registerUse("aromatherapy", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return Number(capability.data.range) || 0; },
        ready: function () { return true; },
        available: function (context, capability) {
            if (context.facts.mounted) return false;
            return aromatherapyBest(context, capability) !== null;
        },
        accepts: function (_context, _capability, target) { return !!target; },
        target: function (context, capability, _selected) {
            const best = aromatherapyBest(context, capability);
            if (best === null) return null;
            const aim = JSON.parse(JSON.stringify(best));
            aim.ref = "";
            return aim;
        },
        approachTarget: function (context) { return source(context); },
        priority: function (context, capability) {
            const self = source(context);
            const own = fact<boolean>(context, "world_combat:move_aromatherapy/harmful", self) === true;
            if (aromatherapyBest(context, capability) === null) return 0;
            return own ? 100 : 50;
        }
    });
}
