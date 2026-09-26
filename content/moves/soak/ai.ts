/**
 * 浸水 / soak 的伙伴 AI 用途：这招自己的一套出手计划，敌我两面。
 *
 * 对敌（world_combat:control）：有一个看得见、够得着（ai.maxChase 内）、视线畅通的宝可梦威胁，而且它不是纯水属性——
 *   只有这种目标才浇得进去。没有属性的生物（原版生物、玩家）没有可换的属性，跳过。
 * 什么时候最想出手：目标带地面属性时 priority 抬到 78——浇成水就摘掉它的电免疫，是队友电招的口子；
 *   带火或岩石时 70，浇成水直接打开雷／草的弱点、同时封掉它自己的火／地本系；其余单／双属性目标 58。
 *   身边有草／电队友时再抬 10（弱点有人吃）；只有火／地／岩队友时压低 12（浇水反而把水本系送给敌人）。
 * 对友（world_combat:bolster）：身边有看得见、正在挨打的队友，且它还没被浇、也不是纯水。浇成水替它挡下
 *   火／水／冰／钢；只有当前的威胁恰好带这几属性时才出手，避免把伙伴浇成怕雷怕草的样子帮了敌人。
 * 对谁出手：敌人是当前威胁；友方是共享伙伴感官挑来的伙伴；已经带着 soak 身份的目标跳过，避免浪费 20 发 PP。
 * 够不到怎么办：reach 就是浇淋距离，由共享接近逻辑把身体带进范围；视线被挡或距离不够时不急。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    const soakFlood = PokemonSkills.flag("flood", "漫流");
    soakFlood.help = "开启＝漫流：一次浇透目标与同一阵营的一圈人，但每只维持更短、起手与冷却更久；关闭＝细浇：只盯一个目标，维持更久、出手更快更便宜。覆盖与持续互相取舍。";
    const soakChase = PokemonSkills.number("ai.maxChase", "考虑距离", 2, 18, 1);
    soakChase.help = "伙伴只在威胁离自己这么远以内时才考虑浇它；调小只在贴身时用，调大愿意先追过去。";
    const soakStation = PokemonSkills.flag("ai.leaveStation", "驻守时离位");
    soakStation.help = "开启后，收到「驻守」指令时也会离开原位去浇目标。";

    PokemonSkills.addPreferences("soak", { flood: false, ai: { maxChase: 11, leaveStation: false } },
        [soakFlood, soakChase, soakStation]);

    /** 有属性可换、且不是纯水的宝可梦才浇得进去；事实缺失（非宝可梦）一律跳过。 */
    function soakEligible(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = pokemonFacts(context, target);
        if (!facts || !Array.isArray(facts.types) || facts.types.length === 0) return false;
        return facts.types.join(",") !== "water";
    }

    /** 威胁是不是在用火／水／冰／钢打人：给伙伴披水抗性才真的挡得住，不帮敌人打开雷／草弱点。 */
    function soakDampens(context: WorldBehavior.Context, threat: Entity | null): boolean {
        if (!threat) return false;
        const facts = pokemonFacts(context, threat);
        if (!facts || !Array.isArray(facts.types)) return false;
        return facts.types.some(type => ["fire", "water", "ice", "steel"].indexOf(type) >= 0);
    }

    /** 身边有没有带这些属性的队友，用来判断把对手浇成水是帮自己还是帮敌人。 */
    function soakAllyHasType(context: WorldBehavior.Context, wanted: string[]): boolean {
        const self = source(context), nearby = (context.facts.nearby || []) as Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.ref === self.ref || other.health <= 0) continue;
            const facts = pokemonFacts(context, other);
            if (facts && Array.isArray(facts.types) && facts.types.some(type => wanted.indexOf(type) >= 0)) return true;
        }
        return false;
    }

    function soakWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "soak")) return false;
        if (!soakEligible(context, threat)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 11)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    /** 把水抗性送给正在挨打的伙伴：可见、有属性、不是纯水、还没被浇，且当前威胁的属性确实会被水挡下。 */
    function soakSupports(context: WorldBehavior.Context, item: WorldBehavior.Capability, ally: Entity): boolean {
        const self = source(context);
        if (!ally || ally.health <= 0 || !ally.friendly || !ally.visible) return false;
        if (ally.ref === self.ref) return false;
        if (context.facts.mounted) return false;
        if (status(context, ally, "soak")) return false;
        if (!soakEligible(context, ally)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, ally.point) > ai<number>(item, "maxChase", 11)) return false;
        if (!world(context).clear(point(self.point), point(ally.point))) return false;
        if (!(ally.attacking || (typeof ally.hurtAgo === "number" && ally.hurtAgo < 60))) return false;
        return soakDampens(context, context.senses["world_combat:threat"] as Entity | null);
    }

    registerUse("soak", {
        protocols: ["world_combat:control", "world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return target.friendly ? soakSupports(context, item, target) : soakWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || target.health <= 0) return 0;
            if (target.friendly) return soakSupports(context, item, target) ? 44 : 0;
            if (!soakWants(context, item, target)) return 0;
            const facts = pokemonFacts(context, target);
            if (!facts || !Array.isArray(facts.types)) return 0;
            // 己方有草或电才能吃到水的弱点；己方只有火／地／岩时浇水反而把水本系送给敌人，压低意愿。
            const exploit = soakAllyHasType(context, ["grass", "electric"]);
            const harmed = soakAllyHasType(context, ["fire", "ground", "rock"]);
            let score = facts.types.indexOf("ground") >= 0 ? 78
                : facts.types.indexOf("fire") >= 0 || facts.types.indexOf("rock") >= 0 ? 70 : 58;
            if (exploit) score += 10;
            if (harmed && !exploit) score -= 12;
            return Math.max(1, score);
        }
    });
}
