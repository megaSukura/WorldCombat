/**
 * 撒娇 的伙伴 AI 用途：这招自己的一套出手计划，而不是共享控制位的顺手一放。
 *
 * 两种送法各看一面：
 *   贴近撒娇要正面至少两名近身威胁才值得——它一次最多软 3 个正面身体，单人用不如圆瞳快。这里的「近身威胁」
 *   对宝可梦按物攻/特攻倾向判断，对普通生物（主输出就是近战）按物攻威胁计。单敌局面交回圆瞳一类更快的单体。
 *   飞吻走单体远距补控：只推荐弹道真的够得到、且中途没有被友方身体挡住的敌人。
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、目标还没有心软。实际接近距离直接取本个体这次解析出的
 *   capability 射程（item.data.range），不再另写一套公式。
 * 出手时机：ai.opening=迎击时只在目标正打自己或主人、或自己刚被打过时抬眼；随时则见威胁就撒娇。
 * 优先级：ai.preferPhysical 开启时，物攻明显高于特攻的目标更值得先软下来。
 * 放完之后：目标掉攻击，伙伴交回共享顺序，再决定追击还是趁对方下不去手拉开。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("charm", { ai: { maxChase: 9, opening: "anytime", preferPhysical: true, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 16, 1),
        PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "counter"], ["随时", "迎击时"]),
        PokemonSkills.flag("ai.preferPhysical", "优先物攻威胁"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 物攻倾向：物攻相对特攻越高越值得软；2 明显物系、1 偏物系、0 法系或未知。 */
    function charmPhysical(context: WorldBehavior.Context, threat: Entity): number {
        const facts = combatStats(context, threat), stats = facts && facts.stats;
        if (!stats) return 0;
        const attack = Number(stats.atk), special = Number(stats.spa);
        if (!isFinite(attack) || attack <= 0) return 0;
        if (isFinite(special) && special > 0) return attack >= special * 1.15 ? 2 : attack > special ? 1 : 0;
        return 1;
    }

    /** 是否值得当作近身物攻威胁：宝可梦看攻/特攻倾向，普通生物的主输出就是近战。 */
    function charmMeleeThreat(context: WorldBehavior.Context, threat: Entity): boolean {
        if (domain(context, threat) !== "cobblemon") return true;
        return charmPhysical(context, threat) >= 1;
    }

    function charmKiss(item: WorldBehavior.Capability): boolean {
        const config = item.data.config;
        return !!(config && config.kiss === true);
    }

    /** 决策帧里真实可见、在追猎距离内、还活着的敌对个体。 */
    function charmThreats(context: WorldBehavior.Context, item: WorldBehavior.Capability): Entity[] {
        const self = source(context);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const limit = ai<number>(item, "maxChase", 9);
        const result: Entity[] = [];
        if (!nearby) return result;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (distance(self.point, other.point) > limit) continue;
            result.push(other);
        }
        return result;
    }

    /** 贴近扇面要正面至少两名近身威胁才值得用；单人交回圆瞳。 */
    function charmMeleeCrowd(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const threats = charmThreats(context, item);
        let count = 0;
        for (let i = 0; i < threats.length; i++) if (charmMeleeThreat(context, threats[i])) count++;
        return count;
    }

    /** 飞吻是否够得到这个敌人：在射程内、直线无墙、且中途没有被友方身体挡住。 */
    function charmKissViable(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        const gap = distance(self.point, threat.point);
        if (gap > item.data.range) return false;
        const scope = world(context), from = point(self.point), to = point(threat.point);
        if (WorldGeometry.blockHit(scope, from, to) !== null) return false;
        const delta = to.minus(from);
        if (delta.length() < 0.01) return true;
        const direction = delta.unit();
        let blocked = false;
        WorldGeometry.selectBodies(scope, WorldGeometry.bodyLane(from, direction, delta.length(), 0.4, { below: 1.6, above: 2.0 }),
            function (other, facts) {
                if (blocked) return;
                if (String(other.ref) === String(self.ref) || String(other.ref) === String(threat.ref)) return;
                if (!facts.friendly()) return;
                if (facts.position().minus(from).length() < delta.length()) blocked = true;
            });
        return !blocked;
    }

    /** 迎击时机：目标正打自己或主人、或自己刚被打过；随时则总是通过。 */
    function charmTiming(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (ai<string>(item, "opening", "anytime") !== "counter") return true;
        const self = source(context), owner = context.facts.owner;
        return threat.attacking === self.ref || !!owner && threat.attacking === owner.ref || self.hurtAgo < 40;
    }

    function charmWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (context.facts.mounted) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (status(context, threat, "charmed")) return false;
        if (charmKiss(item)) return charmKissViable(context, item, threat) && charmTiming(context, item, threat);
        if (charmMeleeCrowd(context, item) < 2) return false;
        return charmTiming(context, item, threat);
    }

    registerUse("charm", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
            if (charmKiss(item)) return target ? charmKissViable(context, item, target) : charmThreats(context, item).length > 0;
            return charmMeleeCrowd(context, item) >= 2;
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !charmWants(context, item, target)) return 0;
            const self = source(context), owner = context.facts.owner;
            if (charmKiss(item)) return 58;
            const physical = ai<boolean>(item, "preferPhysical", true) ? charmPhysical(context, target) : 0;
            if (physical >= 2) return 74;
            if (target.attacking === self.ref || !!owner && target.attacking === owner.ref) return 66;
            return 54 + physical * 6;
        }
    });
}
