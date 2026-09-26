/** encore：行为、参数与目标条件以本单元实现为准。 */
namespace CompanionBehavior {
    /** 攻击方式归并：物理接触是近战，物理远程是投射，特殊是魔法。 */
    function encoreAttackMethod(category: string, contact: boolean): string {
        if (category === "special") return "magic";
        return contact ? "melee" : "ranged";
    }
    /** 宝可梦已知配招里出现过几种攻击方式；只会一种的对手被点名后几乎没变化，收益低。 */
    function encoreDiversity(access: CombatWorld, actor: CombatActor): number {
        if (String(actor.domain()) !== "cobblemon") return 1;
        const pokemon = CobblemonCombat.pokemon(actor), methods: { [name: string]: boolean } = {};
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (move === null || String(move.category()) === "status") continue;
            methods[encoreAttackMethod(String(move.category()), move.flag("contact"))] = true;
        }
        return Math.max(1, Object.keys(methods).length);
    }

    /** 只读、决策内缓存：目标最近一次出手的身份、距今刻数与性质；没有出手记录返回 null。 */
    registerFact("world_combat:encore-target", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") {
            const last = DamageSemantics.recentAttack(access, actor, 400);
            return last ? { id: last.type, since: access.tick() - last.tick,
                category: last.category || (last.contact ? "physical" : "special"), power: 60, failencore: 0,
                kind: encoreAttackMethod(last.category || "", !!last.contact), diversity: 1 } : null;
        }
        const last = NativeEffects.lastMove(access, actor);
        if (last === null) return null;
        const template = CobblemonCombat.moveTemplate(last.id);
        return { id: last.id, since: Math.max(0, access.tick() - last.tick), category: String(template.category()),
            power: template.power(), failencore: NativeLoadout.facts(template).flags.failencore ? 1 : 0,
            kind: encoreAttackMethod(String(template.category()), template.flag("contact")),
            diversity: encoreDiversity(access, actor) };
    });

    function encoreInfo(context: WorldBehavior.Context, target: Entity): any {
        return fact<any>(context, "world_combat:encore-target", target);
    }
    function encoreWorth(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (status(context, target, "encore")) return false;
        const info = encoreInfo(context, target);
        if (!info || info.failencore) return false;
        return info.since <= ai<number>(capability, "maxAge", 160);
    }

    registerUse("encore", {
        protocols: ["world_combat:control"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return false;
            if (!encoreWorth(context, capability, target)) return false;
            const self = source(context);
            if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(capability, "maxChase", 12)) return false;
            return !recent(context, "control", target.ref, 240);
        },
        accepts: function (context, capability, target) { return encoreWorth(context, capability, target); },
        priority: function (context, capability, target) {
            if (!target || !encoreWorth(context, capability, target)) return 0;
            const info = encoreInfo(context, target);
            let value = info.category === "status" ? 70 : info.power <= 80 ? 45 : 30;
            // 只会一种攻击方式的对手被点名后几乎没有变化：价值压低，但不对它假加惩罚。
            const diversity = Math.max(1, info.diversity || 1);
            if (diversity <= 1 && info.kind !== "magic") value = Math.min(value, 18);
            else value += (diversity - 1) * 12;
            return value;
        }
    });

    PokemonSkills.addPreferences("encore", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxAge"), "点名时限", "number", {
            min: 40, max: 400, step: 20, display: { scale: 0.05, suffix: " 秒" },
            help: "目标在这一段时间内出过手才值得点名；调小只点刚出手的，调大愿意点更久以前的。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "点名距离", "number", {
            min: 2, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑点名；调小只在贴身时出手，调大愿意追出去。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去点名。"
        })
    ]);
}
