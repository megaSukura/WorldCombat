/**
 * 瞪眼 的伙伴 AI 用途：这招自己的一套出手计划——把身前扇面瞄向威脅，让一张张开的目光盖住更多人。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，而且朝它的扇面（张角与长度按配置与体型估算）里
 *   至少站着 ai.minFoes 个还没被瞪到的非友方（默认 1，扫到一个就愿意瞪）。人群排成一线时最值得。
 * 对谁出手：当前威胁；扇面里的人数越多，出手越优先。
 * 出手时机：只要有人可扫就出手；它是防御削弱，不抢在别人需要救命的当口。
 * 够不到怎么办：reach 就是目光长度，超出的先走近；掩体挡住的敌人不计入扇面人数。
 * 放完之后：扇面内敌人的防御一起降低，伙伴交回共享顺序。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("leer", { ai: { maxChase: 11, minFoes: 1, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.number("ai.minFoes", "最少人数", 1, 5, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 与执行读同一份参数公式的目光长度与整张扇角；非宝可梦主体退回公式默认值。 */
    function leerWeapon(context: WorldBehavior.Context, item: WorldBehavior.Capability): { reach: number; half: number } {
        const world = CompanionBehavior.world(context), actor = world.source(), values = item.data.config;
        if (String(actor.domain()) !== "cobblemon") {
            const self = source(context);
            const height = self.height === undefined ? 1.4 : self.height;
            const width = self.width === undefined ? 0.9 : self.width;
            const focus = !!(values && values.focus);
            const reach = Math.max(3, Math.min(8, (4 + height * 1.1) * (focus ? 0.85 : 1)));
            const angle = Math.max(45, Math.min(160, (90 + (width - 0.9) * 40) * (focus ? 0.6 : 1.35)));
            return { reach: reach, half: angle / 2 };
        }
        const scope = { world: world, actor: actor, skill: PokemonSkills.skills["leer"], detail: { values: values } };
        const reach = Math.max(3, Math.min(8, PokemonSkills.p("leer", "sweepRange", scope)));
        const angle = Math.max(45, Math.min(160, Math.round(PokemonSkills.p("leer", "sweepAngle", scope))));
        return { reach: reach, half: angle / 2 };
    }

    /** 朝目标方向、扇面内真正会吃到降防的非友方：几何、竖直带、通视、还能降级且未在破防中。 */
    function leerFoes(context: WorldBehavior.Context, self: Entity, threat: Entity, reach: number, halfDegrees: number): number {
        const nearby = context.facts.nearby as Entity[];
        const hx = threat.point[0] - self.point[0], hz = threat.point[2] - self.point[2];
        const length = Math.sqrt(hx * hx + hz * hz);
        if (length < 1e-6) return 0;
        const ux = hx / length, uz = hz / length, cosHalf = Math.cos(halfDegrees * Math.PI / 180);
        const scope = world(context);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            const dx = other.point[0] - self.point[0], dz = other.point[2] - self.point[2];
            const dy = other.point[1] - self.point[1];
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d < 1e-6 || d > reach) continue;
            if ((dx / d) * ux + (dz / d) * uz < cosHalf) continue;
            if (dy < -1 || dy > 3) continue;
            if (stage(context, other, "def") <= -6) continue;
            if (status(context, other, "guardbroken")) continue;
            if (!scope.clear(point(self.point), point(other.point))) continue;
            count++;
        }
        return count;
    }

    function leerWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 11)) return false;
        const weapon = leerWeapon(context, item);
        return leerFoes(context, self, threat, weapon.reach, weapon.half) >= ai<number>(item, "minFoes", 1);
    }

    registerUse("leer", {
        protocols: ["world_combat:control"],
        reach: function (context, item) { return leerWeapon(context, item).reach; },
        available: function (context, item, _purpose, target) { return !target || leerWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !leerWants(context, item, target)) return 0;
            const weapon = leerWeapon(context, item);
            return Math.min(92, 58 + leerFoes(context, source(context), target, weapon.reach, weapon.half) * 7);
        }
    });
}
