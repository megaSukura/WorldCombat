/**
 * 耕地 的伙伴 AI 用途：这是这招自己的一套出手计划——把土翻在草属性伙伴脚下。
 *
 * 什么局面有意义：场上有一个可见的威胁、且在 ai.maxChase 内；或者身边有可照料的活作物（工作用途）。
 *   附近至少站着一个还没被这块土喂养过的草属性（自己也算）。有交战需求或工作需求时才准备翻土。
 * 对谁出手：离自己最近的、还没沾上黑土的草属性；自己也是草属性时优先翻自己脚下的土。
 * 够不到怎么办：`target` 把施放点定在那个草属性身上，共享任务把身体带到 reach 内再下耙。
 * 放完之后：那块土留下来，草属性站上去就变强；身上还带着 `world_combat:status/plowed` 时不重复翻。
 * 敌方草占多数时谨慎：把土翻给对面草属性的风险更高，优先级压低，只在没有更好的选择时才用。
 * 配置：ai.maxChase 限制愿意为谁跑多远。
 */
namespace CompanionBehavior {
    const rototillerChase = PokemonSkills.number("ai.maxChase", "翻土距离", 4, 24, 1);
    rototillerChase.help = "草属性伙伴离自己这个距离以内才考虑翻土；调小只在身边翻，调大愿意主动靠过去。";

    PokemonSkills.addPreferences(PokemonSkills.rototillerId, {}, [rototillerChase]);

    /** 只读探针：执行与 AI 共用同一份草属性资格（现行属性层一致）。 */
    registerFact("world_combat:rototiller_recipient", function (access: CombatWorld, actor: CombatActor, _argument: any): boolean {
        return PokemonSkills.rototillerQualifies(access, actor);
    });
    function rototillerIsGrass(context: WorldBehavior.Context, target: Entity): boolean {
        return fact<boolean>(context, "world_combat:rototiller_recipient", target) === true;
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
    /** 附近的草属性按敌我计数（同一只不重复）；用来判断敌方草是否占多数。 */
    function rototillerGrass(context: WorldBehavior.Context): { allies: number; enemies: number } {
        const self = source(context), seen: string[] = [];
        let allies = 0, enemies = 0;
        const examine = function (other: Entity): void {
            const ref = String(other.ref);
            if (seen.indexOf(ref) >= 0) return;
            seen.push(ref);
            if (!rototillerIsGrass(context, other)) return;
            if (other.friendly === false) enemies++;
            else if (other.health > 0) allies++;
        };
        examine(self);
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) examine(nearby[i]);
        return { allies: allies, enemies: enemies };
    }
    /** 只认真正的作物，不把普通草皮当成工作；没有威胁时靠它决定要不要专程翻地照料。 */
    const rototillerCrops = ["wheat", "carrot", "potato", "beetroot", "melon", "pumpkin", "sugar_cane",
        "bamboo", "nether_wart", "cocoa", "berry", "kelp"];
    function rototillerWork(context: WorldBehavior.Context, pick: Entity): boolean {
        try {
            const world = CompanionBehavior.world(context);
            const sites = WorldCultivation.sites(world, CompanionBehavior.point(pick.point), 2);
            for (let i = 0; i < sites.length; i++) {
                const state = String(sites[i].state).toLowerCase();
                for (let j = 0; j < rototillerCrops.length; j++) if (state.indexOf(rototillerCrops[j]) >= 0) return true;
            }
            return false;
        } catch (error) { return false; }
    }

    registerUse(PokemonSkills.rototillerId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            const pick = rototillerPick(context, item);
            if (!pick) return false;
            const threat = context.senses["world_combat:threat"];
            if (threat && distance(source(context).point, threat.point) <= ai<number>(item, "maxChase", 12)) return true;
            return rototillerWork(context, pick);
        },
        accepts: function () { return true; },
        target: function (context, item, target) { return rototillerPick(context, item) || target; },
        approachTarget: function (context, item, target) { return rototillerPick(context, item) || target; },
        priority: function (context, item, _target) {
            const pick = rototillerPick(context, item);
            if (!pick) return 0;
            const self = source(context), counts = rototillerGrass(context);
            // 翻给敌方草属性占多数的局面：慎用，压低到只在没有更合适选择时出手。
            if (counts.enemies > counts.allies) return 18;
            if (String(pick.ref) === String(self.ref)) return 62;
            const threat = context.senses["world_combat:threat"];
            if (threat && distance(pick.point, threat.point) < distance(self.point, threat.point)) return 88;
            return 74;
        }
    });
}
