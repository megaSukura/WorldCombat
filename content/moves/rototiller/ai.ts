/**
 * 耕地 的伙伴 AI 用途：这是这招自己的一套出手计划——把土翻在草属性伙伴脚下。
 *
 * 什么局面有意义：场上有一个可见的威胁、且在 ai.maxChase 内；附近至少站着一个还没被这块土喂养过的
 *   草属性（自己也算）。有交战需求时才准备翻土。
 * 对谁出手：离自己最近的、还没沾上黑土的草属性；自己也是草属性时优先翻自己脚下的土。
 * 够不到怎么办：`target` 把施放点定在那个草属性身上，共享任务把身体带到 reach 内再下耙。
 * 放完之后：那块土留下来，草属性站上去就变强；身上还带着 `world_combat:status/plowed` 时不重复翻。
 * 配置：ai.maxChase 限制愿意为谁跑多远。
 */
namespace CompanionBehavior {
    const rototillerChase = PokemonSkills.number("ai.maxChase", "翻土距离", 4, 24, 1);
    rototillerChase.help = "草属性伙伴离自己这个距离以内才考虑翻土；调小只在身边翻，调大愿意主动靠过去。";

    PokemonSkills.addPreferences(PokemonSkills.rototillerId, {}, [rototillerChase]);

    function rototillerIsGrass(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("grass") >= 0;
    }
    /** 最近的一个还没沾上黑土的草属性（自己也可）；没有就返回 null。 */
    function rototillerPick(context: WorldBehavior.Context, item: WorldBehavior.Capability): Entity | null {
        const self = source(context), chase = ai<number>(item, "maxChase", 12);
        let best: Entity | null = null, reach = Infinity;
        const examine = function (other: Entity): void {
            if (String(other.ref) === String(self.ref)) {
                if (!rototillerIsGrass(context, other)) return;
            } else {
                if (!other.friendly || other.health <= 0 || !other.visible) return;
                if (!rototillerIsGrass(context, other)) return;
                if (distance(self.point, other.point) > chase) return;
            }
            if (status(context, other, PokemonSkills.rototillerStatus)) return;
            const span = String(other.ref) === String(self.ref) ? 0 : distance(self.point, other.point);
            if (span < reach) { reach = span; best = other; }
        };
        examine(self);
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) examine(nearby[i]);
        return best;
    }

    registerUse(PokemonSkills.rototillerId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
            return !!rototillerPick(context, item);
        },
        accepts: function () { return true; },
        target: function (context, item, target) { return rototillerPick(context, item) || target; },
        approachTarget: function (context, item, target) { return rototillerPick(context, item) || target; },
        priority: function (context, item, _target) {
            const pick = rototillerPick(context, item);
            if (!pick) return 0;
            const self = source(context);
            if (String(pick.ref) === String(self.ref)) return 62;
            const threat = context.senses["world_combat:threat"];
            if (threat && distance(pick.point, threat.point) < distance(self.point, threat.point)) return 88;
            return 74;
        }
    });
}
