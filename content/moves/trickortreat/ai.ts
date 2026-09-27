/**
 * 万圣夜 的伙伴 AI 用途：这招自己的一套出手计划，敌我两面，所有活体同一条类型读取。
 *
 * 对敌（world_combat:control）：只有己方真能利用新增的幽灵／恶弱点时才出手——自己或近旁友方的本系带幽灵或恶，
 *   把目标的受击面翻成幽灵／恶才是收益；单纯有威胁不构成理由。触发时若目标带超能，priority 抬到 80，否则 62。
 * 对友（world_combat:bolster）：按真实来袭种类决定——正被真实的一般／格斗打（壳挡下）就套；正被真实的幽灵／恶
 *   打（壳会加重）就不套；种类未知时只在队友确实带伤或交战中低优先套，不是有威胁就自动套。
 * 对谁出手：敌人是当前威胁；友方是共享伙伴感官挑来的伙伴；已经带着 trickortreat 的目标跳过，避免浪费 20 发 PP。
 * 放不上就不出手：已是幽灵、属性层已满三种、或属性被特性锁定的目标套不上；非宝可梦也读取真实属性，没有特判。
 * 够不到怎么办：reach 就是套壳距离（偏短），由共享接近逻辑把身体带进范围；视线被挡或距离不够时不急。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 *
 * 说明：队友的招式组合不在共享观测里，所以「可利用新增弱点」只能读到本系属性，无法逐招读出队友的幽灵／恶输出。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("trickortreat", { ai: { maxChase: 10, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 2, 16, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 任意活体的当前有效属性，含共享类型层。 */
    function trickortreatTypes(context: WorldBehavior.Context, target: Entity): string[] {
        const access = world(context), actor = access.actor(target.ref);
        return actor ? PokemonDamage.combatants.read(access, actor).types : [];
    }
    /** 非幽灵、且临时属性层还放得下第三条的目标才套得上。 */
    function trickortreatEligible(context: WorldBehavior.Context, target: Entity): boolean {
        const types = trickortreatTypes(context, target);
        return types.indexOf("ghost") < 0 && types.length < 3;
    }
    /** 己方是否有人真能利用新增的幽灵／恶弱点：自己或近旁友方的本系带幽灵或恶。 */
    function trickortreatExploitable(context: WorldBehavior.Context): boolean {
        const self = source(context), nearby = (context.facts.nearby || []) as Entity[];
        const own = trickortreatTypes(context, self);
        if (own.indexOf("ghost") >= 0 || own.indexOf("dark") >= 0) return true;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.ref === self.ref || other.health <= 0) continue;
            const types = trickortreatTypes(context, other);
            if (types.indexOf("ghost") >= 0 || types.indexOf("dark") >= 0) return true;
        }
        return false;
    }

    function trickortreatWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "trickortreat")) return false;
        if (!trickortreatEligible(context, threat)) return false;
        if (!trickortreatExploitable(context)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    /** 友方：真实来袭是一般／格斗才套，是幽灵／恶则不套；种类未知时只在带伤或交战中低优先套。 */
    function trickortreatAllyWants(context: WorldBehavior.Context, ally: Entity): boolean {
        const access = world(context);
        const attacker = ally.lastAttacker ? access.actor(ally.lastAttacker) : null;
        const recent = attacker ? DamageSemantics.recentAttack(access, attacker, 200) : null;
        if (recent && String(recent.target) === ally.ref && recent.elementType) {
            if (recent.elementType === "ghost" || recent.elementType === "dark") return false;
            if (recent.elementType === "normal" || recent.elementType === "fighting") return true;
            return false;
        }
        return ally.health < ally.maximum || !!ally.attacking;
    }

    /** 把壳送给真实需要挡一般／格斗的队友：可见、还没被套过、且真有收益或确有需要。 */
    function trickortreatSupports(context: WorldBehavior.Context, item: WorldBehavior.Capability, ally: Entity): boolean {
        const self = source(context);
        if (!ally || ally.health <= 0 || !ally.visible || !ally.friendly) return false;
        if (ally.ref === self.ref) return false;
        if (status(context, ally, "trickortreat")) return false;
        if (!trickortreatEligible(context, ally)) return false;
        if (!context.senses["world_combat:threat"]) return false;
        if (!trickortreatAllyWants(context, ally)) return false;
        if (context.facts.mounted) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, ally.point) > ai<number>(item, "maxChase", 10)) return false;
        return !!world(context).clear(point(self.point), point(ally.point));
    }

    registerUse("trickortreat", {
        protocols: ["world_combat:control", "world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return target.friendly ? trickortreatSupports(context, item, target) : trickortreatWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || target.health <= 0) return 0;
            if (target.friendly) {
                if (!trickortreatSupports(context, item, target)) return 0;
                const engaged = !!target.attacking || (typeof target.hurtAgo === "number" && target.hurtAgo < 60);
                return engaged ? 58 : 24;
            }
            if (!trickortreatWants(context, item, target)) return 0;
            return trickortreatTypes(context, target).indexOf("psychic") >= 0 ? 80 : 62;
        }
    });
}
