/**
 * 森林诅咒 / forestscurse 的伙伴 AI 用途：这招自己的一套出手计划，敌我两面。
 *
 * 对敌（world_combat:control）：有一个看得见、够得着（ai.maxChase 内）、视线畅通的宝可梦威胁，
 *   它是单／双属性、不是草属性、且属性层还放得下第三条——只有这种目标才装得下追加的草属性。
 * 什么时候最想出手：目标是水＋地面时 priority 抬到 76——追加草就是四倍弱点；水、地面或岩石时 68；
 *   身边若有火／冰／虫／飞的队友，新增的草弱点有人来吃，再抬 10；其余可追加目标 58。
 * 对友（world_combat:bolster）：身边看得见、正在挨打的队友，还没被种、属性层放得下草。追加草替它挡下
 *   水／电／草／地面；只有当前威胁恰好带这几属性时才出手，避免无端给伙伴添上火／冰／虫／飞的弱点。
 * 对谁出手：敌人是当前威胁；友方是共享伙伴感官挑来的伙伴；已经带着 forestscurse 身份的目标跳过。
 * 放不上就不出手：非草、且属性少于三条的宝可梦才种得上；非宝可梦没有属性，明确拒绝。
 * 够不到怎么办：reach 就是种咒距离，由共享接近逻辑把身体带进范围；视线被挡或距离不够时不急。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    const forestscurseRooted = PokemonSkills.flag("rooted", "深根");
    forestscurseRooted.help = "开启＝深根：诅咒时长 ×1.7、根须表现范围 ×1.35，起手 +3 刻、冷却 +20 刻；关闭＝浅咒：诅咒更短、起手快、冷却 −10 刻。";
    const forestscurseChase = PokemonSkills.number("ai.maxChase", "考虑距离", 2, 18, 1);
    forestscurseChase.help = "伙伴只在威胁离自己这么远以内时才考虑种诅咒；调小只在贴身时用，调大愿意先追过去。";
    const forestscurseStation = PokemonSkills.flag("ai.leaveStation", "驻守时离位");
    forestscurseStation.help = "开启后，收到「驻守」指令时也会离开原位去种诅咒。";

    PokemonSkills.addPreferences("forestscurse", { rooted: false, ai: { maxChase: 11, leaveStation: false } },
        [forestscurseRooted, forestscurseChase, forestscurseStation]);

    /** 单属性、非草的宝可梦才种得上；事实缺失（非宝可梦）与属性层已满一律跳过。 */
    function forestscurseEligible(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = combatStats(context, target);
        if (!facts || !Array.isArray(facts.types)) return false;
        return facts.types.length > 0 && facts.types.length < 3 && facts.types.indexOf("grass") < 0;
    }

    /** 威胁是不是在用草能挡下的属性打人：给伙伴追加草才真的顶得住。 */
    function forestscurseShelters(context: WorldBehavior.Context, threat: Entity | null): boolean {
        if (!threat) return false;
        const facts = pokemonFacts(context, threat);
        if (!facts || !Array.isArray(facts.types)) return false;
        return facts.types.some(type => ["water", "electric", "grass", "ground"].indexOf(type) >= 0);
    }

    /** 身边有没有带这些属性的队友：新增的草弱点得有人来吃才值得给敌方种。 */
    function forestscurseAllyHasType(context: WorldBehavior.Context, wanted: string[]): boolean {
        const self = source(context), nearby = (context.facts.nearby || []) as Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.ref === self.ref || other.health <= 0) continue;
            const facts = pokemonFacts(context, other);
            if (facts && Array.isArray(facts.types) && facts.types.some(type => wanted.indexOf(type) >= 0)) return true;
        }
        return false;
    }

    function forestscurseWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "forestscurse")) return false;
        if (!forestscurseEligible(context, threat)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 11)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    /** 把草抗性送给正在挨打的伙伴：可见、属性层放得下、还没被种，且当前威胁会被草挡下。 */
    function forestscurseSupports(context: WorldBehavior.Context, item: WorldBehavior.Capability, ally: Entity): boolean {
        const self = source(context);
        if (!ally || ally.health <= 0 || !ally.friendly || !ally.visible) return false;
        if (ally.ref === self.ref) return false;
        if (context.facts.mounted) return false;
        if (status(context, ally, "forestscurse")) return false;
        if (!forestscurseEligible(context, ally)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, ally.point) > ai<number>(item, "maxChase", 11)) return false;
        if (!world(context).clear(point(self.point), point(ally.point))) return false;
        if (!(ally.attacking || (typeof ally.hurtAgo === "number" && ally.hurtAgo < 60))) return false;
        return forestscurseShelters(context, context.senses["world_combat:threat"] as Entity | null);
    }

    registerUse("forestscurse", {
        protocols: ["world_combat:control", "world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return target.friendly ? forestscurseSupports(context, item, target) : forestscurseWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || target.health <= 0) return 0;
            if (target.friendly) return forestscurseSupports(context, item, target) ? 46 : 0;
            if (!forestscurseWants(context, item, target)) return 0;
            const facts = pokemonFacts(context, target);
            if (!facts || !Array.isArray(facts.types)) return 0;
            let score = facts.types.indexOf("water") >= 0 && facts.types.indexOf("ground") >= 0 ? 76
                : facts.types.indexOf("water") >= 0 || facts.types.indexOf("ground") >= 0 || facts.types.indexOf("rock") >= 0 ? 68 : 58;
            if (forestscurseAllyHasType(context, ["fire", "ice", "bug", "flying"])) score += 10;
            return Math.max(1, score);
        }
    });
}
