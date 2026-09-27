/**
 * 电喙 / boltbeak 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且威胁在 `ai.maxChase`（默认 10）格内。
 * `ai.leadFirst`（默认开）打开时，目标还没打过自己、也没正朝自己出手的那一刻 priority 抬到 45——这正是先手窗口；
 * 它偏好 2 格以外的目标：留出突刺行程才好抢在对手反应前啄到，贴脸先手收益最低。
 * 够不到怎么办：射程交给 dart，共享任务把身位收进射程后再出手。
 * 放完接什么：交回共享交战计划；它是点到即走的先手，不负责收尾。
 */
namespace PokemonSkills {
    /**
     * 先手预判与实际翻倍共用同一份 `boltbeakLead`（真实 window 随施法者速度在 12~36 刻间变化），
     * 不再用固定 45 刻替代，也不再读目标仇恨（attacking 是 Mob.getTarget，会误判尚未出手的锁定怪）。
     * 低血或身后有可退空间只是独立的一档分数，不改变先手条件本身。
     */
    function boltbeakWouldLead(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const self = world.actor(CompanionBehavior.source(context).ref);
        const foe = target.ref ? world.actor(target.ref) : null;
        return self !== null && foe !== null && boltbeakLead(withTarget({ world: world, actor: self }, foe)) > 0;
    }

    /** 后方（远离目标一侧）是否有真实可退空间：有则更适合打一下退开。 */
    function boltbeakRetreatOpen(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const self = world.actor(CompanionBehavior.source(context).ref);
        if (self === null || typeof world.freeSpace !== "function") return true;
        const body = world.observe(self);
        if (body === null) return true;
        const from = body.position();
        const away = from.minus(CompanionBehavior.point(target.point));
        const dir = away.length() < 0.01 ? WorldCombat.point(0, 0, 1) : away.unit();
        return world.freeSpace(from.plus(dir.scale(1.2)), Math.max(0.5, body.width()), Math.max(0.8, body.height()));
    }

    CompanionBehavior.registerUse(boltbeakId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "leadFirst", true)) return 10;
            if (!boltbeakWouldLead(context, target)) return 10;
            let score = distance >= 2 ? 45 : 26;
            const skirmish = !!(capability.data.config && capability.data.config.skirmish === true);
            if (boltbeakRetreatOpen(context, target)) score += 6;
            else score -= skirmish ? 18 : 8;
            return score;
        }
    });

    addPreferences(boltbeakId, {}, [
        field(pathOf("skirmish"), "游斗", "boolean", {
            help: "开启：啄完退得更远（+0.9 格），适合反复抢先进攻，但每啄约轻 10%%、冷却多 4 刻。关闭：站定啄出更重的一口，退步短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "威胁离自己这么远以内才起步突刺；调大愿意从更远处冲上来抢先后。"
        }),
        field(pathOf("ai.leadFirst"), "抢先进攻", "boolean", {
            help: "开启后，尚未被目标打过的时刻优先突刺（正是翻倍窗口）；关闭则按普通近战排序。"
        })
    ]);
}
