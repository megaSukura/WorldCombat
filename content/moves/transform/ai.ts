/** Target selection follows each supported Pokémon or native-world branch and the configured chase policy. */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_transform/power", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return 0;
        const pokemon = CobblemonCombat.pokemon(actor);
        let best = 0;
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (move !== null) best = Math.max(best, move.power());
        }
        return best;
    });

    function transformMoveIds(world: CombatWorld, actor: CombatActor): string[] {
        const pokemon = CobblemonCombat.pokemon(actor), layers = NativeModifiers.read(world, actor), ids: string[] = [];
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (move === null) continue;
            const id = layers.moves && layers.moves[String(slot)] || String(move.id());
            if (ids.indexOf(id) < 0) ids.push(id);
        }
        return ids;
    }

    /**
     * 实际能借到多少：比较目标确证的招式、六维与特性与自己现配置，取正向差异；普通主体只比
     * CombatCopies 限定表里的攻击/移动/防护。生命与库存从不计入收益。
     */
    CompanionBehavior.registerFact("world_combat:move_transform/gain", function (access, actor, _argument) {
        const self = access.source();
        if (!access.valid(self) || !access.valid(actor) || String(self.domain()) !== "cobblemon") return 0;
        if (String(actor.domain()) !== "cobblemon") {
            const values = CombatCopies.read(access, actor);
            let gain = 0;
            Object.keys(values).forEach(id => {
                const own = access.attributeValue(self, id);
                if (!own) return;
                const delta = values[id] - own.value();
                if (delta > 0) gain += delta / Math.max(1, Math.abs(own.value()));
            });
            return gain;
        }
        const myPokemon = CobblemonCombat.pokemon(self), myState = NativeEffects.read(access, self);
        const otPokemon = CobblemonCombat.pokemon(actor), otState = NativeEffects.read(access, actor);
        let gain = 0;
        ["atk", "def", "spa", "spd", "spe"].forEach(stat => {
            const own = NativeEffects.stat(myPokemon, myState, stat), theirs = NativeEffects.stat(otPokemon, otState, stat);
            if (theirs > own) gain += (theirs - own) / Math.max(1, own);
        });
        if (NativeEffects.ability(myPokemon, myState) !== NativeEffects.ability(otPokemon, otState)) gain += 0.2;
        const mine = transformMoveIds(access, self), theirs = transformMoveIds(access, actor);
        for (let i = 0; i < theirs.length; i++) if (mine.indexOf(theirs[i]) < 0) gain += 0.2;
        return gain;
    });

    function transformWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;

        if (CompanionBehavior.status(context, target, transformStatus)) return false;
        if (CompanionBehavior.status(context, CompanionBehavior.source(context), transformStatus)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (context.facts.focus !== target.ref
            && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }
    /** 一个真的能被描形的身体：非友方、存活、可见的宝可梦或普通生物，且不在变身中。 */
    function transformCopyable(context: WorldBehavior.Context, subject: CompanionBehavior.Entity): boolean {
        if (subject.health <= 0 || subject.friendly || !subject.visible) return false;

        if (CompanionBehavior.status(context, subject, transformStatus)) return false;
        return String(subject.ref) !== String(CompanionBehavior.source(context).ref);
    }
    /**
     * 能描形的对象：提议的对象本身可复制就用它；提议的只是「眼前威胁」（玩家、无法指向的目标之类）时，
     * 换最近的一个可复制身体——对手不总是宝可梦，变身要挑得动的那一个。没有可复制对象就放弃本次。
     */
    function transformPick(context: WorldBehavior.Context, item: WorldBehavior.Capability, proposed: CompanionBehavior.Entity): CompanionBehavior.Entity | null {
        if (transformCopyable(context, proposed)) return proposed;
        const self = CompanionBehavior.source(context), limit = CompanionBehavior.ai<number>(item, "maxChase", 12);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let best: CompanionBehavior.Entity | null = null, bestDistance = Infinity;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!transformCopyable(context, other)) continue;
            const gap = CompanionBehavior.distance(self.point, other.point);
            if (gap > limit || gap >= bestDistance) continue;
            best = other; bestDistance = gap;
        }
        return best;
    }

    CompanionBehavior.registerUse(transformId, {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return target === null ? true : transformWants(context, item, target); },
        selectTarget: function (context, item, proposed) { return transformPick(context, item, proposed); },
        target: function (context, item, target) { return transformPick(context, item, target); },
        accepts: function (context, _item, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, transformStatus);
        },
        priority: function (context, item, target) {
            if (target === null || !transformWants(context, item, target)) return 0;
            const gain = CompanionBehavior.fact<number>(context, "world_combat:move_transform/gain", target);
            const power = CompanionBehavior.fact<number>(context, "world_combat:move_transform/power", target);
            let score = 6;
            // 普通生物与招式威力为 0 的宝可梦一样按实际借到的部分评分，不因 powerfact 归零就被当成没意义。
            if (gain !== null && gain >= 0.8) score = 55;
            else if (gain !== null && gain > 0.15) score = 30;
            if (power !== null && power >= 80) score = Math.max(score, 55);
            else if (power !== null && power >= CompanionBehavior.ai<number>(item, "minPower", 30)) score = Math.max(score, 30);
            return score;
        }
    });

    addPreferences(transformId, { dwell: true, ai: { maxChase: 12, minPower: 30, leaveStation: false } }, [
        number("ai.maxChase", "考虑距离", 3, 20, 1),
        number("ai.minPower", "优先威力", 20, 120, 5),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
