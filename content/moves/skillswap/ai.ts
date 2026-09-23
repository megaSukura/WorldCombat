/** Target selection follows each supported Pokémon or native-world branch and the configured chase policy. */
namespace CompanionBehavior {
    /** 只读事实：一个战斗者当前生效的特性 id（含临时覆盖层）。 */
    CompanionBehavior.registerFact("world_combat:skillswap-ability", function (access: CombatWorld, actor: CombatActor): string {
        return PokemonSkills.skillswapAbility(access, actor);
    });
    /** 只读事实：一个宝可梦当前特性的“有效程度”——0 无特性，1 有但未实现，2 有实现会真正参与战斗。 */
    CompanionBehavior.registerFact("world_combat:skillswap-worth", function (access: CombatWorld, actor: CombatActor): number {
        const name = PokemonSkills.skillswapAbility(access, actor);
        if (!name) return 0;
        return NativeAbilities.registry.has(name) ? 2 : 1;
    });

    function skillswapAbilityOf(context: WorldBehavior.Context, target: CompanionBehavior.Entity): string {
        return CompanionBehavior.fact<string>(context, "world_combat:skillswap-ability", target) || "";
    }

    function skillswapWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.domain(context, self) !== "cobblemon") return false;
        if (CompanionBehavior.status(context, self, "skillswap") || CompanionBehavior.status(context, target, "skillswap")) return false;
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 14)) return false;
        if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
        if (CompanionBehavior.domain(context, target) !== "cobblemon") {
            const access = CompanionBehavior.world(context), own = access.actor(self.ref), foe = access.actor(target.ref);
            return !!own && !!foe && CombatCopies.differs(access, own, CombatCopies.read(access, foe));
        }
        const mine = skillswapAbilityOf(context, self), theirs = skillswapAbilityOf(context, target);
        if (!mine || !theirs || mine === theirs) return false;
        const worth = CompanionBehavior.fact<number>(context, "world_combat:skillswap-worth", target);
        if (worth === null || worth <= 0) return false;
        if (CompanionBehavior.ai<boolean>(item, "requireActive", false) && worth < 2) return false;
        return true;
    }

    registerUse("skillswap", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return skillswapWants(context, item, target);
        },
        accepts: function (context, _item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, item, target) {
            if (target === null || !skillswapWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            const mine = CompanionBehavior.fact<number>(context, "world_combat:skillswap-worth", self);
            const theirs = CompanionBehavior.fact<number>(context, "world_combat:skillswap-worth", target);
            if (mine === null || theirs === null) return 45;
            if (theirs > mine) return 65;
            if (theirs < mine) return 25;
            return 45;
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
