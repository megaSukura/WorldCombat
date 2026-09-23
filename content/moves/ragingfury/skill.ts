/**
 * 大愤慨 / ragingfury 的出手方式。
 *
 * 核心念头：一段一段地朝前喷火猛冲，沿途烧穿一条火线，冲过的落点留下一片继续燃烧的余烬；
 *   谁还站在火场里，就继续被点着。它的身份是「留下会伤人的火」——火线是伤害，落点火场是余韵。
 *
 * 三幕（run 自管节奏，提交前只观察与预告）：
 *   起（提交前）：压低身体、喉头聚起火，只播预告。
 *   冲（提交后）：`strikes` 段。每一段先垫进 `lunge` 格，再沿朝向扫出一条 `reach` 长、`radius` 半宽的火线，
 *       火线里的敌人各吃一记 `blaze` 火焰伤害、被点着 `igniteTicks`、被朝外推 `push` 格；落点留下一片
 *       `emberRadius` 的火场（共享 field 规则 world_combat:ragingfury/ember，站在里面的人持续被点燃）
 *       持续 `emberTicks`。两段之间隔 `gap` 刻。
 *   晕（结束）：冲完给自己挂共享身份 world_combat:status/confusion（载体本单元自己的 effect），
 *       恍惚期间每次想出手都可能被打散，还被火星反噬掉一点血——这是玩火不止的代价。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害、状态（着火）、位移、场地都走同一条路。
 */
namespace PokemonSkills {
    /** 火线扫过的走廊四角：origin 起、朝 direction 长 length、半宽 half；判定与表现共用。 */
    function ragingfuryLane(origin: CombatPoint, direction: CombatPoint, length: number, half: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(length));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    function ragingfuryAim(from: CombatPoint, to: CombatPoint): CombatPoint | null {
        const delta = WorldCombat.point(to.x() - from.x(), 0, to.z() - from.z());
        return delta.length() < 1e-4 ? null : delta.unit();
    }

    function ragingfuryFoe(world: CombatWorld, actor: CombatActor): CombatActor | null {
        const self = world.observe(actor);
        if (self === null) return null;
        const near = world.query(self.position(), 16, false);
        let best: CombatActor | null = null, bestDistance = 1e9;
        for (let i = 0; i < near.length; i++) {
            const other = near[i];
            if (world.friendly(other)) continue;
            const facts = world.observe(other);
            if (facts === null || !facts.visible() || facts.health() <= 0) continue;
            const distance = facts.position().minus(self.position()).length();
            if (distance < bestDistance) { bestDistance = distance; best = other; }
        }
        return best;
    }

    // 余烬火场：站在里面的非友方每 5 刻被重新点着一次；火由本招的 field 携带，不破坏方块。
    WorldEffects.fieldRule(ragingfuryField, {
        scan: function (effect, world, field) {
            WorldFeedback.keep(world, ragingfuryId + ":ember:" + effect.id(), ragingfuryScene, 1,
                WorldCombat.point(field.position[0], field.position[1], field.position[2]),
                { moment: "smolder", scale: field.radius / 2.2 }, Math.max(1, Math.min(6, effect.remaining())));
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field) {
            if (world.friendly(actor)) return;
            const data: any = field.data || {};
            const ticks = typeof data.ignite === "number" && isFinite(data.ignite) ? Math.max(20, Math.round(data.ignite)) : 40;
            world.ignite(actor, ticks);
        }
    });

    interface FuryState { complete: (action: CombatAction) => void; left: number; strikes: number; index: number; }

    function ragingfurySpent(current: CombatAction, state: FuryState): void {
        const world = current.world(), actor = current.actor(), body = world.observe(actor);
        const ticks = Math.max(80, Math.round(p(ragingfuryId, "dazeTicks", current)));
        const fumble = Math.round(Math.max(0.05, Math.min(0.9, p(ragingfuryId, "fumble", current))) * 100);
        if (body !== null) {
            CombatStatus.apply(world, actor, "confusion", ragingfuryDaze, ticks, fumble, { unique: true });
            WorldFeedback.emit(world, ragingfuryScene, 1, body.position(),
                { moment: "spent", target: String(actor.ref()), strikes: state.strikes, fumble: fumble, ticks: ticks, intensity: 1 }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), ragingfuryDazeText, [], 30);
            world.sound("cobblemon:status.volatile.confusion.actor", body.position(), 16, "{}");
        }
        state.complete(current);
    }

    function ragingfuryStrike(current: CombatAction, state: FuryState): void {
        const world = current.world(), actor = current.actor();
        const self = world.observe(actor);
        if (self === null) { current.finish(); return; }
        const reach = Math.max(2.0, p(ragingfuryId, "reach", current));
        const lunge = Math.max(0, p(ragingfuryId, "lunge", current));
        const radius = Math.max(0.5, Math.min(1.15, p(ragingfuryId, "radius", current)));
        const push = Math.max(0, p(ragingfuryId, "push", current));
        const emberRadius = Math.max(0, p(ragingfuryId, "emberRadius", current));
        const emberTicks = Math.max(20, Math.round(p(ragingfuryId, "emberTicks", current)));
        const igniteTicks = Math.max(20, Math.round(p(ragingfuryId, "igniteTicks", current)));
        const sparks = Math.max(8, Math.round(p(ragingfuryId, "sparks", current)));
        const power = p(ragingfuryId, "blaze", current);
        const intensity = Math.max(0.6, Math.min(2.6, power / 30 + state.index * 0.1));
        const scale = Math.max(0.7, Math.min(2.2, radius / 0.7));

        const victim = ragingfuryFoe(world, actor);
        const victimBody = victim !== null ? world.observe(victim) : null;
        let direction = victimBody !== null ? ragingfuryAim(self.position(), victimBody.position()) : null;
        if (direction === null) direction = ragingfuryAim(self.position(), self.position().plus(current.direction()));
        if (direction === null) direction = WorldCombat.point(0, 0, 1);
        if (victimBody !== null) current.face(victimBody.position(), 24, 24);

        const forward = Math.min(lunge, victimBody !== null ? Math.max(0, self.position().minus(victimBody.position()).length() - radius - 0.3) : lunge);
        if (forward > 0.05) world.displace(actor, direction.scale(forward));
        const moved = world.observe(actor);
        const origin = moved !== null ? moved.position() : self.position();
        const path = ragingfuryLane(origin, direction, reach, radius);

        WorldFeedback.keep(world, ragingfuryId + ":wake:" + String(actor.ref()), ragingfuryScene, 1, origin,
            { moment: "charge", target: String(actor.ref()), index: state.index, left: state.left, strikes: state.strikes,
                path: path, direction: [direction.x(), direction.y(), direction.z()], sparks: sparks, scale: scale, intensity: intensity }, 8);
        WorldFeedback.emit(world, ragingfuryScene, 1, origin,
            { moment: "charge", target: String(actor.ref()), index: state.index, left: state.left, strikes: state.strikes,
                path: path, direction: [direction.x(), direction.y(), direction.z()], sparks: sparks, scale: scale, intensity: intensity }, 20);
        sound(current, "cobblemon:move.flamewheel.actor");
        sound(current, "minecraft:item.firecharge.use");

        let hits = 0;
        WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, direction, reach, radius, { below: 1.6, above: 2.4 }),
            function (target, facts) {
                if (!hurt(current, target, ragingfuryId, power, { damage: damageSpec(ragingfuryId, "blaze") })) return;
                hits++;
                if (world.valid(target)) world.ignite(target, igniteTicks);
                const away = WorldCombat.point(facts.position().x() - origin.x(), 0, facts.position().z() - origin.z());
                if (world.valid(target) && away.length() > 0.05 && push > 0) world.displace(target, away.unit().scale(push));
                WorldFeedback.emit(world, ragingfuryScene, 1, facts.position(),
                    { moment: "scorch", target: String(target.ref()), sparks: Math.round(sparks * 0.6), scale: scale, intensity: intensity }, 22);
            });

        if (hits > 0) WorldFeedback.text(world, origin.plus(direction.scale(reach * 0.5)).plus(WorldCombat.point(0, 1.2, 0)),
            ragingfuryChargeText, [Math.round(power)], 24);
        sound(current, "cobblemon:impact.fire");

        // 落点余烬：一片会持续点燃的火场。
        if (emberRadius > 0.5) {
            const emberPoint = origin.plus(direction.scale(reach * 0.55));
            WorldEffects.field(world, ragingfuryField, emberPoint, emberRadius, { ignite: igniteTicks }, emberTicks);
            WorldFeedback.emit(world, ragingfuryScene, 1, emberPoint,
                { moment: "ember", target: String(actor.ref()), scale: Math.max(0.6, Math.min(2.4, emberRadius / 2.2)),
                    intensity: Math.max(0.6, Math.min(2.0, power / 40)) }, 40);
            WorldFeedback.text(world, emberPoint.plus(WorldCombat.point(0, 0.9, 0)), ragingfuryEmberText, [], 26);
        }

        state.left = state.left - 1;
        state.index = state.index + 1;
        if (state.left > 0) {
            const pause = Math.max(6, Math.round(p(ragingfuryId, "gap", current)));
            current.after(pause, function (next: CombatAction) { ragingfuryStrike(next, state); });
        } else {
            ragingfurySpent(current, state);
        }
    }

    define({
        freeMovement: true,
        id: ragingfuryId,
        cooldownParameter: "recharge",
        name: "Raging Fury",
        description: "一段一段朝前喷火猛冲：火线里的敌人被烧中、点着并被推开，冲过的落点留下一片会持续点燃的余烬；冲完自己陷入恍惚，出手可能被打散。",
        uses: ["一路喷火扫过一条线上的敌人并点着它们", "在要道落下一片持续燃烧的火场", "把贴身的对手烧开并迫使其离开原地"],
        kind: "enemy",
        range: 4.4,
        maxRange: 6.2,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 44,
        maximumTicks: 260,
        style: "inferno",
        interruptible: false,
        defaults: { inferno: false, ai: { maxChase: 9, finishLow: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(ragingfuryId, "reach", pokemon), geometry: "line", style: "inferno", color: 0xE2531B,
                label: config && config.inferno === true ? "大愤慨·烈焰" : "大愤慨" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[ragingfuryId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(ragingfuryId, "tempo", context)),
                recover: Math.round(p(ragingfuryId, "recover", context)),
                cooldown: Math.round(p(ragingfuryId, "recharge", context)),
                active: 0,
                range: p(ragingfuryId, "reach", context)
            };
        },
        run: function (action, move, config) {
            const inferno = !!(config && config.inferno);
            const prepare = Math.max(3, Math.round(p(ragingfuryId, "tempo", action)));
            action.present(ragingfuryId + ":windup", ragingfuryScene, 1, action.origin(),
                JSON.stringify({ moment: "tempo", inferno: inferno ? 1 : 0 }));
            LivingActions.run(action, {
                prepare: prepare, recover: Math.max(0, Math.round(p(ragingfuryId, "recover", action))),
                cooldown: Math.max(1, Math.round(p(ragingfuryId, "recharge", action))),
                stationary: true, turn: 15, interruptible: false
            }, function (current, complete) {
                const strikes = Math.max(2, Math.min(3, Math.round(p(ragingfuryId, "strikes", current))));
                const state: FuryState = { complete: complete, left: strikes, strikes: strikes, index: 0 };
                sound(current, "minecraft:entity.blaze.burn");
                ragingfuryStrike(current, state);
            });
        }
    });

    // 失手反应：共享门禁掷中后出手作废；火星反噬、恍惚续上（本单元的失败反应）。
    WorldCombat.on(ragingfuryId + ":fumble", "world_combat:action_rejected", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.reason) !== "confused" && String(data.details && data.details.status) !== "confusion") return;
        const world = event.world(), actor = event.actor();
        // The rejection details name the exact carrier that rolled the fumble, so a stack of confusion sources
        // cannot make one rejection fire several units' punishments.
        const carrier = data.details && data.details.effect !== undefined ? String(data.details.effect) : "";
        if (carrier && carrier !== ragingfuryDaze) return;
        const effect = CombatStatus.representative(world, actor, "confusion");
        if (effect === null || String(effect.id()) !== ragingfuryDaze) return;
        const body = world.observe(actor);
        if (body !== null) {
            let attack = 0;
            try { attack = PokemonDamage.combatants.read(world, actor).stats.atk || 0; } catch (error) { attack = 0; }
            const fraction = Math.max(0.012, Math.min(0.05, 0.010 + attack * 0.00012));
            const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
            if (loss > 0) {
                const remaining = Math.max(0, effect.duration());
                CombatStatus.apply(world, actor, "confusion", ragingfuryDaze, Math.max(60, remaining), effect.amplifier(), { unique: true });
                WorldFeedback.emit(world, ragingfuryScene, 1, body.position(), { moment: "punish", target: String(actor.ref()) }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), ragingfuryChipText, [Math.round(loss * 10) / 10], 24);
                world.sound("minecraft:entity.player.hurt", body.position(), 12, "{}");
            }
        }
    });

    // 恍惚存续期：低密度的眩晕气流每 20 刻续期，让出本体视线。
    WorldCombat.on(ragingfuryId + ":linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== ragingfuryDaze) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, ragingfuryId + ":dizzy:" + String(actor.ref()), ragingfuryScene, 1, body.position(),
            { moment: "dizzy", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });
}
