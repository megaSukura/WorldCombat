/**
 * 魔法粉 / magicpowder 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个看得见、够得着（ai.maxChase 内）、视线畅通的宝可梦威胁，它不是草属性（草把粉抖掉）、
 *   也不是纯超能力——只有这种目标才改写得动。
 * 什么时候最想出手：目标带格斗或毒属性时 priority 抬到 72——改写后我方超能招更好打；身边若有虫／幽灵／恶的
 *   队友，超能的弱点有人来吃，再抬 10；其余目标 56。
 * 对谁出手：当前威胁；已经带着 magicpowder 身份、草属性、或没有属性的目标跳过，避免浪费 20 发 PP。
 * 够不到怎么办：reach 就是撒粉距离（细撒档更短），由共享接近逻辑把身体带进范围。
 * 放完之后：超能力挂在目标身上、属性层随即生效；粉还在时不重复撒。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    const magicpowderSift = PokemonSkills.flag("sift", "细撒");
    magicpowderSift.help = "开启＝细撒：射程 ×0.65、起手 +2 刻、冷却 +14 刻，换来改写时长 ×1.7；关闭＝一把撒出：射得更远、起手更快、冷却更短，但改写更短。射程与持续互相取舍。";
    const magicpowderChase = PokemonSkills.number("ai.maxChase", "考虑距离", 2, 18, 1);
    magicpowderChase.help = "伙伴只在威胁离自己这么远以内时才考虑撒粉；调小只在贴身时用，调大愿意先追过去。";
    const magicpowderStation = PokemonSkills.flag("ai.leaveStation", "驻守时离位");
    magicpowderStation.help = "开启后，收到「驻守」指令时也会离开原位去撒粉。";

    PokemonSkills.addPreferences("magicpowder", { sift: false, ai: { maxChase: 11, leaveStation: false } },
        [magicpowderSift, magicpowderChase, magicpowderStation]);

    /** 有属性可换、不是纯超能力、也不是草属性的宝可梦才撒得上去；事实缺失（非宝可梦）一律跳过。 */
    function magicpowderEligible(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = pokemonFacts(context, target);
        if (!facts || !Array.isArray(facts.types) || facts.types.length === 0) return false;
        if (facts.types.indexOf("grass") >= 0) return false;
        return facts.types.join(",") !== "psychic";
    }

    /** 身边有没有带这些属性的队友：新增的虫／幽灵／恶弱点得有人来吃才值得改写。 */
    function magicpowderAllyHasType(context: WorldBehavior.Context, wanted: string[]): boolean {
        const self = source(context);
        const nearby = (context.facts.nearby || []) as Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.ref === self.ref || other.health <= 0) continue;
            const facts = pokemonFacts(context, other);
            if (facts && Array.isArray(facts.types) && facts.types.some(type => wanted.indexOf(type) >= 0)) return true;
        }
        return false;
    }

    function magicpowderWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "magicpowder")) return false;
        if (!magicpowderEligible(context, threat)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 11)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    registerUse("magicpowder", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || magicpowderWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !magicpowderWants(context, item, target)) return 0;
            const facts = pokemonFacts(context, target);
            if (!facts || !Array.isArray(facts.types)) return 0;
            // 己方有虫／幽灵／恶才能吃到超能的弱点；己方是超能时改写也只多一个同行，按基础意愿。
            let score = facts.types.indexOf("fighting") >= 0 || facts.types.indexOf("poison") >= 0 ? 72 : 56;
            if (magicpowderAllyHasType(context, ["bug", "ghost", "dark"])) score += 10;
            return Math.max(1, score);
        }
    });
}
