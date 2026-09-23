/**
 * 辅助齿轮 的伙伴 AI 用途：这是这招自己的一套出手计划——贴近正负电伙伴，把齿轮的动力直接传过去。
 *
 * 什么局面有意义：场上有一个可见的威胁、且在 ai.maxChase 内；附近有一个还没被传动的正电／负电己方
 *   （自己也算）。有交战需求才准备。
 * 对谁出手：最近的、还没被传动的正负电伙伴；齿链很短，所以自己就是锚点。
 * 够不到怎么办：`approachTarget` 指向自身，就地啮合；齿链半径会带上已经贴在身边的伙伴，
 *   离得太远的伙伴等它贴近再传动。
 * 候选之间怎么排：身边还有别的正负电伙伴时 82，只有自己时 58（先走近再传）。
 * 配置：ai.maxChase 是威胁与挑选伙伴的距离，ai.pack 是这招眼里的「一圈」半径。
 */
namespace CompanionBehavior {
    const gearupChase = PokemonSkills.number("ai.maxChase", "开打距离", 4, 24, 1);
    gearupChase.help = "威胁与要传动的伙伴进入这个距离内才考虑启动齿轮；越大越早开始、越愿意跑过去。";
    const gearupPack = PokemonSkills.number("ai.pack", "传动范围", 2, 10, 1);
    gearupPack.help = "把这招眼里的一圈算多大；调大更愿意为稍远的正负电伙伴传动，也离得更远就收手。";

    PokemonSkills.addPreferences(PokemonSkills.gearupId, {}, [gearupChase, gearupPack]);

    /** 只读探针：把一只宝可梦的现行特性换算成 plus／minus／空，供 AI 挑选要传动的伙伴。 */
    registerFact("world_combat:gearup_polarity", function (access: CombatWorld, actor: CombatActor, _argument: any): string {
        if (String(actor.domain()) !== "cobblemon" || !access.valid(actor)) return "";
        const pokemon = CobblemonCombat.pokemon(actor);
        const name = String(NativeEffects.ability(pokemon, NativeEffects.read(access, actor))).replace("cobblemon:", "").toLowerCase();
        return name === "plus" || name === "minus" ? name : "";
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
            return counts.others > 0 ? 82 : 58;
        }
    });
}
