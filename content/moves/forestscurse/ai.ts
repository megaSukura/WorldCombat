/**
 * 森林诅咒 / forestscurse 的伙伴 AI 用途：这招自己的一套出手计划，敌我两面。
 *
 * 对敌（world_combat:control）：有一个看得见、够得着（ai.maxChase 内）、视线畅通的活体威胁，
 *   它的有效类型还没到三条、也不是草属性——只有这种目标才装得下追加的草属性（普通生物同样算）。
 * 什么时候最想出手：按**本队实际能打出的进攻属性**（施法者与身边队友的有效类型）算出追加草后的相性
 *   净收益——打开冰／虫／飞的弱点为正，把本队草的进路挡住为负；净收益高就抬优先，负收益就压低。
 *   不再把「水＋地面」当作四倍草弱点：给它添草其实把原来的四倍降到两倍。
 * 对友（world_combat:bolster）：身边看得见、正在挨打的队友，还没被种、类型层放得下草。追加草替它挡下
 *   水／电／草／地面；只有当前威胁恰好带这几属性时才出手，避免无端给伙伴添上火／冰／虫／飞的弱点。
 * 对谁出手：敌人是当前威胁；友方是共享伙伴感官挑来的伙伴；已经带着 forestscurse 身份的目标跳过。
 * 放不上就不出手：非草、且有效类型少于三条的活体才种得上，属性被特性锁定的一律跳过。
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

    /** 当前有效类型，含临时层；普通与非宝可梦活体同样返回其类型事实。 */
    registerFact("world_combat:move_forestscurse/types", function (access, actor) {
        return access.valid(actor) ? { types: PokemonDamage.combatants.read(access, actor).types } : null;
    });
    function forestscurseTypeFacts(context: WorldBehavior.Context, target: Entity): { types: string[] } | null {
        return fact<{ types: string[] }>(context, "world_combat:move_forestscurse/types", target);
    }

    /** 有效类型少于三条、且还不是草属性的活体才种得上；属性缺失一律跳过。 */
    function forestscurseEligible(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = forestscurseTypeFacts(context, target);
        if (!facts || !Array.isArray(facts.types)) return false;
        return facts.types.length < 3 && facts.types.indexOf("grass") < 0;
    }

    /** 草系进攻对一个类型组合的倍率。 */
    function forestscurseMatchup(attack: string, types: string[]): number {
        let factor = 1;
        for (let index = 0; index < types.length; index++) factor *= CobblemonCombat.typeEffectiveness(attack, types[index]);
        return factor;
    }

    /** 本队当前能打出的进攻属性：施法者与身边存活友军的有效类型，去重。 */
    function forestscurseTeamTypes(context: WorldBehavior.Context): string[] {
        const self = source(context), result: string[] = [];
        const own = forestscurseTypeFacts(context, self);
        if (own) own.types.forEach(function (type) { if (result.indexOf(type) < 0) result.push(type); });
        const nearby = (context.facts.nearby || []) as Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.ref === self.ref || !(other.health > 0)) continue;
            const facts = forestscurseTypeFacts(context, other);
            if (!facts) continue;
            facts.types.forEach(function (type) { if (result.indexOf(type) < 0) result.push(type); });
        }
        return result;
    }

    /** 追加草之后本队进攻的相性净收益：正值＝打开本队能吃的弱点，负值＝替对手挡下本队的攻击。 */
    function forestscurseNetGain(context: WorldBehavior.Context, target: Entity): number {
        const facts = forestscurseTypeFacts(context, target);
        if (!facts || !Array.isArray(facts.types)) return 0;
        const before = facts.types, after = before.concat(["grass"]), team = forestscurseTeamTypes(context);
        let gain = 0;
        for (let index = 0; index < team.length; index++)
            gain += forestscurseMatchup(team[index], after) - forestscurseMatchup(team[index], before);
        return gain;
    }

    /** 目标最近一次原生攻击带的元素：正好是草时，给它添草等于把本系送回去，压低意愿。 */
    function forestscurseEnemyUsesGrass(context: WorldBehavior.Context, threat: Entity): boolean {
        const access = world(context), actor = access.actor(threat.ref);
        if (actor === null) return false;
        const recent = DamageSemantics.recentAttack(access, actor, 120);
        if (recent === null) return false;
        const element = String(recent.elementType || "");
        return element === "grass" || (element === "" && String(recent.type) === "grass");
    }

    /** 威胁是不是在用草能挡下的属性打人：给伙伴追加草才真的顶得住。 */
    function forestscurseShelters(context: WorldBehavior.Context, threat: Entity | null): boolean {
        if (!threat) return false;
        const facts = forestscurseTypeFacts(context, threat);
        if (!facts || !Array.isArray(facts.types)) return false;
        return facts.types.some(type => ["water", "electric", "grass", "ground"].indexOf(type) >= 0);
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

    /** 把草抗性送给正在挨打的伙伴：可见、类型层放得下、还没被种，且当前威胁会被草挡下。 */
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
            const gain = forestscurseNetGain(context, target);
            let score = 58 + Math.max(-20, Math.min(20, Math.round(gain * 8)));
            // 目标正用草打击：添草会把草本系还给对手，压低这一手。
            if (forestscurseEnemyUsesGrass(context, target)) score -= 14;
            return Math.max(1, score);
        }
    });
}
