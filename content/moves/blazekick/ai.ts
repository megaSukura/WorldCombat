/**
 * 火焰踢 / blazekick 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）之内；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferUnlit`（默认开）打开时，还没烧起来的目标排得更前——重踢只会刷新已有的火；
 *   已经浮空的目标排得靠后，因为这一脚的价值在把人挑起来。它只读原生事实估计真正的收益：`nativeEntity(...).fireImmune()`
 *   与宝可梦的灼伤免疫说明火留不住，`attributeValue` 读到的原生抗击退（null 是未知、不算免推）说明挑不起来——
 *   这些只降低它的排序，不封锁这一脚本来仍能造成的伤害，也不假定对它们有通用的失能。
 * 够不到怎么办：踢程交给 `reach`，共享任务先把身位收进腿的范围再踢。
 * 放完之后：被踢中的人得到一个向上的速度冲量（能否离地按原生击飞规则），交回共享交战计划决定追不追。
 */
namespace PokemonSkills {
    function blazekickClose(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    /** 真实火免疫：原生 fireImmune 生物，以及宝可梦按属性/特性对灼伤的免疫；未知不当作免疫。 */
    function blazekickFireImmune(world: CombatWorld, target: CompanionBehavior.Entity): boolean {
        const actor = world.actor(target.ref);
        if (actor === null) return false;
        const native = world.nativeEntity(actor);
        if (native !== null && typeof native.fireImmune === "function" && native.fireImmune()) return true;
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        try { return !NativeEffects.statusAllowed(world, actor, "burn", false, true); }
        catch (error) { return false; }
    }

    /** 抗击退高到挑不起来：升空价值按实际可兑现计；null 是未知、不当作免推。 */
    function blazekickImmovable(world: CombatWorld, target: CompanionBehavior.Entity): boolean {
        const actor = world.actor(target.ref);
        if (actor === null) return false;
        const resistance = world.attributeValue(actor, "minecraft:generic.knockback_resistance");
        return resistance !== null && resistance.value() >= 0.9;
    }

    CompanionBehavior.registerUse("blazekick", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return blazekickClose(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !blazekickClose(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const world = CompanionBehavior.world(context);
            const fireImmune = blazekickFireImmune(world, target);
            let score = 22;
            // 免火的目标留不住火，不把灼伤算进它的价值；已烧着的重踢只刷新火，同理。
            if (!fireImmune && CompanionBehavior.ai<boolean>(capability, "preferUnlit", true) && !CompanionBehavior.status(context, target, "burn")) score += 9;
            if (target.grounded === false) score -= 8;
            // 免火与抗击退只按实际能兑现的伤害价值算，不把点燃/挑飞当通用的失能。
            if (fireImmune) score -= 4;
            if (blazekickImmovable(world, target)) score -= 4;
            return score;
        }
    });

    addPreferences("blazekick", {}, [
        field(pathOf("ignite"), "烈焰式", "boolean", {
            help: "开启：点燃概率 +12%%、灼伤时长 ×1.2、踢起更高，但踢击威力 ×0.88、冷却 +4 刻——以留火为主。关闭（重踢式）：踢得更重、循环更快，但火更难留、挑得略低。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动出脚，先走近；踢程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.preferUnlit"), "优先踢没着火的", "boolean", {
            help: "开启：还没被点着的目标排得更前，避免重踢只刷新已有的火；关闭则所有目标同价。"
        })
    ]);
}
