/** burningjealousy：行为、参数与目标条件以本单元实现为准。 */
namespace CompanionBehavior {
    /** 只读探针：目标当前正面能力等级合计，回调内缓存。 */
    CompanionBehavior.registerFact("world_combat:move_burningjealousy/stages", function (access, actor) {
        return PokemonSkills.burningJealousyBoost(access, actor);
    });

    function burningJealousyStages(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_burningjealousy/stages", target);
        return typeof value === "number" ? value : 0;
    }

    /**
     * 目标此刻是否已经是火属性（灼伤对它无效，本招只剩基础火伤）。
     * 读 CombatantStats 的最终类型组成，包含临时改属（如浸水、特性改属），不只看原生种族。
     */
    function burningJealousyFire(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const actor = world.actor(target.ref);
        if (actor !== null && world.valid(actor)) return PokemonDamage.combatants.read(world, actor).types.indexOf("fire") >= 0;
        const facts = CompanionBehavior.pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("fire") >= 0;
    }

    /**
     * 按本个体**实际配置**的射程与张角，从自己朝目标方向铺出扇面，数一数实际可达的扇内非友方：
     * 真实身体箱相交（`bodySector` / `selectBodies`）排掉胖身体漏判，再用 `WorldGeometry.blockHit`
     * 排掉被实心墙挡住的，得到可达人数与强化总收益。数与命中同源。
     */
    function burningJealousyFanValue(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): { count: number; boost: number; burnable: number } {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const from = CompanionBehavior.point(self.point), aim = CompanionBehavior.point(target.point).minus(from);
        const actor = world.source();
        const source = { world: world, actor: actor, detail: { values: item.data.config } };
        const reach = typeof item.data.range === "number" ? item.data.range : PokemonSkills.p(PokemonSkills.burningjealousyId, "reach", source);
        const angle = PokemonSkills.p(PokemonSkills.burningjealousyId, "angle", source);
        let count = 0, boost = 0, burnable = 0;
        if (aim.length() < 0.05) return { count: 1, boost: burningJealousyStages(context, target), burnable: burningJealousyFire(context, target) ? 0 : 1 };
        WorldGeometry.selectBodies(world, WorldGeometry.bodySector(from, aim, reach, angle),
            function (other: CombatActor, body: CombatObservation) {
                if (body.friendly() || String(other.ref()) === String(self.ref)) return;
                if (WorldGeometry.blockHit(world, from, body.position()) !== null) return;
                count++;
                boost += PokemonSkills.burningJealousyBoost(world, other);
                const stats = PokemonDamage.combatants.read(world, other);
                if (stats.types.indexOf("fire") < 0) burnable++;
            });
        return { count: count, boost: boost, burnable: burnable };
    }

    const burningJealousyChase = PokemonSkills.number("ai.maxChase", "喷火距离", 3, 20, 1);
    burningJealousyChase.help = "伙伴在威胁离自己这么远以内时才考虑喷妒火；调大愿意从更远处先烧一轮。";
    const burningJealousyMin = PokemonSkills.number("ai.minStages", "惩罚门槛", 1, 6, 1);
    burningJealousyMin.help = "目标的正面等级合计达到这么多时才把妒火抬到高于普通交战；调 1 见一丝强化就抢烧，调大只在它攒大了才优先。";
    const burningJealousyLeave = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    burningJealousyLeave.help = "开启后，驻守中的伙伴会离开原位喷出一片妒火。";

    PokemonSkills.addPreferences(PokemonSkills.burningjealousyId, { ai: { maxChase: 10, minStages: 1, leaveStation: false } },
        [burningJealousyChase, burningJealousyMin, burningJealousyLeave]);

    registerUse(PokemonSkills.burningjealousyId, {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (target === null) return true;
            if (target.friendly || !target.visible || target.health <= 0) return false;
            return context.facts.focus === target.ref || distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 10);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.visible && target.health > 0
                && (context.facts.focus === target.ref || distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 10));
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            const reachable = burningJealousyFanValue(context, item, target);
            // 实际可达扇内的强化总收益与人数决定这一片值不值：强化越多、越挤，越值得抢在普通交战前放。
            let score = 16 + Math.min(40, reachable.boost * 5) + Math.min(20, Math.max(0, reachable.count - 1) * 5);
            if (reachable.burnable > 0) score += 6;
            // 目标已经带着灼伤身份时，点火那部分收益已兑现，不再重复加分。
            if (CompanionBehavior.status(context, target, "burn")) score -= 6;
            // 火属性的目标咬不住，只吃基础伤，低于强化门槛时压到普通交战。
            if (burningJealousyFire(context, target) || burningJealousyStages(context, target) < ai<number>(item, "minStages", 1)) return Math.min(score, 14);
            return Math.min(96, score);
        }
    });
}
