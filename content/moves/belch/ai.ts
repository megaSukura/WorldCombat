/**
 * 打嗝 / belch 的伙伴 AI 用途。
 *
 * 什么局面下出手：手里**还带着一颗树果**，目标可见、敌对、还活着，且在 `ai.maxChase`（默认 8）以内；
 * 更远交给共享接近逻辑。没有树果时 `ready` 与 `available` 都判否，这一招根本不会被选。
 * 对谁出手：`ai.cluster`（默认开）让它在身前扇形里能罩住两个以上敌人时排到前面；已经中毒的目标价值较低。
 * 够不到交给共享接近逻辑；走到射程以内就喷。放完之后目标身上可能带毒，随后交回共享顺序。
 */
namespace CompanionBehavior {
    function belchActor(context: WorldBehavior.Context): CombatActor | null {
        const world = CompanionBehavior.world(context), source = CompanionBehavior.source(context);
        const actor = world.actor(source.ref);
        return actor !== null && String(actor.domain()) === "cobblemon" ? actor : null;
    }

    function belchHasBerry(context: WorldBehavior.Context): boolean {
        const actor = belchActor(context);
        return actor !== null && PokemonSkills.belchBerryOf(CobblemonCombat.pokemon(actor)) !== null;
    }

    /** 另一个敌人是否落在「自己 → 目标」方向、半角约 31° 的锥内。 */
    function belchInCone(self: WorldMethods.Subject, direction: WorldMethods.Subject, other: WorldMethods.Subject, reach: number): boolean {
        const dx = direction.point[0] - self.point[0], dz = direction.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return false;
        const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
        const od = Math.sqrt(ox * ox + oz * oz);
        if (od < 0.01 || od > reach) return false;
        return (ox * dx + oz * dz) / (od * length) >= 0.855;
    }

    registerUse("belch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false && belchHasBerry(context);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted || !belchHasBerry(context)) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context), reach = capability.data.range;
            if (CompanionBehavior.distance(self.point, target.point) > reach) return 0;
            let score = 24;
            if (CompanionBehavior.status(context, target, "poison")) score -= 6;
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true)) {
                let crowded = 1;
                const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                    if (belchInCone(self, target, other, reach)) crowded++;
                }
                if (crowded >= 2) score += 18;
            }
            if (context.facts.focus === target.ref) score += 12;
            return score;
        }
    });

    PokemonSkills.addPreferences("belch", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("acrid"), "呛辣式", "boolean", {
            help: "开启：中毒概率 +0.18、中毒时长 ×1.4、残气更久，代价是威力 ×0.88，用来把身前一片人毒住。关闭（烈性）：威力 ×1.15，中毒概率与残留都低，用来打一记重的。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "只在这个距离内主动打嗝；更远的目标交给共享接近逻辑走过去。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.cluster"), "成列时优先", "boolean", {
            help: "开启：身前扇形里能罩住两个以上敌人时优先打嗝（可能为找角度偏离站位）；关闭：只当普通法术用。"
        })
    ]);
}
