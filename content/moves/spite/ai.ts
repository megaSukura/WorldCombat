/**
 * 怨恨 / spite —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，在 `ai.maxChase`（默认 14）格内、有一条通视直线，且还没带着怀恨。
 *   已经带着怀恨的目标会被跳过：这一份疲惫不会刷新成空耗，等它被匹配掉或过期再考虑。
 * 对谁出手：优先刚展现过真实进攻的目标。本作招式（造成威胁的物/特攻招）按类别与威力分档；原生攻击按一次
 *   已经命中的攻击记一档；非常近的一次出手额外加价，因为「刚打疼你的那一手」下一击才最该变钝。宝可梦那一手
 *   还有 PP 可扣时再高一点；没有可读进攻的普通目标保留一个低的兜底分，不空讨但也不因等待而脱战。
 * 够不到怎么办：射程交给 reach，共享任务把身位收进通视射程后再放。
 * 放完接什么：交回共享交战计划；怀恨会自己等下一次同手，不需要继续盯着。
 */
namespace PokemonSkills {
    /** 决策内缓存：本次的真实记忆窗口；AI 读出的手与执行层读同一份公式。 */
    function spiteMemory(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const cached = context.scratch.spiteMemory;
        if (typeof cached === "number") return cached;
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const actor = world.actor(self.ref);
        const value = actor ? p("spite", "memory",
            { world: world, actor: actor, skill: skills["spite"], detail: { values: item.data.config || {} } }) : 0;
        const memory = isFinite(value) && value > 0 ? value : 120;
        context.scratch.spiteMemory = memory;
        return memory;
    }
    function spiteAge(access: CombatWorld, actor: CombatActor, argument: any): number {
        const last = DamageSemantics.recentOffense(access, actor, Number(argument) || 120);
        return last && typeof last.directProjectile === "boolean" ? Math.max(0, access.tick() - last.tick) : -1;
    }
    CompanionBehavior.registerFact("world_combat:spite-target", (access, actor, argument) => spiteAge(access, actor, argument));
    CompanionBehavior.registerFact("world_combat:spite-last", function (access, actor, argument) {
        const last = DamageSemantics.recentOffense(access, actor, Number(argument) || 120);
        if (!last || typeof last.directProjectile !== "boolean") return "";
        return last.kind === "move" ? (last.move ? "world_combat:" + last.move.replace(/^world_combat:/, "") : "") : last.type;
    });
    CompanionBehavior.registerFact("world_combat:spite-pp", function (access, actor, argument) {
        if (String(actor.domain()) !== "cobblemon") return false;
        const maxAge = typeof argument === "number" && isFinite(argument) && argument > 0 ? argument : 120;
        const state = NativeEffects.read(access, actor);
        if (!state.used || access.tick() - (state.usedTick || -1000) > maxAge) return false;
        const last = NativeEffects.lastMove(access, actor);
        if (last === null) return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        for (let index = 0; index < pokemon.moveSlots(); index++) {
            const move = pokemon.move(index);
            if (move && String(move.id()) === last.id && move.pp() > 0) return true;
        }
        return false;
    });

    /** 刚展现的进攻威胁分档：本作招式按类别与威力，原生攻击记一档。 */
    function spiteThreat(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const content = CompanionBehavior.fact<string>(context, "world_combat:spite-last", target, spiteMemory(context, item));
        if (!content) return CompanionBehavior.fact<boolean>(context, "world_combat:spite-pp", target, spiteMemory(context, item)) ? 20 : 0;
        if (content.indexOf("world_combat:") !== 0) return 40;
        const info = CobblemonCombat.moveTemplate(content.slice("world_combat:".length));
        if (!info) return 16;
        return String(info.category()) === "status" ? 34 : info.power() >= 80 ? 58 : info.power() >= 50 ? 46 : 30;
    }

    /** 出手对象条件：可见、敌对、存活、未带怀恨、够得到且有通视。 */
    function spiteWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (!CompanionBehavior.fact<string>(context, "world_combat:spite-last", target, spiteMemory(context, item))
            && !CompanionBehavior.fact<boolean>(context, "world_combat:spite-pp", target, spiteMemory(context, item))) return false;
        if (CompanionBehavior.status(context, target, "grudge")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (context.facts.focus !== target.ref
            && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 14)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse("spite", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) { return target === null ? true : spiteWants(context, capability, target); },
        accepts: function (_context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (target === null || !spiteWants(context, capability, target)) return 0;
            let score = spiteThreat(context, capability, target);
            if (score <= 0) return 0;
            const since = CompanionBehavior.fact<number>(context, "world_combat:spite-target", target, spiteMemory(context, capability));
            if (typeof since === "number" && since >= 0 && since <= 40) score += 6;
            if (CompanionBehavior.fact<boolean>(context, "world_combat:spite-pp", target, spiteMemory(context, capability))) score += 4;
            return score;
        }
    });

    addPreferences("spite", {}, [
        field(pathOf("ai.maxChase"), "记恨距离", "number", {
            min: 4, max: 26, step: 1,
            help: "超过这个距离就不主动送怨念，先走近；越大越愿意追出去记恨，也越容易在半路被甩掉。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为送怨念离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
