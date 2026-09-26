/**
 * 种子炸弹 / seedbomb 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活、在 `ai.maxChase`（默认 12）格以内，且伙伴没在骑乘/被骑。
 * 它是一记中距离高抛落种：`ai.preferGround`（默认开）让落地的目标多一档分——种雨从上方落下，站定的目标更吃得住；
 * 贴得太近时降低分，把位置交给普通近战。
 * 对谁出手：当前威胁；落在中段距离、站在地上的目标优先，焦点目标另加一档。
 * 够不到怎么办：交给共享接近逻辑；伙伴走近到射程内再抛荚，不需要精确贴身。
 * 放完之后：落种砸在目标附近一小圈，伙伴交回共享顺序决定继续贴身还是走位等冷却。
 */
namespace PokemonSkills {
    function seedbombWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const range = CompanionBehavior.ai<number>(item, "maxChase", 12);
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= range;
    }

    CompanionBehavior.registerUse("seedbomb", {
        protocols: ["world_combat:attack"],
        target:function(context,item,target){
            if(target.grounded===false)return target;
            const world=CompanionBehavior.world(context),entity=world.actor(target.ref),body=entity?world.observe(entity):null;
            if(!body)return target;
            const velocity=CompanionBehavior.velocity(context,target)||[0,0,0],lead=WorldCombat.point(velocity[0]*6,0,velocity[2]*6);
            const base=WorldCombat.point(body.position().x(),body.boundsMin().y(),body.position().z()).plus(lead.length()>2.5?lead.unit().scale(2.5):lead);
            const floor=SurfacePaths.support(world,base,1,2);if(!floor)return null;
            const result=JSON.parse(JSON.stringify(target));result.ref="";result.point=[floor.x(),floor.y()+.04,floor.z()];return result;
        },
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return seedbombWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !seedbombWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let value = 22;
            if (CompanionBehavior.ai<boolean>(capability, "preferGround", true) && target.grounded !== false) value += 8;
            if (distance >= 3 && distance <= capability.data.range) value += 5;
            if (distance < 2) value -= 6;
            if (context.facts.focus === target.ref) value += 10;
            return value;
        }
    });

    addPreferences("seedbomb", {}, [
        number("ai.maxChase", "考虑距离", 3, 20, 1),
        flag("ai.preferGround", "优先落地目标")
    ]);
}
