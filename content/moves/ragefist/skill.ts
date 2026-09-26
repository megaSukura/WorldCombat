/**
 * 愤怒之拳 / ragefist 的出手方式与拳印的积累。
 *
 * 核心念头：把挨过的每一记都记成拳印，出拳时一并打回去——**攒了几记，就多甩几记鬼拳**。
 *   拳印不是攻击等级，是拳数；它在缠斗里一直留着，所以正确用法是「先挨打攒拳，再找机会甩出去」。
 *
 * 三幕：
 *   起（windup，提交前）：拳上按拳印数聚起怒气光，只播预告。
 *   拳（punch × `fists`）：提交后贴身，按 `gap` 刻连甩 `fists` 记鬼拳；每一记独立结算 `smash`（接触·拳），
 *       命中者被轻轻顶开 `push`。拳数就是场上真正结算的次数。
 *   攒（随时，由世界事件驱动）：缠斗中每挨一记外来伤害就在身上加一记拳印（封顶 `cap`），并续上 `stance` 的存续；
 *       加印时拳上爆一簇怒气光。拳印散尽时放一簇余怒。
 *
 * 与同族分开：愤怒之拳记的是**挨打次数**、把挨打变成拳数；愤怒记的是挨打、把挨打转成攻击等级且熄于出手；
 *   连斩靠连续命中翻倍；扫墓记的是伙伴倒下。只有愤怒之拳把「被打」直接变成出拳数。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: ragefistId,
        cooldownParameter: "recharge",
        name: "Rage Fist",
        description: "把挨过的每一记都记成拳印，出手时一并打回去：每挨一记外来伤害就多一记拳印，每记拳印都变作一记鬼拳。缠斗里拳印一直留着，随时可以甩出这一串——先挨打，再还拳。",
        uses: ["先挨几记攒拳印，再找机会甩出一串鬼拳", "在近身缠斗里越打越多的拳数", "狂暴式用更短的冷却反复抢拳"],
        kind: "aim",
        range: 2.6,
        maxRange: 3.6,
        prepare: 4,
        active: 0,
        recover: 7,
        cooldown: 20,
        style: "contact",
        defaults: { fury: false, ai: { maxChase: 6, vengeful: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(ragefistId, "radius", pokemon) : 0.4) * 1.7, geometry: "line", style: "contact",
                color: 0xB23A4E, label: config && config.fury === true ? "愤怒之拳·狂暴" : "愤怒之拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[ragefistId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(ragefistId, "tempo", context)),
                recover: Math.round(p(ragefistId, "settle", context)),
                cooldown: Math.round(p(ragefistId, "recharge", context)),
                active: 0,
                range: p(ragefistId, "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const stored = world.valid(actor) ? ragefistStored(world, actor) : 0;
            action.present("ragefist:coil", ragefistScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", stored: stored, fists: 1 + stored * (config && config.fury === true ? 2 : 1),
                    plumes: Math.max(6, 8 + stored * 4), fury: config && config.fury === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            action.releaseTarget();
            const reach = p(ragefistId, "reach", action);
            const gap = Math.max(2, Math.round(p(ragefistId, "gap", action)));
            const power = p(ragefistId, "smash", action);
            const radius = p(ragefistId, "radius", action);
            const push = p(ragefistId, "push", action);
            const fists = Math.max(1, Math.round(p(ragefistId, "fists", action)));
            const plumes = Math.max(8, Math.round(p(ragefistId, "plumes", action)));
            const stored = ragefistStored(world, self);
            const intensity = Math.max(0.6, Math.min(2.6, power / 24));
            const scale = Math.max(0.7, Math.min(1.8, radius / 0.4));
            let thrown = 0, landed = 0, settled = false;

            // 普通主体第一次真正出手即取得资格：初始化 0 层拳印载体，之后的受击才从这里攒印。
            ragefistAuthorize(world, self);

            // 先靠步：目标在拳距外时用身体扫掠贴上去，撞到身体或墙即停，不追加超过总距。
            const body = world.observe(self);
            if (body !== null) {
                const victim = action.target();
                const vb = victim !== null && world.valid(victim) ? world.observe(victim) : null;
                if (vb !== null) {
                    const delta = vb.position().minus(body.position());
                    const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                    const advance = Math.min(reach * 0.6, Math.max(0, flat - reach * 0.9));
                    if (advance > 0.05 && flat > 0.001)
                        sweepStep(action, WorldCombat.point(delta.x() / flat, 0, delta.z() / flat).scale(advance), radius);
                }
            }

            sound(action, "cobblemon:move.bulletpunch.target");

            /** 每一拳都重新取准：活着的目标身体优先，其次瞄准点，最后退回动作方向。 */
            function heading(current: CombatAction, scope: CombatWorld): CombatPoint {
                const selected = current.target();
                const target = selected !== null && scope.valid(selected) ? scope.observe(selected) : null;
                const me = scope.observe(self);
                const from = me === null ? current.origin() : me.position();
                const point = target !== null ? target.position() : current.targetPosition();
                const delta = point.minus(from);
                return delta.length() < 0.05 ? current.direction() : delta.unit();
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const here = current.origin(), scope = current.world();
                if (landed === 0) {
                    WorldFeedback.emit(scope, ragefistScene, 1, here,
                        { moment: "miss", scale: scale, plumes: plumes, stored: stored }, 18);
                    WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.0, 0)), ragefistMissText, [], 20);
                } else {
                    WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.2, 0)), ragefistStrikeText, [landed, stored], 24);
                }
                done(current);
            }

            function punch(current: CombatAction, index: number): void {
                if (settled) return;
                const scope = current.world();
                const me = scope.observe(self);
                if (me === null) { finish(current); return; }
                const from = me.position(), forward = heading(current, scope);
                // 3D 短 trace 的首碰点：敌横移、墙后或高度不在拳路，这一拳就空挥，下一拳可重新瞄。
                const to = from.plus(forward.scale(reach + radius));
                const contact = current.trace(from, to, radius, true);
                const victim = contact.hitEntity() ? contact.target() : null;
                if (victim !== null && scope.valid(victim) && !scope.friendly(victim) && String(victim.ref()) !== String(self.ref())) {
                    const at = contact.position();
                    WorldFeedback.emit(scope, ragefistScene, 1, at,
                        { moment: "punch", target: String(victim.ref()), index: index + 1, fists: fists, stored: stored,
                            plumes: plumes, scale: scale, intensity: intensity,
                            direction: [forward.x(), forward.y(), forward.z()],
                            path: [[from.x(), from.y(), from.z()], [at.x(), at.y(), at.z()]] }, 16);
                    if (impact(current, contact, ragefistId, power, { damage: damageSpec(ragefistId, "smash"), contact: true, punch: true })) {
                        landed++;
                        if (scope.valid(victim)) {
                            const away = at.minus(from);
                            if (away.length() > 0.01) scope.hitDisplace(victim, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                        }
                    } else {
                        WorldFeedback.emit(scope, ragefistScene, 1, at,
                            { moment: "blocked", target: String(victim.ref()), scale: scale, index: index + 1 }, 14);
                    }
                } else {
                    const where = contact.blocked() || contact.hitEntity() ? contact.position() : to;
                    WorldFeedback.emit(scope, ragefistScene, 1, where,
                        { moment: "whiff", index: index + 1, fists: fists, plumes: Math.max(4, Math.round(plumes * 0.4)),
                            scale: scale, blocked: contact.blocked() ? 1 : 0 }, 12);
                }
                thrown++;
                if (thrown >= fists) { finish(current); return; }
                current.after(gap, function (next: CombatAction) { punch(next, index + 1); });
            }
            punch(action, 0);
        }
    });

    // 只有真正拥有/被授权本招的战斗者才攒拳：只认真实攻击（原生攻击或有伤害的 move），
    // 环境伤害、自身反噬、残伤与纯状态 DOT 都不算；打死这一下不再强建残留拳印。
    WorldCombat.on("world_combat:move_ragefist/mark", "world_combat:damage_applied", "", function (event) {
        const victim = event.target(), source = event.actor();
        if (victim === null || source === null) return;
        if (String(source.key()) === String(victim.key())) return;
        const world = event.world();
        if (!world.valid(victim) || world.allied(source, victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        const facts = DamageSemantics.read(data);
        if (!facts.attack && String(data.kind) !== "move") return;
        if (typeof data.after === "number" && data.after <= 0) return;
        if (!ragefistQualified(world, victim)) return;
        const held = MobEffects.read(world, victim, ragefistCharge);
        const cap = ragefistCap(ragefistConfig(world, victim));
        const before = held === null ? 0 : held.amplifier();
        const next = Math.min(cap, before + 1);
        // 到顶也重挂一次，让存续跟着最近一次受击续期；只有真的加了一记才播加印。
        MobEffects.apply(world, victim, ragefistCharge, ragefistStance(world, victim), next);
        if (next <= before) return;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, ragefistScene, 1, body.position(),
            { moment: "stack", target: String(victim.ref()), stored: next, cap: cap, plumes: Math.round(8 + next * 4) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), ragefistStackText, [next, cap], 22);
        world.sound("minecraft:entity.hoglin.angry", body.position(), 12, "{}");
    });

    // 还攒着拳印时，每 12 刻冒一次低密度怒气光，让玩家看出「拳印还在」；宝可梦与普通授权主体同样可见。
    WorldCombat.on("world_combat:move_ragefist/aura", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== ragefistCharge || event.world().tick() % 12 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const effect = MobEffects.read(world, actor, ragefistCharge);
        const body = world.observe(actor);
        if (effect === null || body === null) return;
        WorldFeedback.keep(world, "ragefist:aura:" + String(actor.ref()), ragefistScene, 1, body.position(),
            { moment: "aura", target: String(actor.ref()), stored: effect.amplifier(),
                plumes: Math.round(6 + effect.amplifier() * 4) }, 14);
    });

    // 拳印散尽：放一簇余怒，忘记这一串。
    WorldCombat.on("world_combat:move_ragefist/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== ragefistCharge) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, ragefistScene, 1, body.position(),
            { moment: "fade", target: String(actor.ref()), stored: data.amplifier === undefined ? 0 : data.amplifier }, 22);
    });
}
