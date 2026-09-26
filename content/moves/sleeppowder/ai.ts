/**
 * 催眠粉 的伙伴 AI 用途：这招自己的一套出手计划——把云丢在人群落点上。
 *
 * 什么局面有意义：挂在共享的 control 位上。对可见、敌对、还活着、还没睡、在 ai.maxChase 以内、与施法者
 *   通视的目标抛粉；草属性直接穿过粉末，跳过。它最爱目标身边先站着一小撮人的时候——一片云一次放倒几个，
 *   适合布在狭道口或慢敌群的前路。
 * 对谁出手：当前威胁；按真实速度与落粉时间比较当前位置、有限前路，以实际云半径估计慢敌群收益。
 * 够不到怎么办：由共享任务走到 reach；accepts 不按距离硬拒，会先靠近再抛。
 * 放完之后：落点留下的一片云会持续把站在里面的人喂睡，伙伴交回共享顺序——可以绕到云后面等它生效，或把别的敌人往云里逼。
 * 优先级：基础 48；预计在实际云范围内停留的非友方（友方、已睡与草免疫不计）提高收益，逃跑中的威胁再 +12。
 */
namespace PokemonSkills {
    /** 草属性穿过粉末：它不值得为它撒粉。 */
    function sleeppowderImmune(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const facts = CompanionBehavior.pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("grass") >= 0;
    }

    /** 前路最多挪动四分之三片云，避免把快速变向者当作远处的必达落点。 */
    function sleeppowderLanding(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): { point: number[]; score: number; led: boolean } {
        const key = "sleeppowder:landing:" + item.id + ":" + target.ref;
        if (context.scratch[key]) return context.scratch[key];
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const facts: FactContext = { world: world, actor: world.source(), detail: { values: item.data.config } };
        const radius = Math.max(1.4, p(sleeppowderId, "cloudRadius", facts));
        const interval = Math.max(8, p(sleeppowderId, "doseInterval", facts));
        const flight = CompanionBehavior.distance(self.point, target.point) / Math.max(0.6, p(sleeppowderId, "puffSpeed", facts));
        const horizon = Math.max(0, p(sleeppowderId, "tempo", facts)) + flight + interval * 0.5;
        const from = CompanionBehavior.point(self.point), at = CompanionBehavior.point(target.point);
        const velocity = CompanionBehavior.velocity(context, target) || [0, 0, 0];
        const motion = WorldCombat.point(velocity[0], 0, velocity[2]), speed = motion.length();
        const advance = speed > 0.005 && target.grounded !== false ? Math.min(radius * 0.75, speed * horizon) : 0;
        const ahead = advance > 0 ? at.plus(motion.scale(advance / speed)) : at;
        const candidates = [at];
        const passage = advance > 0 ? world.clipBlocks(at, ahead) : null;
        const cast = advance > 0 ? world.clipBlocks(from, ahead) : null;
        if (advance > 0 && ahead.minus(from).length() <= item.data.range && passage !== null && !passage.blocked() && cast !== null && !cast.blocked())
            candidates.push(ahead);
        const nearby = [target].concat((context.facts.nearby || []) as CompanionBehavior.Entity[]), seen: { [ref: string]: boolean } = {};
        const worthwhile: { point: CombatPoint; speed: number }[] = [];
        nearby.forEach(function (other) {
            if (seen[other.ref]) return; seen[other.ref] = true;
            if (other.friendly || other.health <= 0 || !other.visible || CompanionBehavior.status(context, other, "sleep") || sleeppowderImmune(context, other)) return;
            const v = CompanionBehavior.velocity(context, other) || [0, 0, 0], moving = WorldCombat.point(v[0], 0, v[2]);
            const pace = moving.length(), offset = pace > 0 ? moving.scale(Math.min(radius * 0.75, pace * horizon) / pace) : moving;
            worthwhile.push({ point: CompanionBehavior.point(other.point).plus(offset), speed: pace });
        });
        let best = at, score = -1, led = false;
        candidates.forEach(function (candidate, index) {
            let value = 0;
            worthwhile.forEach(function (other) {
                const gap = other.point.minus(candidate).length();
                if (gap > radius) return;
                // 停留时间越能覆盖一口粉的间隔，越适合预先铺云；范围仍取正式云半径。
                value += (1 + Math.max(0, 1 - other.speed * interval / radius)) * (1 - gap / (radius * 2));
            });
            if (value > score + 0.001 || index > 0 && Math.abs(value - score) <= 0.001) { best = candidate; score = value; led = index > 0; }
        });
        return context.scratch[key] = { point: [best.x(), best.y(), best.z()], score: score, led: led };
    }

    function sleeppowderWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "sleep")) return false;
        if (sleeppowderImmune(context, target)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 9)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse(sleeppowderId, {
        protocols: ["world_combat:control"],
        target: function (context, item, target) {
            const landing = sleeppowderLanding(context, item, target);
            if (!landing.led) return target;
            const point = JSON.parse(JSON.stringify(target)); point.ref = ""; point.point = landing.point; return point;
        },
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) { return target === null ? true : sleeppowderWants(context, item, target); },
        accepts: function (context, item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !sleeppowderWants(context, item, target)) return 0;
            const cluster = sleeppowderLanding(context, item, target).score;
            const flee = CompanionBehavior.fleeing(context, target) ? 12 : 0;
            return Math.min(82, 48 + cluster * 7) + flee;
        }
    });

    addPreferences(sleeppowderId, { ai: { maxChase: 9, leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "撒粉距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动撒粉，先走近；越大越愿意远远地先丢一片云。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为撒粉离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
