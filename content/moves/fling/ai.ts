/** Feed a useful real Berry to a partner; offensive and valuable items require an appropriate explicit policy. */
namespace CompanionBehavior {
    function flingHeld(context: WorldBehavior.Context): PokemonSkills.FlingItem | null {
        var access = CompanionBehavior.world(context);
        var actor = access.actor(CompanionBehavior.source(context).ref);
        if (!actor || String(actor.domain()) !== "cobblemon") return null;
        return PokemonSkills.flingItemOf(CobblemonCombat.pokemon(actor));
    }

    function flingSnapshot(context: WorldBehavior.Context): NativeItems.Held | null {
        const access=world(context), actor=access.actor(source(context).ref); return actor?NativeItems.heldOf(access,actor):null;
    }
    function flingHelpful(context: WorldBehavior.Context, target: Entity): boolean {
        const berry=NativeItems.berryFrom(flingSnapshot(context));if(!berry)return false;
        return berry.heal>0&&ratio(target)<.9 || berry.cures.some(name=>status(context,target,name));
    }
    registerUse("fling", {
        protocols: ["world_combat:attack", "world_combat:ranged", "world_combat:heal"],
        reach: (_context,item)=>item.data.range,
        available: function(context,item,_purpose,target){
            const held=flingHeld(context);if(!held)return false;
            if(!target)return true;
            if(distance(source(context).point,target.point)>ai<number>(item,"maxChase",12))return false;
            if(target.friendly)return item.data.config.helpFriends!==false&&target.ref!==source(context).ref&&flingHelpful(context,target);
            return !held.berry && (held.status!=="" || held.flinch || ai<boolean>(item,"allowGear",false));
        },
        accepts: function(context,_item,target){return target.health>0&&target.visible&&(!target.friendly||flingHelpful(context,target));},
        priority: function(context,_item,target){
            const held=flingHeld(context);if(!held)return 0;
            if(target&&target.friendly)return 60+Math.round((1-ratio(target))*25);
            return held.status||held.flinch?45:held.power>=90?40:20;
        }
    });

    PokemonSkills.addPreferences("fling", { helpFriends: true, ai: { maxChase: 12, leaveStation: true, allowGear: false } }, [
        PokemonSkills.number("ai.maxChase", "投掷距离", 4, 24, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位"),
        PokemonSkills.flag("helpFriends", "给伙伴喂树果"),
        PokemonSkills.flag("ai.allowGear", "允许投出普通装备")
    ]);
}
