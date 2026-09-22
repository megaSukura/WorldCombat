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
        id: ragefistId,
        name: "Rage Fist",
        description: "把挨过的每一记都记成拳印，出手时一并打回去：每挨一记外来伤害就多一记拳印，每记拳印都变作一记鬼拳。缠斗里拳印一直留着，随时可以甩出这一串。",
        uses: ["先挨几记攒拳印，再找机会甩出一串鬼拳", "在近身缠斗里越打越多的拳数", "狂暴式用更短的冷却反复抢拳"],
        kind: "enemy",
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
            const direction = aim(action);
            let thrown = 0, landed = 0, settled = false;

            // 贴上去一小步：目标在射程外时先贴近，避免整串拳全空。
            const body = world.observe(self);
            if (body !== null) {
                const victim = action.target();
                const vb = victim !== null && world.valid(victim) ? world.observe(victim) : null;
                if (vb !== null) {
                    const delta = vb.position().minus(body.position());
                    const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                    const advance = Math.min(reach * 0.6, Math.max(0, flat - radius - 0.3));
                    if (advance > 0.05) world.displace(self, direction.scale(advance));
                }
            }

            sound(action, "cobblemon:move.bulletpunch.target");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const here = current.origin();
                const scope = current.world();
                if (landed === 0) {
                    WorldFeedback.emit(scope, ragefistScene, 1, here.plus(direction.scale(reach * 0.5)),
                        { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.0, 0)), ragefistMissText, [], 20);
                } else {
                    WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.2, 0)), ragefistStrikeText, [landed, stored], 24);
                }
                done(current);
            }

            function punch(current: CombatAction, index: number): void {
                const scope = current.world();
                const victim = current.target();
                // 每一记独立结算：目标还在拳面内（正前方 reach + 半步）就吃一拳，被顶开半步也追得上。
                if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                    const vb = scope.observe(victim);
                    if (vb !== null) {
                        const delta = vb.position().minus(current.origin());
                        const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                        if (flat <= reach + 0.6) {
                            const struck = hurt(current, victim, ragefistId, power,
                                { damage: damageSpec(ragefistId, "smash"), contact: true, punch: true });
                            if (struck) {
                                landed++;
                                if (scope.valid(victim) && push > 0) scope.displace(victim, direction.scale(push));
                                WorldFeedback.emit(scope, ragefistScene, 1, vb.position(),
                                    { moment: "punch", target: String(victim.ref()), index: index + 1, fists: fists,
                                        stored: stored, plumes: plumes, scale: scale, intensity: intensity }, 16);
                            }
                        }
                    }
                }
                thrown++;
                if (thrown >= fists) { finish(current); return; }
                current.after(gap, function (next: CombatAction) { punch(next, index + 1); });
            }
            punch(action, 0);
        }
    });

    // 攒拳：带着拳印（或任何战斗者）挨了一记外来伤害，就加一记并续上存续。
    WorldCombat.on("world_combat:move_ragefist/mark", "world_combat:damage_applied", "", function (event) {
        const victim = event.target(), source = event.actor();
        if (victim === null || source === null) return;
        if (String(source.key()) === String(victim.key())) return;
        const world = event.world();
        if (!world.valid(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0) || String(data.category) === "Status") return;
        const cap = ragefistCap(ragefistConfig(world, victim));
        const held = MobEffects.read(world, victim, ragefistCharge);
        const before = held === null ? 0 : held.amplifier();
        const next = Math.min(cap, before + 1);
        MobEffects.apply(world, victim, ragefistCharge, ragefistStance(world, victim), next);
        if (next <= before) return;
        // 拳印是所有战斗者共有的身份，但只有宝可梦会用它：表现只给宝可梦，避免全场挨打都刷字与光。
        if (String(victim.domain()) !== "cobblemon") return;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, ragefistScene, 1, body.position(),
            { moment: "stack", target: String(victim.ref()), stored: next, cap: cap, plumes: Math.round(8 + next * 4) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), ragefistStackText, [next, cap], 22);
        world.sound("minecraft:entity.hoglin.angry", body.position(), 12, "{}");
    });

    // 还攒着拳印时，每 12 刻冒一次低密度怒气光，让玩家看出「拳印还在」。
    WorldCombat.on("world_combat:move_ragefist/aura", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== ragefistCharge || event.world().tick() % 12 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return;
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
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, ragefistScene, 1, body.position(),
            { moment: "fade", target: String(actor.ref()), stored: data.amplifier === undefined ? 0 : data.amplifier }, 22);
    });
}
