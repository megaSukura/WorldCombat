/**
 * 单纯光束 的伙伴 AI 用途：这招自己的一套出手计划，敌我两面。
 *
 * 对敌（world_combat:control）：一个看得见、够得着（ai.maxChase 内）、视线畅通、特性可被顶替的宝可梦威胁。
 *   带 wonder guard／multiscale 一类麻烦特性时 priority 抬到 76——顶成单纯等于拆掉它的打法；其余可改写目标 60。
 * 对友（world_combat:bolster）：身边看得见、正在交战的队友，还没被改写。把它变成单纯，之后它的强化（和降级）
 *   都翻倍；普通生物也吃同一个共享入口。priority 46。
 * 对谁出手：敌人是当前威胁；友方是共享伙伴感官挑来的伙伴；已经带着 simplebeam 的目标跳过，不重复刷。
 * 放不上就不出手：未知的 Boss 能力读不出就不冒充改写；cantsuppress／已是单纯／truant 的宝可梦明确拒绝。
 * 够不到怎么办：reach 就是念波射程，由共享接近逻辑把身体带进范围；视线被挡或距离不够时不急。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    registerFact("world_combat:simplebeam-ability", function (access, actor, _argument) {
        return PokemonSkills.simplebeamAbility(access, actor);
    });

    const simplebeamWave = PokemonSkills.flag("wave", "念波扩散");
    simplebeamWave.help = "开启＝念波扩散：光束在目标处炸开，把附近一圈可改写的宝可梦一起改简单，但每层维持 ×0.6、冷却 +18 刻；关闭＝单束：只打一个目标、维持 ×1.35、冷却 −8 刻。覆盖与持续互相取舍。";
    const simplebeamChase = PokemonSkills.number("ai.maxChase", "考虑距离", 2, 20, 1);
    simplebeamChase.help = "伙伴只在威胁离自己这么远以内时才考虑发念波；调小只在贴身时用，调大愿意先追过去。";
    const simplebeamStation = PokemonSkills.flag("ai.leaveStation", "驻守时离位");
    simplebeamStation.help = "开启后，收到「驻守」指令时也会离开原位去发念波。";

    PokemonSkills.addPreferences("simplebeam", { wave: false, ai: { maxChase: 13, leaveStation: false } },
        [simplebeamWave, simplebeamChase, simplebeamStation]);

    var simplebeamTrouble = ["wonderguard", "multiscale", "magicguard", "levitate", "flashfire", "waterabsorb",
        "voltabsorb", "sapsipper", "sturdy", "disguise", "thickfat", "filter", "regenerator", "immunity",
        "hydration", "overcoat", "intimidate", "prankster", "dazzling", "queenlymajesty", "armortail"];

    function simplebeamWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "simplebeam")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 13)) return false;
        if (domain(context, threat) !== "cobblemon") return world(context).clear(point(self.point), point(threat.point));
        if (!world(context).clear(point(self.point), point(threat.point))) return false;
        const ability = fact<string>(context, "world_combat:simplebeam-ability", threat);
        return ability !== null && PokemonSkills.simplebeamReceivable(ability);
    }

    /** 目标是否真的有可用强化路线：已经在正向能力等级上，或招式表里带着能改变等级的变化类手段。 */
    function simplebeamStagePotential(context: WorldBehavior.Context, subject: Entity): boolean {
        const world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        if (actor === null) return false;
        const stages = NativeEffects.effectiveStages(world, actor);
        for (const key in stages) if (stages[key] > 0) return true;
        if (String(actor.domain()) !== "cobblemon") return false;
        const pokemon = CobblemonCombat.pokemon(actor), layers = NativeModifiers.read(world, actor);
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot); if (move === null) continue;
            const id = layers.moves && layers.moves[String(slot)] || String(move.id());
            if (String(CobblemonCombat.moveTemplate(id).category()) === "status") return true;
        }
        return false;
    }

    /** 给可以接强化的伙伴铺垫：可见、还没被改写、有后续等级变化手段；只是正在攻击不算理由。 */
    function simplebeamSupports(context: WorldBehavior.Context, item: WorldBehavior.Capability, ally: Entity): boolean {
        const self = source(context);
        if (!ally || ally.health <= 0 || !ally.friendly || !ally.visible) return false;
        if (ally.ref === self.ref) return false;
        if (context.facts.mounted) return false;
        if (status(context, ally, "simplebeam")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, ally.point) > ai<number>(item, "maxChase", 13)) return false;
        if (!world(context).clear(point(self.point), point(ally.point))) return false;
        if (!simplebeamStagePotential(context, ally)) return false;
        if (domain(context, ally) !== "cobblemon") return true;
        const ability = fact<string>(context, "world_combat:simplebeam-ability", ally);
        return ability !== null && PokemonSkills.simplebeamReceivable(ability);
    }

    registerUse("simplebeam", {
        protocols: ["world_combat:control", "world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return target.friendly ? simplebeamSupports(context, item, target) : simplebeamWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || target.health <= 0) return 0;
            if (target.friendly) return simplebeamSupports(context, item, target) ? 46 : 0;
            if (!simplebeamWants(context, item, target)) return 0;
            const ability = fact<string>(context, "world_combat:simplebeam-ability", target);
            if (ability !== null && simplebeamTrouble.indexOf(ability) >= 0) return 76;
            // 普通敌不固定高权：只有它确实在走强化路线或带着后续等级变化时，改写才更有价值。
            return simplebeamStagePotential(context, target) ? 54 : 34;
        }
    });
}
