/**
 * 诱惑 的伙伴 AI 用途：这招自己的一套出手计划，而不是共享控制位的顺手一放。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、目标还没被迷住、也没到 −6 特攻底线、
 *   宝可梦目标为异性、回眸还要视线畅通。献舞要圈里至少站着 ai.minOnlookers 个看得见的非友方。
 * 对谁出手：当前威胁；同性宝可梦、已被迷住或特攻已到底线的目标跳过。默认 ai.preferSpecial 开启时，
 *   特攻明显高于物攻的目标优先级更高——把迷魂留给真正的法系威胁。
 * 出手时机：ai.opening=迎击时只在目标正打自己或主人、或自己刚被打过时抬眸；随时则见威胁就行。
 * 够不到怎么办：reach 就是凝视距离，超出的先走近；凝视要求通视，被挡住时交回共享接近逻辑。
 * 放完之后：目标大幅掉特攻；献舞时圈的敌人一起中招，伙伴随即交回共享顺序。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("captivate", { ai: { maxChase: 10, opening: "anytime", minOnlookers: 2, preferSpecial: true, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "targeting"], ["随时", "迎击时"]),
        PokemonSkills.number("ai.minOnlookers", "献舞最少人数", 1, 4, 1),
        PokemonSkills.flag("ai.preferSpecial", "优先法系威胁"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** Pokemon must be the opposite gender; every other body has no gender and passes. */
    function captivateAllows(context: WorldBehavior.Context, target: Entity): boolean {
        const access = world(context), other = access.actor(target.ref);
        if (!other || String(other.domain()) !== "cobblemon") return true;
        const self = access.source();
        if (String(self.domain()) !== "cobblemon") return true;
        const a = String(CobblemonCombat.pokemon(self).gender()).toLowerCase();
        const b = String(CobblemonCombat.pokemon(other).gender()).toLowerCase();
        return a === "male" && b === "female" || a === "female" && b === "male" || a === "m" && b === "f" || a === "f" && b === "m";
    }

    /** 献舞时身边这么近、看得见的非友方数量；命中判定仍走招式自己的 ringRadius。 */
    function captivateOnlookers(context: WorldBehavior.Context, self: Entity, radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (distance(other.point, self.point) <= radius) count++;
        }
        return count;
    }

    /** 法系倾向：特攻相对物攻越高越值得迷；2 明显法系、1 偏法系、0 物系或未知。 */
    function captivateSpecial(context: WorldBehavior.Context, target: Entity): number {
        const facts = combatStats(context, target), stats = facts && facts.stats;
        if (!stats) return 0;
        const special = Number(stats.spa), attack = Number(stats.atk);
        if (!isFinite(special) || special <= 0) return 0;
        if (isFinite(attack) && attack > 0) return special >= attack * 1.15 ? 2 : special > attack ? 1 : 0;
        return 1;
    }

    function captivateWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        if (status(context, threat, "captivated")) return false;
        if (stage(context, threat, "spa") <= -6) return false;
        if (!captivateAllows(context, threat)) return false;
        if (item.data.config && item.data.config.pose === "dance")
            return captivateOnlookers(context, self, 3) >= ai<number>(item, "minOnlookers", 2);
        if (!world(context).clear(point(self.point), point(threat.point))) return false;
        if (ai<string>(item, "opening", "anytime") !== "targeting") return true;
        const owner = context.facts.owner;
        return threat.attacking === self.ref || !!owner && threat.attacking === owner.ref || self.hurtAgo < 40;
    }

    registerUse("captivate", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || captivateWants(context, item, target); },
        accepts: function (context, _item, target) {
            return !target.friendly && target.health > 0 && target.visible && captivateAllows(context, target);
        },
        priority: function (context, item, target) {
            if (!target || !captivateWants(context, item, target)) return 0;
            if (item.data.config && item.data.config.pose === "dance")
                return Math.min(95, 70 + (captivateOnlookers(context, source(context), 3) - 1) * 6);
            const special = ai<boolean>(item, "preferSpecial", true) ? captivateSpecial(context, target) : 0;
            return 55 + special * 8;
        }
    });
}
