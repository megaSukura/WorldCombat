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
    /** 抛弧能不能够到：用本招实际的飞行速度与重力解一次低弧；够不到就不值得出手，交给共享接近。 */
    function flingArcReachable(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        try {
            const access = world(context), actor = access.source();
            const values = { world: access, actor: actor, skill: PokemonSkills.skills["fling"], detail: { values: item.data.config || {} } };
            const speed = PokemonSkills.p("fling", "speed", values), gravity = PokemonSkills.p("fling", "gravity", values);
            return LivingActions.ballistic(point(source(context).point), point(target.point), speed, gravity) !== null;
        } catch (error) { return true; }
    }
    /** 弧线路上还站着谁：道具会先打中拦路的人，自己人和别的身体分开计数，供不同目标取舍。 */
    function flingCorridor(context: WorldBehavior.Context, target: Entity): { friendly: number; others: number } {
        const self = source(context), from = point(self.point), to = point(target.point), span = from.minus(to).length();
        const nearby: Entity[] = <any>context.facts.nearby || [];
        let friendly = 0, others = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.health <= 0 || String(other.ref) === String(self.ref) || String(other.ref) === String(target.ref)) continue;
            const at = point(other.point), closest = WorldGeometry.closestOnSegment(at, from, to);
            if (at.minus(closest).length() > 0.9 || closest.minus(from).length() >= span - 0.6) continue;
            if (other.friendly) friendly++; else others++;
        }
        return { friendly: friendly, others: others };
    }
    registerUse("fling", {
        protocols: ["world_combat:attack", "world_combat:ranged", "world_combat:heal"],
        reach: (_context,item)=>item.data.range,
        available: function(context,item,_purpose,target){
            const held=flingHeld(context);if(!held)return false;
            if(!target)return true;
            if(distance(source(context).point,target.point)>ai<number>(item,"maxChase",12))return false;
            if(target.friendly){
                if(item.data.config.helpFriends===false||target.ref===source(context).ref||!flingHelpful(context,target))return false;
                // 喂给伙伴要弧线真的够得到，且中途别被别的身体挡住（谁先挡上就先吃到）。
                const path=flingCorridor(context,target);
                return flingArcReachable(context,item,target)&&path.friendly===0&&path.others===0;
            }
            if(held.berry||!(held.status!==""||held.flinch||ai<boolean>(item,"allowGear",false)))return false;
            // 打敌人时别让自己人挡在弧线上，否则道具会先喂到队友身上。
            return flingCorridor(context,target).friendly===0;
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
