/**
 * 磁场操控 的伙伴 AI 用途：这是这招自己的一套出手计划——走到正负电伙伴身边，在自己脚下立一片磁场，
 * 把它们一起咬住。
 *
 * 什么局面有意义：场上有一个可见的威胁、且在 ai.maxChase 内；附近有一个还没被磁场咬住的正电／负电己方
 *   （自己也算）。没有威胁时只在整备命令（驻守／自主／工作）下立一次。
 * 对谁出手：最近的、还没被咬住的正负电伙伴；磁场以自身落地为心，所以自己就是锚点。
 * 够不到怎么办：`approachTarget` 指向自身，就地立磁场；磁场半径会罩住已经在身边的伙伴，
 *   离得太远的伙伴等它走进来再被咬住。
 * 候选之间怎么排：圈里还有别的正负电伙伴时 84，只有自己时 60。
 * 配置：ai.maxChase 是威胁与挑选伙伴的距离，ai.pack 是这招眼里的「一圈」半径。
 */
namespace CompanionBehavior {
    const magneticfluxChase = PokemonSkills.number("ai.maxChase", "开打距离", 4, 24, 1);
    magneticfluxChase.help = "威胁与要罩住的伙伴进入这个距离内才考虑立磁场；越大越早开始、越愿意跑过去。";
    const magneticfluxPack = PokemonSkills.number("ai.pack", "磁场范围", 2, 10, 1);
    magneticfluxPack.help = "把这招眼里的一圈算多大；调大更愿意为稍远的正负电伙伴立磁场，也离得更远就落场。";

    PokemonSkills.addPreferences(PokemonSkills.magneticfluxId, {}, [magneticfluxChase, magneticfluxPack]);

    /** 只读探针：把一只宝可梦的现行特性换算成 plus／minus／空，供 AI 挑选要罩住的伙伴。 */
    registerFact("world_combat:magneticflux_polarity", function (access: CombatWorld, actor: CombatActor, _argument: any): string {
        if (String(actor.domain()) !== "cobblemon" || !access.valid(actor)) return "";
        const pokemon = CobblemonCombat.pokemon(actor);
        const name = String(NativeEffects.ability(pokemon, NativeEffects.read(access, actor))).replace("cobblemon:", "").toLowerCase();
        return name === "plus" || name === "minus" ? name : "";
    });

    function magneticfluxIsPolar(context: WorldBehavior.Context, target: Entity): boolean {
        return !!fact<string>(context, "world_combat:magneticflux_polarity", target);
    }
    /** 最近的、还没被磁场咬住的正负电己方（自己也算）；没有就返回 null。 */
    function magneticfluxPick(context: WorldBehavior.Context, item: WorldBehavior.Capability): Entity | null {
        const self = source(context), chase = ai<number>(item, "maxChase", 12);
        let best: Entity | null = null, reach = Infinity;
        const examine = function (other: Entity): void {
            if (String(other.ref) !== String(self.ref)) {
                if (!other.friendly || other.health <= 0 || !other.visible) return;
                if (distance(self.point, other.point) > chase) return;
            }
            if (!magneticfluxIsPolar(context, other)) return;
            if (status(context, other, PokemonSkills.magneticfluxStatus)) return;
            const span = String(other.ref) === String(self.ref) ? 0 : distance(self.point, other.point);
            if (span < reach) { reach = span; best = other; }
        };
        examine(self);
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) examine(nearby[i]);
        return best;
    }
    /** 一圈（ai.pack）里还没被咬住的正负电友方数量，以及有几个是别人（自己以外）。 */
    function magneticfluxCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): { friends: number; others: number } {
        const self = source(context), pack = ai<number>(item, "pack", 6);
        let friends = 0, others = 0;
        const examine = function (other: Entity): void {
            if (String(other.ref) !== String(self.ref) && distance(other.point, self.point) > pack) return;
            if (String(other.ref) !== String(self.ref) && !other.friendly) return;
            if (!magneticfluxIsPolar(context, other)) return;
            if (status(context, other, PokemonSkills.magneticfluxStatus)) return;
            friends++;
            if (String(other.ref) !== String(self.ref)) others++;
        };
        examine(self);
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) examine(nearby[i]);
        return { friends: friends, others: others };
    }

    registerUse(PokemonSkills.magneticfluxId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return Math.max(1.5, ai<number>(item, "pack", 6) * 0.5); },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            const pick = magneticfluxPick(context, item);
            const threat = context.senses["world_combat:threat"];
            if (!threat) return (context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work") && !!pick;
            if (distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
            return !!pick;
        },
        accepts: function () { return true; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, item, _target) {
            const counts = magneticfluxCount(context, item);
            if (counts.friends === 0) return 0;
            return counts.others > 0 ? 84 : 60;
        }
    });
}
