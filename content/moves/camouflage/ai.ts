/**
 * 保护色 / camouflage — 伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面有意义：自己没被染过色，脚下第一块真实材质读得出一种与当前不同的场所属性；已经就是该属性（单属性）时不重复染。
 *   出手前先估这次改型的收益：读威胁最近真正打出的攻击元素（`DamageSemantics.recentAttack` 的 elementType），
 *   读不到就用它当前的生效属性当最可能的攻击属性；只有当新属性对这次攻击的受击倍率更低时才值得为这次攻击改型。
 *   估不到攻击属性时，仍可按「开战前先定属性」的用途出手，只是优先级更低。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：属性按地形换好，交回共享交战计划；配置「随景而变」时走动会继续重染。
 * 读脚下的场所走同一条 camouflageScan，与执行时读的是同一份世界事实；当前与攻击属性都读共享 CombatantStats/类型事实。
 */
namespace CompanionBehavior {
    registerFact("world_combat:camouflage-type", function (access, actor, _argument) {
        return PokemonSkills.camouflageScan(access, actor).type;
    });

    /** 威胁最可能的攻击属性：最近的已发生原生攻击优先，其次它的当前生效属性（含共享临时层）。 */
    function camouflageThreatType(context: WorldBehavior.Context, threat: CompanionBehavior.Entity): string {
        const world = CompanionBehavior.world(context);
        const attacker = world.actor(threat.ref);
        if (attacker === null) return "";
        const recent = DamageSemantics.recentAttack(world, attacker, 200);
        if (recent && recent.elementType) return String(recent.elementType);
        const types = PokemonDamage.combatants.read(world, attacker).types;
        return types.length ? String(types[0]) : "";
    }
    function camouflageIncoming(attackType: string, defence: string[]): number {
        if (!attackType || defence.length === 0) return 1;
        let factor = 1;
        for (let i = 0; i < defence.length; i++) factor *= CobblemonCombat.typeEffectiveness(attackType, defence[i]);
        return factor;
    }
    function camouflageWants(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        return CompanionBehavior.observedFlag(context, "camouflage:worth", function () {
            if (context.facts.mounted || !context.senses["world_combat:threat"]) return false;
            const self = source(context);
            if (status(context, self, "camouflage")) return false;
            const world = CompanionBehavior.world(context), actor = world.actor(self.ref);
            if (actor === null) return false;
            const own = PokemonDamage.combatants.read(world, actor).types;
            if (!own.length) return false;
            const scan = PokemonSkills.camouflageScan(world, actor);
            if (own.length === 1 && own[0] === scan.type) return false;
            const threat = context.senses["world_combat:threat"];
            const attackType = threat ? camouflageThreatType(context, threat) : "";
            // 读得到攻击属性就要求改型真的更省；读不到则保留开战前定属性的用途。
            if (!attackType) return true;
            return camouflageIncoming(attackType, [scan.type]) < camouflageIncoming(attackType, own);
        });
    }

    registerUse("camouflage", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            return camouflageWants(context, item);
        },
        priority: function (context, item, _target) {
            if (!camouflageWants(context, item)) return 0;
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            const attackType = threat ? camouflageThreatType(context, threat) : "";
            return attackType ? 30 : 12;
        }
    });

    const camouflageDrift = PokemonSkills.flag("drift", "随景而变");
    camouflageDrift.help = "开启：站到不同地面会重读并换属性，适应性强，但可能被地形带进不利属性、冷却 +10 刻；关闭：一次定住、冷却 -6 刻，离开原地后属性不再贴合。";

    PokemonSkills.addPreferences("camouflage", { drift: false }, [camouflageDrift]);
}
