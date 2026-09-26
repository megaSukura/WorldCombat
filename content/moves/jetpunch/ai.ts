/**
 * 喷射拳 / jetpunch 的伙伴 AI 用途。
 *
 * 同一只拳有两个用途，注册在两条协议上：
 *   `world_combat:attack`——对 `ai.maxChase`（默认 6）内可见、敌对的敌人出一记短直水拳；
 *   `world_combat:heal`  ——`ai.cureAllies`（默认开）时，对射程内**带灼伤**的同伴补一拳水、把火浇灭（无伤）。
 * 对谁出手：攻击分支不可见、友方或已倒下的不接受；救援分支只接受着火的同伴（不含自己）。
 * 选择偏好：攻击分支里 `ai.preserveBurn` 开（默认）时，对带灼伤的敌人降一档——浇灭会损失持续伤害；
 *   `ai.preferDry` 开（默认）时已带 soaked 的目标排后；`ai.finish` 开（默认）时残血目标优先。
 *   救援分支优先级低于专门的治愈招（它只洗灼伤、不回血），所以「有更好支援」时会让位。
 * 优先次序（敌）：基础 24；已在拳程内 +4；目标正打自己 +6；残血 +8；带灼伤 −16；已湿 −8。
 * 够不到怎么办：拳程由 `reach` 决定，共享任务把身位收进拳程后再打。
 * 放完之后：敌人被浇透、顶退，带火的被浇熄；同伴的火被洗掉。交回共享交战计划。
 */
namespace PokemonSkills {
    function jetpunchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    function jetpunchAidWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (!CompanionBehavior.ai<boolean>(capability, "cureAllies", true)) return false;
        if (!target.friendly || target.health <= 0 || !target.visible) return false;
        if (String(target.ref) === String(CompanionBehavior.source(context).ref)) return false;
        if (!CompanionBehavior.status(context, target, "burn")) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range;
    }

    CompanionBehavior.registerUse(jetpunchId, {
        protocols: ["world_combat:attack", "world_combat:contact", "world_combat:heal"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.friendly) return jetpunchAidWants(context, capability, target);
            return jetpunchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            if (target.friendly) return jetpunchAidWants(context, capability, target);
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (target.friendly) {
                // 只洗灼伤、不回血，优先度低于专门的治愈招。
                return jetpunchAidWants(context, capability, target) ? 60 : 0;
            }
            if (!jetpunchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 24;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "preserveBurn", true) && CompanionBehavior.status(context, target, "burn")) score -= 16;
            if (CompanionBehavior.ai<boolean>(capability, "preferDry", true) && CompanionBehavior.status(context, target, "soaked")) score -= 8;
            if (target.attacking === self.ref) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 8;
            return score;
        }
    });

    addPreferences(jetpunchId, {}, [
        field(pathOf("hammer"), "水锤式", "boolean", {
            help: "开启：水柱在接触瞬间炸开，顶开 ×1.7、判定更宽，把目标推得更远；代价是威力 ×0.9、拳程 −0.4 格、浇透更短、冷却多 6 刻。关闭（直拳式）：更长、更重、湿得更久，但顶得近。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手离自己这么远以内才主动出拳；本招拳程短，设大也常常要先走近。"
        }),
        field(pathOf("ai.preserveBurn"), "保留灼伤", "boolean", {
            help: "开启：对带有灼伤的敌人降低本招优先级，优先保留持续伤害；紧急顶退和残血补刀仍可出手。关闭：按普通进攻收益排序。"
        }),
        field(pathOf("ai.preferDry"), "先打干的", "boolean", {
            help: "开启：已经带着 soaked 的目标排后，先换一个干的打；关闭：当普通先制候选排序。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时优先补这一拳；关闭：只按普通先制候选排序。"
        }),
        field(pathOf("ai.cureAllies"), "替同伴灭火", "boolean", {
            help: "开启：射程内有着火的同伴时，AI 会主动走过去补一拳水把火浇灭（只灭火、无伤害）；关闭：只在攻击分支里用这一拳。"
        })
    ]);
}
