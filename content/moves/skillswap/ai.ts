/** Target selection follows each supported Pokémon or native-world branch and the configured chase policy. */
namespace CompanionBehavior {
    /** 只读事实：一个战斗者当前生效的特性 id（含临时覆盖层）。 */
    CompanionBehavior.registerFact("world_combat:skillswap-ability", function (access: CombatWorld, actor: CombatActor): string {
        return PokemonSkills.skillswapAbility(access, actor);
    });
    /** Compare only the supported outgoing rules of actual equipped attacks; unknown utility stays neutral. */
    function skillswapAttackFit(access: CombatWorld, actor: CombatActor, ability: string): number {
        const pokemon = CobblemonCombat.pokemon(actor), facts = PokemonDamage.sourceFacts(pokemon, access, actor);
        const native = facts.data.native;
        native.state = JSON.parse(JSON.stringify(native.state)); native.state.layers = native.state.layers || {};
        native.state.layers.ability = ability;
        let best = 0;
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const entry = pokemon.move(slot); if (!entry || entry.pp() <= 0) continue;
            const id = NativeLoadout.selection(access, slot, entry, actor).id, move = CobblemonCombat.moveTemplate(id);
            if (String(move.category()) === "status" || !(move.power() > 0)) continue;
            const result = PokemonDamage.preview(access, actor, facts, move, {});
            if (result.available) best = Math.max(best, result.amount);
        }
        return best;
    }
    function skillswapValue(context: WorldBehavior.Context, target: Entity): number {
        const cache = context.scratch.skillSwapValues || (context.scratch.skillSwapValues = {});
        if (cache[target.ref] !== undefined) return cache[target.ref];
        const access = world(context), self = source(context), own = access.actor(self.ref), other = access.actor(target.ref);
        if (!own || !other) return 0;
        let value = 0;
        if (domain(context, target) !== "cobblemon") {
            const a = CombatCopies.read(access, own), b = CombatCopies.read(access, other);
            Object.keys(a).forEach(id => { if (b[id] !== undefined) value += (b[id] - a[id]) / Math.max(.1, Math.abs(a[id]), Math.abs(b[id])); });
            // A friendly exchange is useful only when the presently engaged recipient gains more than its caster.
            if (target.friendly) value = target.attacking && !self.attacking ? -value : 0;
        } else {
            const mine = skillswapAbilityOf(context, self), theirs = skillswapAbilityOf(context, target);
            const ownBefore = skillswapAttackFit(access, own, mine), ownAfter = skillswapAttackFit(access, own, theirs);
            const theirBefore = skillswapAttackFit(access, other, theirs), theirAfter = skillswapAttackFit(access, other, mine);
            value = (ownAfter - ownBefore) / Math.max(1, ownBefore)
                + (target.friendly ? 1 : -1) * (theirAfter - theirBefore) / Math.max(1, theirBefore);
        }
        cache[target.ref] = value; return value;
    }

    function skillswapAbilityOf(context: WorldBehavior.Context, target: CompanionBehavior.Entity): string {
        return CompanionBehavior.fact<string>(context, "world_combat:skillswap-ability", target) || "";
    }

    function skillswapWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.domain(context, self) !== "cobblemon") return false;
        if (CompanionBehavior.status(context, self, "skillswap") || CompanionBehavior.status(context, target, "skillswap")) return false;
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 14)) return false;
        if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
        if (CompanionBehavior.domain(context, target) !== "cobblemon") {
            const access = CompanionBehavior.world(context), own = access.actor(self.ref), foe = access.actor(target.ref);
            return !!own && !!foe && CombatCopies.differs(access, own, CombatCopies.read(access, foe)) && skillswapValue(context, target) > .05;
        }
        const mine = skillswapAbilityOf(context, self), theirs = skillswapAbilityOf(context, target);
        if (!mine || !theirs || mine === theirs) return false;
        if (NativeAbilities.flag(mine, "failskillswap") || NativeAbilities.flag(theirs, "failskillswap")) return false;
        if (ai<boolean>(item, "requireActive", false) && !NativeAbilities.registry.has(theirs)) return false;
        return target.friendly ? skillswapValue(context, target) > .05 : skillswapValue(context, target) >= -.05;
    }

    registerUse("skillswap", {
        protocols: ["world_combat:control", "world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return skillswapWants(context, item, target);
        },
        accepts: function (context, _item, target) {
            return target.ref !== source(context).ref && target.health > 0 && target.visible;
        },
        priority: function (context, item, target) {
            if (target === null || !skillswapWants(context, item, target)) return 0;
            const value = skillswapValue(context, target);
            return value > .05 ? Math.min(70, 45 + value * 20) : 20;
        },
        approach: function (context, _item, target) {
            const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            const here = CompanionBehavior.point(self.point), there = CompanionBehavior.point(target.point);
            if (access.clear(here, there)) return null;
            const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2], length = Math.sqrt(dx * dx + dz * dz) || 1;
            const px = -dz / length, pz = dx / length;
            const options = [[self.point[0] + px * 3, self.point[1], self.point[2] + pz * 3],
                [self.point[0] - px * 3, self.point[1], self.point[2] - pz * 3]];
            for (let i = 0; i < options.length; i++) if (access.clear(CompanionBehavior.point(options[i]), there)) return options[i];
            return null;
        }
    });

    const skillswapChase = PokemonSkills.number("ai.maxChase", "识别距离", 3, 24, 1);
    skillswapChase.help = "威胁进入这个距离内才考虑对调特性；调大愿意隔着一段距离先描，调小只在贴身时换。";
    const skillswapActive = PokemonSkills.flag("ai.requireActive", "只换有实现的特性");
    skillswapActive.help = "开启：只有对手的特性在本项目里有实际实现时才换，避免换来一个什么都不做的身份；关闭：只要双方特性不同就换。";
    const skillswapStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    skillswapStation.help = "开启后，驻守中的伙伴也会离位去对调特性；关闭则只在原地够得到时出手。";

    PokemonSkills.addPreferences("skillswap", { ai: { maxChase: 14, requireActive: false, leaveStation: false } },
        [skillswapChase, skillswapActive, skillswapStation]);
}
