/**
 * 清除浓雾 / defog 的伙伴 AI 用途：这是这招自己的一套出手计划——只在真有东西要清的时候起风。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，并且满足其一：
 *   圈里有对手正带着反射壁／光墙／极光幕／白雾／神秘守护（最想抹的）；
 *   自己正被威胁攻击或刚挨过打（把贴身的一圈先打扫干净）；
 *   圈里至少站着 ai.minFoes 个看得见的非友方（人堆值得一扫）。
 *   三样都不满足时不出手——空放一圈不划算，把冷却留给真正要清的场面。
 * 对谁出手：当前威胁；不挑单个人，风圈以自身为圆心罩住一圈。
 * 够不到怎么办：reach 就是清扫半径；圈外先走近再起风。
 * 放完之后：圈里的对手丢掉屏障、门户大开，伙伴交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    /** 清扫半径内看得见的非友方数量。 */
    function defogCrowd(context: WorldBehavior.Context, self: Entity, radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, self.point) <= radius) count++;
        }
        return count;
    }

    /** 圈里有多少对手正带着屏障（任一共享身份）。 */
    function defogScreens(context: WorldBehavior.Context, self: Entity, radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, self.point) > radius) continue;
            if (status(context, other, "reflect") || status(context, other, "lightscreen")
                || status(context, other, "auroraveil") || status(context, other, "mist")
                || status(context, other, "safeguard")) count++;
        }
        return count;
    }

    /** 当前威胁身上是否带着屏障（任一共享身份）。 */
    function defogScreenOn(context: WorldBehavior.Context, threat: Entity): boolean {
        return status(context, threat, "reflect") || status(context, threat, "lightscreen")
            || status(context, threat, "auroraveil") || status(context, threat, "mist")
            || status(context, threat, "safeguard");
    }

    /** 这个对手正盯着自己、或自己刚挨过它的打——贴身这一圈就值得起。未挨打过的个体 lastAttacker 为空。 */
    function defogEngaged(context: WorldBehavior.Context, threat: Entity): boolean {
        const self = source(context);
        return threat.attacking === self.ref || !!self.lastAttacker && self.hurtAgo < 60;
    }

    function defogWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", true)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        // capability.data.range 是登记的设计射程；风圈的真实半径由 resolve 给出，留一段余量避免卡在边界上。
        const reach = item.data.range + 1.5;
        if (defogScreenOn(context, threat)) return true;
        if (defogScreens(context, self, reach) > 0) return true;
        if (defogEngaged(context, threat)) return true;
        return defogCrowd(context, self, reach) >= ai<number>(item, "minFoes", 2);
    }

    registerUse("defog", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            const selected: Entity | null = target || context.senses["world_combat:threat"];
            return !!selected && defogWants(context, item, selected);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !defogWants(context, item, target)) return 0;
            const self = source(context);
            const reach = item.data.range + 1.5;
            const screens = defogScreens(context, self, reach);
            if (screens > 0 || defogScreenOn(context, target)) return Math.min(100, 92 + screens * 4);
            if (defogEngaged(context, target)) return 62;
            return Math.min(70, 46 + (defogCrowd(context, self, reach) - 2) * 6);
        }
    });

    PokemonSkills.addPreferences("defog", { ai: { maxChase: 10, minFoes: 2, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.number("ai.minFoes", "清扫最少人数", 1, 4, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
