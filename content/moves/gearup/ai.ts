/**
 * 辅助齿轮 的伙伴 AI 用途：先检查正负电特性、铁傀儡身体或手持金属工具的传动资格，再按身边友方与威胁选择时机。
 * 资格只在施放这一刻读一次；AI 找的是**还没接上动力**的合格友方，按本招实际齿链半径与真实通视计人数，
 * 够不到的远处候选不算，因此不会为范围外的人空施。
 */
namespace CompanionBehavior {
    const gearupChase = PokemonSkills.number("ai.maxChase", "开打距离", 4, 24, 1);
    gearupChase.help = "威胁与要传动的伙伴进入这个距离内才考虑启动齿轮；越大越早开始、越愿意跑过去。";
    const gearupPack = PokemonSkills.number("ai.pack", "传动范围", 2, 10, 1);
    gearupPack.help = "把这招眼里的一圈算多大；实际生效范围还受本招自己算出的齿链半径限制，调大最多覆盖到齿链边缘。";

    PokemonSkills.addPreferences(PokemonSkills.gearupId, {}, [gearupChase, gearupPack]);

    /** 只读探针：把一只宝可梦的现行特性换算成 plus／minus／空，供 AI 挑选要传动的伙伴。 */
    registerFact("world_combat:gearup_polarity", function (access: CombatWorld, actor: CombatActor, _argument: any): string {
        return PokemonSkills.gearupPolarity(access, actor);
    });

    function gearupIsPolar(context: WorldBehavior.Context, target: Entity): boolean {
        return !!fact<string>(context, "world_combat:gearup_polarity", target);
    }

    /** 本招当前实际齿链半径（含体型/速度与稳啮选择），求值失败退回 pack。 */
    function gearupChain(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            const chain = PokemonSkills.p(PokemonSkills.gearupId, "chain",
                { world: world, actor: world.source(), detail: { values: item.data.config } });
            return isFinite(chain) ? chain : ai<number>(item, "pack", 4);
        } catch (error) { return ai<number>(item, "pack", 4); }
    }

    /** 最近的、还没被传动的正负电己方（自己也算）；没有就返回 null。 */
    function gearupPick(context: WorldBehavior.Context, item: WorldBehavior.Capability): Entity | null {
        const self = source(context), chase = ai<number>(item, "maxChase", 12);
        let best: Entity | null = null, reach = Infinity;
        const examine = function (other: Entity): void {
            if (String(other.ref) !== String(self.ref)) {
                if (!other.friendly || other.health <= 0 || !other.visible) return;
                if (distance(self.point, other.point) > chase) return;
            }
            if (!gearupIsPolar(context, other)) return;
            if (status(context, other, PokemonSkills.gearupStatus)) return;
            const span = String(other.ref) === String(self.ref) ? 0 : distance(self.point, other.point);
            if (span < reach) { reach = span; best = other; }
        };
        examine(self);
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) examine(nearby[i]);
        return best;
    }

    /**
     * 贴身一圈里还没被传动的合格友方数量（自己也算）与其中几个是别人。
     * 半径取 min(pack, 实际齿链半径)，且每个都要与施法者真实通视——墙后的人这一拍接不上。
     */
    function gearupCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): { friends: number; others: number } {
        const self = source(context), world = CompanionBehavior.world(context);
        const span = Math.max(1.2, Math.min(ai<number>(item, "pack", 4), gearupChain(context, item)));
        const origin = CompanionBehavior.point(self.point);
        let friends = 0, others = 0;
        const examine = function (other: Entity): void {
            const same = String(other.ref) === String(self.ref);
            if (!same) {
                if (!other.friendly || other.health <= 0 || !other.visible) return;
                if (distance(other.point, self.point) > span) return;
                if (!world.clear(origin, CompanionBehavior.point(other.point))) return;
            }
            if (!gearupIsPolar(context, other)) return;
            if (status(context, other, PokemonSkills.gearupStatus)) return;
            friends++;
            if (!same) others++;
        };
        examine(self);
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) examine(nearby[i]);
        return { friends: friends, others: others };
    }

    registerUse(PokemonSkills.gearupId, {
        protocols: ["world_combat:fortify"],
        reach: function (context, item) { return Math.max(1.2, Math.min(ai<number>(item, "pack", 4), gearupChain(context, item)) * 0.5); },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            // 真实齿链内至少有一个还没接上动力的合格友方（含自己），否则这一拍会空转。
            if (gearupCount(context, item).friends === 0) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
            return true;
        },
        accepts: function () { return true; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, item, _target) {
            const counts = gearupCount(context, item);
            if (counts.friends === 0) return 0;
            const pick = gearupPick(context, item), self = source(context);
            const threat = context.senses["world_combat:threat"];
            // 受益人正顶在威胁面前时更值得现在传动；给身后的伙伴则按普通权重。
            const frontline = !!pick && !!threat && String(pick.ref) !== String(self.ref)
                && distance(pick.point, threat.point) <= distance(self.point, threat.point) + 2;
            if (counts.others > 0) return frontline ? 92 : 82;
            return frontline ? 70 : 58;
        }
    });
}
