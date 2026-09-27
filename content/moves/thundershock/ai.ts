/**
 * 电击 / thundershock —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack／ranged 位上；带电击的伙伴把它当作贴身的快刺与追打手段。
 *   对可见、敌对、存活、在 `ai.maxChase`（默认 8）以内、且中间有一条通视线的目标出手；更远交给共享接近逻辑。
 * 对谁出手：`ai.followUp`（默认开）打开时，已经麻住的目标优先级明显抬高——这一刺对已麻目标更狠，还能续麻；
 *   没被麻的目标照常作为贴身的补刀候选。
 * 够不到怎么办：射程只交给 `reach`（本族最短），共享任务把身位贴进去之后再扎；靠墙的目标先等共享接近逻辑找到射界。
 *   出手前先确认到目标之间没有同伴身体挡路——同伴会泄电，这一刺就白扎。
 * 放完之后：命中者或已带上麻痹、或被续长，伙伴交回共享顺序继续交战。
 * 优先级：基础 20（已在射程内）；已麻且麻痹剩余不多时 +16（真正追打并续麻），已麻但剩余很久时只 +4（不误当急续控制），未麻 +4。
 */
namespace PokemonSkills {
    /** 目标身上麻痹（共享身份）还剩多久；读不到实体或没有时返回 0。 */
    function thundershockParalysisRemaining(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context), actor = world.actor(target.ref);
        if (actor === null || !world.valid(actor)) return 0;
        const effect = world.mobEffect(actor, "world_combat:paralysis");
        return effect === null ? 0 : effect.duration();
    }

    /** 射线是否会被同伴先挡住：同伴会泄电、目标反而吃不到这一刺，所以先确认通道干净。 */
    function thundershockAllyInWay(context: WorldBehavior.Context, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const from = CompanionBehavior.point(self.point), to = CompanionBehavior.point(target.point);
        const span = to.minus(from), length = span.length();
        if (length < 0.05) return false;
        const mid = from.plus(span.scale(0.5));
        const nearby = world.query(mid, length * 0.5 + 1, false);
        for (let i = 0; i < nearby.length; i++) {
            const actor = nearby[i];
            if (String(actor.ref()) === String(self.ref) || String(actor.ref()) === String(target.ref)) continue;
            const body = world.observe(actor);
            if (body === null || !body.friendly()) continue;
            const point = body.position();
            if (WorldGeometry.closestOnSegment(point, from, to).minus(point).length() <= body.width() * 0.5 + 0.2) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse(thundershockId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
            if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
            return !thundershockAllyInWay(context, self, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return 0;
            let value = gap <= capability.data.range ? 20 : 4;
            if (!CompanionBehavior.ai<boolean>(capability, "followUp", true) || !CompanionBehavior.status(context, target, "paralysis")) value += 4;
            // 已麻追打按剩余长短区分：还剩很久（超过本招能续的上限）时不当作「急续控制」，只留一个小加成。
            else value += thundershockParalysisRemaining(context, target) > 140 ? 4 : 16;
            return value;
        }
    });

    addPreferences(thundershockId, {}, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动扎，先贴近；越大越愿意先追一段，但它射程很短，追太远多半是白跑。"
        }),
        field(pathOf("ai.followUp"), "追打已麻目标", "boolean", {
            help: "开启后，已经麻住的目标优先级抬高——这一刺对已麻目标更狠，麻痹快到时明显优先续；麻痹剩余很久、续不上时只按普通追打排序。关闭则只按普通近身攻击排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为扎到目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
