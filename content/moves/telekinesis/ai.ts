/**
 * 意念移物 / telekinesis 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、有一条通视直线，目标还站在地上、没被悬起、也没被
 *   击落或扎根。默认避开「对地面属性弱势」的目标——把它们抬起来等于替它们免掉地面招，反而帮了对手。
 * 对谁出手：当前威胁；已悬空、被击落、扎根、或已经离地飞行的目标跳过。
 * 候选之间怎么排：普通悬空 priority 75；只有关掉「避开弱势」时才考虑地面弱势目标，降到 20 兜底。
 * 够不到怎么办：reach 就是本招射程（由特攻与体型决定）；共享任务先走近，approach 在无通视时侧移找角度。
 * 放完之后：目标悬空一段、挪不动，地面招式也够不到它；念力走完自行松开，伙伴交回共享交战计划。
 * 配置 ai.requireGrounded 决定是否只抬站在地上的目标；ai.avoidProtecting 决定要不要避开地面弱势目标。
 */
namespace CompanionBehavior {
    /** 只读事实：目标是否对地面属性弱势（抬起它等于替它免掉地面招）。 */
    CompanionBehavior.registerFact("world_combat:telekinesis-ground-weak", function (access: CombatWorld, actor: CombatActor): number {
        const facts = PokemonDamage.combatants.read(access, actor);
        const weak = ["fire", "electric", "poison", "rock", "steel"];
        for (let i = 0; i < facts.types.length; i++) if (weak.indexOf(String(facts.types[i])) >= 0) return 1;
        return 0;
    });

    function telekinesisWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || !target.visible) return false;
        const access=CompanionBehavior.world(context),actor=access.actor(target.ref);if(!actor)return false;
        if(access.effects(actor,"world_combat:telekinesis_refused").length)return false;
        const resistance=access.attributeValue(actor,"minecraft:generic.knockback_resistance");
        if(!target.friendly&&resistance&&resistance.value()>=1)return false;
        if(target.friendly){
            const body=access.observe(actor);if(!body)return false;
            const floor=access.block(WorldCombat.point(body.position().x(),body.boundsMin().y()-.1,body.position().z()));
            if(!floor||["minecraft:magma_block","minecraft:campfire","minecraft:soul_campfire"].indexOf(String(floor.id()))<0)return false;
        }
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.status(context, target, "telekinesis")) return false;
        if (CompanionBehavior.status(context, target, "smackdown") || CompanionBehavior.status(context, target, "ingrain")) return false;
        if (CompanionBehavior.ai<boolean>(item, "requireGrounded", true) && target.grounded === false) {
            const body=access.observe(actor);if(!body)return false;
            const feet=WorldCombat.point(body.position().x(),body.boundsMin().y(),body.position().z()),floor=SurfacePaths.support(access,feet,.05,.25);
            if(!floor||feet.y()-floor.y()>.12)return false;
        }
        if (!target.friendly && CompanionBehavior.ai<boolean>(item, "avoidProtecting", true)
            && CompanionBehavior.fact<number>(context, "world_combat:telekinesis-ground-weak", target) === 1) return false;
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 13)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    registerUse("telekinesis", {
        protocols: ["world_combat:control", "world_combat:cover"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return telekinesisWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null || !telekinesisWants(context, item, target)) return 0;
            if(target.friendly)return 90;
            return CompanionBehavior.fact<number>(context, "world_combat:telekinesis-ground-weak", target) === 1 ? 20 : 75;
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

    const telekinesisChase = PokemonSkills.number("ai.maxChase", "悬空距离", 3, 24, 1);
    telekinesisChase.help = "威胁进入这个距离内才考虑悬空；调大愿意隔着一段距离先抬，调小只在贴身时控。";
    const telekinesisGrounded = PokemonSkills.flag("ai.requireGrounded", "只抬站在地上的目标");
    telekinesisGrounded.help = "开启：只对还站在地上的目标出手，飞在空中的目标跳过；关闭：本就离地的目标也照抬。";
    const telekinesisProtect = PokemonSkills.flag("ai.avoidProtecting", "避开地面弱势目标");
    telekinesisProtect.help = "开启：对火／电／毒／岩／钢等怕地面招的目标不出手，免得替它们免掉地面伤害；关闭：控住优先，照抬。";
    const telekinesisStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    telekinesisStation.help = "开启后，驻守中的伙伴也会离位去悬空目标；关闭则只在原地够得到时出手。";

    PokemonSkills.addPreferences("telekinesis", { ai: { maxChase: 13, requireGrounded: true, avoidProtecting: true, leaveStation: false } },
        [telekinesisChase, telekinesisGrounded, telekinesisProtect, telekinesisStation]);
}
