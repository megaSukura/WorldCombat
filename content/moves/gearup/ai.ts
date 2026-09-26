/**
 * 辅助齿轮 的伙伴 AI 用途：先检查正负电特性、铁傀儡身体或手持金属工具的传动资格，再按身边友方与威胁选择时机。
 * 资格只在施放这一刻读一次；AI 找的是**还没接上动力**的合格友方，优先给正要接战的前排。
 */
namespace CompanionBehavior {
    const gearupChase = PokemonSkills.number("ai.maxChase", "开打距离", 4, 24, 1);
    gearupChase.help = "威胁与要传动的伙伴进入这个距离内才考虑启动齿轮；越大越早开始、越愿意跑过去。";
    const gearupPack = PokemonSkills.number("ai.pack", "传动范围", 2, 10, 1);
    gearupPack.help = "把这招眼里的一圈算多大；调大更愿意为稍远的正负电伙伴传动，也离得更远就收手。";

    PokemonSkills.addPreferences(PokemonSkills.gearupId, {}, [gearupChase, gearupPack]);

    /** 只读探针：把一只宝可梦的现行特性换算成 plus／minus／空，供 AI 挑选要传动的伙伴。 */
    registerFact("world_combat:gearup_polarity", function (access: CombatWorld, actor: CombatActor, _argument: any): string {
        return PokemonSkills.gearupPolarity(access, actor);
    });

    function gearupIsPolar(context: WorldBehavior.Context, target: Entity): boolean {
        return !!fact<string>(context, "world_combat:gearup_polarity", target);
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
    /** 贴身一圈里还没被传动的正负电友方数量，以及有几个是别人（自己以外）。 */
    function gearupCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): { friends: number; others: number } {
        const self = source(context), pack = ai<number>(item, "pack", 4);
        let friends = 0, others = 0;
        const examine = function (other: Entity): void {
            if (String(other.ref) !== String(self.ref) && distance(other.point, self.point) > pack) return;
            if (String(other.ref) !== String(self.ref) && !other.friendly) return;
            if (!gearupIsPolar(context, other)) return;
            if (status(context, other, PokemonSkills.gearupStatus)) return;
            friends++;
            if (String(other.ref) !== String(self.ref)) others++;
        };
        examine(self);
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) examine(nearby[i]);
        return { friends: friends, others: others };
    }

    registerUse(PokemonSkills.gearupId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return Math.max(1.2, ai<number>(item, "pack", 4) * 0.5); },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            const pick = gearupPick(context, item);
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
            return !!pick;
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
