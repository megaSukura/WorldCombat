/**
 * 鲜花防守 的伙伴 AI 用途：这是这招自己的一套出手计划——开打前先把身边一圈草属性护起来。
 *
 * 什么局面有意义：场上有一个可见的威胁、且在 ai.maxChase 内；ai.pack 一圈里至少站着一个还没被花浪扫过的
 *   草属性伙伴（自己也算）。有交战需求才准备。
 * 对谁出手：自己；花浪以自身为心，草属性伙伴在范围内会一起被扫到，不需要选中队友。
 * 够不到怎么办：不需要够——由共用任务直接施放；威胁太远就先不推花浪。
 * 候选之间怎么排：一圈里自己人多于草属性对手时 priority 86（这一推净赚）；否则 66（顺带也护了对手的草属性，
 *   只有当自己人也站在圈里才值得）。
 * 配置：ai.maxChase 是威胁距离，ai.pack 是这招眼里的「一圈」半径。
 */
namespace CompanionBehavior {
    const flowershieldChase = PokemonSkills.number("ai.maxChase", "开打距离", 4, 24, 1);
    flowershieldChase.help = "威胁进入这个距离内才考虑推花浪；越大越早开始。";
    const flowershieldPack = PokemonSkills.number("ai.pack", "花浪范围", 2, 10, 1);
    flowershieldPack.help = "把这招眼里的一圈算多大；越大越愿意为稍远的草属性伙伴推花浪。";

    PokemonSkills.addPreferences(PokemonSkills.flowershieldId, {}, [flowershieldChase, flowershieldPack]);

    function flowershieldIsGrass(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("grass") >= 0;
    }
    function flowershieldCounts(context: WorldBehavior.Context, item: WorldBehavior.Capability): { friends: number; foes: number } {
        const self = source(context), pack = ai<number>(item, "pack", 6);
        let friends = 0, foes = 0;
        const examine = function (other: Entity): void {
            if (String(other.ref) !== String(self.ref) && distance(other.point, self.point) > pack) return;
            if (!flowershieldIsGrass(context, other)) return;
            if (status(context, other, PokemonSkills.flowershieldStatus)) return;
            if (String(other.ref) === String(self.ref) || other.friendly) friends++;
            else foes++;
        };
        examine(self);
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) examine(nearby[i]);
        return { friends: friends, foes: foes };
    }

    registerUse(PokemonSkills.flowershieldId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            const counts = flowershieldCounts(context, item);
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
            return counts.friends > 0;
        },
        accepts: function () { return true; },
        priority: function (context, item, _target) {
            const counts = flowershieldCounts(context, item);
            if (counts.friends === 0) return 0;
            return counts.friends > counts.foes ? 86 : 66;
        }
    });
}
