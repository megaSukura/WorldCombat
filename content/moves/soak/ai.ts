/**
 * 浸水 / soak 的伙伴 AI 用途：敌我两面都用共享的有效类型事实（含玩家与普通／模组生物）。
 *
 * 对敌（world_combat:control）：目标有效类型还不是纯水、属性未被锁、视线畅通、在考虑距离内就值得浇。
 *   意愿按**本队实际能打出的进攻属性**算出把目标冲成单一水之后的相性净收益：打开本队能吃的雷／草弱点
 *   为正，把本队的火／地／岩进路挡掉为负；不再用「身边有没有草／电队友」的粗代理。
 * 对友（world_combat:bolster）：身边正在挨打、还没被浇、也不是纯水的伙伴；只有当前威胁带火／水／冰／钢时才出手，
 *   替它挡住这些打击，避免把伙伴浇成怕雷怕草的样子。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_soak/types", function (access, actor) {
        return access.valid(actor) ? { types: PokemonDamage.combatants.read(access, actor).types } : null;
    });
    function soakTypeFacts(context: WorldBehavior.Context, target: Entity): { types: string[] } | null {
        return fact<{ types: string[] }>(context, "world_combat:move_soak/types", target);
    }
    const soakFlood = PokemonSkills.flag("flood", "漫流");
    soakFlood.help = "开启＝漫流：一次浇透目标与同一阵营的一圈人，但每只维持更短、冷却更久；关闭＝细浇：只盯一个目标，维持更久、出手更快更便宜。覆盖与持续互相取舍。";
    const soakChase = PokemonSkills.number("ai.maxChase", "考虑距离", 2, 18, 1);
    soakChase.help = "伙伴只在威胁离自己这么远以内时才考虑浇它；调小只在贴身时用，调大愿意先追过去。";
    const soakStation = PokemonSkills.flag("ai.leaveStation", "驻守时离位");
    soakStation.help = "开启后，收到「驻守」指令时也会离开原位去浇目标。";

    PokemonSkills.addPreferences("soak", { flood: false, ai: { maxChase: 11, leaveStation: false } },
        [soakFlood, soakChase, soakStation]);

    /** Every living domain can receive a Water layer, including an empty original type list. */
    function soakEligible(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = soakTypeFacts(context, target);
        if (!facts || !Array.isArray(facts.types)) return false;
        return facts.types.join(",") !== "water";
    }

    /** 威胁是不是在用火／水／冰／钢打人：给伙伴披水抗性才真的挡得住，不帮敌人打开雷／草弱点。 */
    function soakDampens(context: WorldBehavior.Context, threat: Entity | null): boolean {
        if (!threat) return false;
        const facts = soakTypeFacts(context, threat);
        if (!facts || !Array.isArray(facts.types)) return false;
        return facts.types.some(type => ["fire", "water", "ice", "steel"].indexOf(type) >= 0);
    }

    /** 本队当前能打出的进攻属性：施法者与身边存活友军的有效类型，去重。 */
    function soakTeamTypes(context: WorldBehavior.Context): string[] {
        const self = source(context), result: string[] = [];
        const own = soakTypeFacts(context, self);
        if (own) own.types.forEach(function (type) { if (result.indexOf(type) < 0) result.push(type); });
        const nearby = (context.facts.nearby || []) as Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.ref === self.ref || !(other.health > 0)) continue;
            const facts = soakTypeFacts(context, other);
            if (!facts) continue;
            facts.types.forEach(function (type) { if (result.indexOf(type) < 0) result.push(type); });
        }
        return result;
    }

    /** 一种进攻属性对一组属性的相性倍率。 */
    function soakMatchup(attack: string, types: string[]): number {
        let factor = 1;
        for (let index = 0; index < types.length; index++) factor *= CobblemonCombat.typeEffectiveness(attack, types[index]);
        return factor;
    }

    /** 把目标冲成单一水之后本队进攻的相性净收益：正＝打开本队能吃的雷／草弱点，负＝把本队的火／地／岩进路挡掉。 */
    function soakNetGain(context: WorldBehavior.Context, target: Entity): number {
        const facts = soakTypeFacts(context, target);
        if (!facts || !Array.isArray(facts.types)) return 0;
        const before = facts.types, after = ["water"], team = soakTeamTypes(context);
        let gain = 0;
        for (let index = 0; index < team.length; index++)
            gain += soakMatchup(team[index], after) - soakMatchup(team[index], before);
        return gain;
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
            const gain = soakNetGain(context, target);
            return Math.max(1, 58 + Math.max(-20, Math.min(20, Math.round(gain * 8))));
        }
    });
}
