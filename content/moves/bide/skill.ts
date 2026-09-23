/**
 * 忍耐 / bide —— 执行组织。
 *
 * 核心念头：把这段时间挨的打攒成一口闷气，站定不动，时间一到连本带利地吐回给最后打你的人。
 *
 * 三慕：
 *   起（windup，提交前）：收住架势、把力往身上聚，只播预告。
 *   忍（execute，提交后）：挂上共享身份 world_combat:status/bide 的架势载体，站定 window 刻；
 *       这段时间里每一次外来伤害都记进账本（parameters.ts 的记账监听），并按上限截断；
 *       扎根取向下用世界已有的定身表达锁住脚步；画面按账本比例逐渐变亮。
 *   还（release，时间到自动）：账上有多重就按 payback 加倍还给最后打你的人（够不到找最近的敌人），
 *       没有账则落空；被外力打断（world_combat:interrupt）则架势崩解，这一口白忍。
 * 反制：忍耐期间站定不动、不能出手，对手可以选择先拉开、找掩体、或干脆不碰你；打扰断一样前功尽弃。
 */
namespace PokemonSkills {
    function bideAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.4, 0)); }

    /** 还手够不到账主时的备选：忍耐者周围最近的敌人。 */
    function bideNearest(world: CombatWorld, centre: CombatPoint, reach: number, self: CombatActor): CombatActor | null {
        var found = world.query(centre, reach, false), best: CombatActor | null = null, bestGap = reach + 1;
        for (var i = 0; i < found.length; i++) {
            var other = found[i];
            if (String(other.key()) === String(self.key()) || world.friendly(other)) continue;
            var body = world.observe(other);
            if (body === null) continue;
            var gap = centre.minus(body.position()).length();
            if (gap < bestGap) { bestGap = gap; best = other; }
        }
        return best;
    }

    define({
        freeMovement: function (config) { return !!config.rooted; },
        id: bideId,
        cooldownParameter: "recharge",
        name: "Bide",
        description: "进入忍耐架势，期间受到的每一次外来伤害都记进账本；时间到把账上伤害按 1.4–2.8 倍还给最后打你的人，够不到就找最近的敌人；没挨到打或被打断就白忍一场。",
        uses: ["在被打的一轮里攒一记大还手", "逼对手在你站定时决定要不要继续打", "把分散的小伤害聚成一记重击"],
        kind: "self",
        range: 0,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 120,
        style: "bide",
        maximumTicks: 480,
        defaults: { rooted: true, ai: { minHealth: 0.5 } },
        fields: [flag("rooted", "扎根硬忍")],
        indicator: function (config) {
            return { radius: 1, style: "bide", color: 0xE06A3C, label: config && config.rooted === true ? "忍耐·扎根" : "忍耐·且战" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[bideId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: p(bideId, "tempo", context), recover: p(bideId, "settle", context),
                cooldown: p(bideId, "recharge", context), active: 0, range: 0 };
        },
        windup: function (action, config, prepare) {
            action.present("bide:windup", bideScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", rooted: config && config.rooted === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const rooted = !!(config && config.rooted);
            const window = Math.max(30, Math.round(p(bideId, "window", action)));
            const cap = Math.max(1, body.maxHealth() * p(bideId, "capFraction", action));
            bideBegin(world, self, cap, window);
            MobEffects.apply(world, self, bideBraceEffect, window);
            if (rooted) world.effect("world_combat:rooted", self, "{}", window);
            sound(action, "minecraft:entity.iron_golem.damage");
            WorldFeedback.emit(world, bideScene, 1, body.position(),
                { moment: "brace", target: String(self.ref()), cap: cap, window: window }, 20);
            WorldFeedback.text(world, bideAbove(body.position()), bideBraceText, [Math.round(window / 20)], 26);

            let released = false;

            function steady(current: CombatAction): void {
                if (released) return;
                const scope = current.world();
                if (!scope.valid(self)) return;
                const at = scope.observe(self);
                if (at === null) return;
                const record = bideRead(scope, self);
                WorldFeedback.keep(scope, "bide:brace:" + String(self.ref()), bideScene, 1, at.position(),
                    { moment: "brace", target: String(self.ref()), charge: record === null ? 0 : record.amount, cap: cap,
                        intensity: record === null ? 0.12 : Math.max(0.12, Math.min(1, record.amount / Math.max(1, cap))) }, 22);
                current.after(10, steady);
            }

            function release(current: CombatAction): void {
                if (released) return;
                released = true;
                const scope = current.world();
                const record = bideRead(scope, self);
                const charge = record === null ? 0 : record.amount;
                // 先按账本求出这一次真正使用的还手伤害，再结账清除。
                const amount = charge > 0 ? Math.round(p(bideId, "payback", current)) : 0;
                const lastSource = record === null ? "" : record.source;
                bideEnd(self);
                MobEffects.consume(scope, self, bideBraceEffect);
                const at = scope.observe(self);
                if (at === null) { done(current); return; }
                if (!(amount > 0)) {
                    sound(current, "minecraft:entity.player.attack.sweep");
                    WorldFeedback.emit(scope, bideScene, 1, at.position(), { moment: "whiff", target: String(self.ref()) }, 22);
                    WorldFeedback.text(scope, bideAbove(at.position()), bideWhiffText, [], 24);
                    done(current);
                    return;
                }
                const reach = p(bideId, "releaseReach", current);
                let target: CombatActor | null = lastSource === "" ? null : scope.actor(lastSource);
                if (target !== null) {
                    const targetBody = scope.observe(target);
                    if (!scope.valid(target) || targetBody === null || scope.friendly(target)
                        || at.position().minus(targetBody.position()).length() > reach) target = null;
                }
                if (target === null) target = bideNearest(scope, at.position(), reach, self);
                WorldFeedback.emit(scope, bideScene, 1, at.position(),
                    { moment: "release", target: target === null ? "" : String(target.ref()), charge: charge, amount: amount,
                        reach: reach, motes: Math.max(20, Math.round(amount * 1.5)),
                        intensity: Math.max(0.4, Math.min(2.4, amount / Math.max(1, at.maxHealth()))) }, 30);
                sound(current, "minecraft:entity.generic.explode");
                if (target === null) {
                    WorldFeedback.text(scope, bideAbove(at.position()), bideWhiffText, [], 24);
                    done(current);
                    return;
                }
                bideRawHit(current, target, amount, false);
                const struck = scope.observe(target);
                const point = struck === null ? at.position() : struck.position();
                WorldFeedback.emit(scope, bideScene, 1, point,
                    { moment: "strike", target: String(target.ref()), amount: amount, motes: Math.max(14, Math.round(amount * 1.5)) }, 26);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), bideReleaseText, [Math.round(amount)], 28);
                if (scope.valid(target)) scope.sound("cobblemon:impact.fighting", point, 15, "{}");
                done(current);
            }

            steady(action);
            action.after(window, release);
            action.on("world_combat:interrupt", function (current: CombatAction) {
                if (released) return;
                released = true;
                bideEnd(self);
                try {
                    const scope = current.world();
                    MobEffects.consume(scope, self, bideBraceEffect);
                    const at = scope.observe(self);
                    if (at !== null) {
                        WorldFeedback.emit(scope, bideScene, 1, at.position(), { moment: "broken", target: String(self.ref()) }, 22);
                        WorldFeedback.text(scope, bideAbove(at.position()), bideBrokenText, [], 24);
                    }
                } catch (error) { /* the cancelled action already released its world handle */ }
            });
        }
    });
}
