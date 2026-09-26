/**
 * 大愤慨 / ragingfury 的出手方式。
 *
 * 核心念头：连续三口收不住的猛烈火舌，每一口从嘴端向前猛推进到 `reach`，拍间转头换一条火路；
 *   火舌是狭长的真实 3D 宽束，墙把它截断，沿途的多个敌人都被烧中；它只在实际接触过的地面留下细短的余火。
 *   与逆鳞（本人撞单敌）不同，本体只原 `lunge` 垫一步，不假装冲满整条火线。
 *
 * 出手（`kind: "aim"`）：每段读当刻自由 aim，可空喷；提交后按住技能键可在段间重新瞄向，段内方向固定。
 *
 * 三幕（execute 自管节奏）：
 *   起（windup，提交前）：压低身体、喉头聚起火，只播预告。
 *   喷（execute，提交后）：`strikes` 段。每段先按当刻 aim 读方向、身体只垫进 `lunge` 一步，再从真实嘴端沿该方向
 *       推进到 `reach`，用 `clipBlocks` 裁到第一面墙；火束里的每个非友方各吃一次 `blaze`、被点着 `igniteTicks`、
 *       朝外推 `push` 格（段内每敌一次，可烧到多个）。火束实际触到的可支撑地面按 `emberRadius` 留下余火
 *       （共享 field 规则 world_combat:ragingfury/ember，持续 `emberTicks`，与同源的余火合并而不叠加）。两段之间隔 `gap` 刻。
 *   晕（结束）：喷完给自己挂共享身份 world_combat:status/confusion（载体本单元自己的 effect，时长按首次写入的
 *       `dazeTicks`，反噬不再续时）。
 *
 * 与同族分开：逆鳞撞单体、大闹一番贴身扇扫、花瓣舞移动花裙；大愤慨是分段火舌＋真实触地余火。
 */
namespace PokemonSkills {
    // 余烬火场：站在里面的非友方每 5 刻被重新点着一次；火由本招的 field 携带，不破坏方块。
    WorldEffects.fieldRule(ragingfuryField, {
        scan: function (effect, world, field) {
            WorldFeedback.keep(world, ragingfuryId + ":ember:" + effect.id(), ragingfuryScene, 1,
                WorldCombat.point(field.position[0], field.position[1], field.position[2]),
                { moment: "smolder", radius: field.radius, scale: field.radius / 2.2 }, Math.max(1, Math.min(6, effect.remaining())));
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field) {
            if (world.friendly(actor)) return;
            const data: any = field.data || {};
            const ticks = typeof data.ignite === "number" && isFinite(data.ignite) ? Math.max(20, Math.round(data.ignite)) : 40;
            world.ignite(actor, ticks);
        }
    });

    function ragingfuryInput(action: CombatAction): CombatPoint | null {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3) {
                const delta = WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]).minus(action.origin());
                if (delta.length() >= 0.05) return delta.unit();
            }
        } catch (error) { }
        try {
            const fallback = action.targetPosition().minus(action.origin());
            if (fallback.length() >= 0.05) return fallback.unit();
        } catch (error) { }
        const direction = action.direction();
        return direction.length() < 1e-6 ? null : direction.unit();
    }

    /** 与判定同源的火焰束顶点：嘴端起、朝 direction 到真实裁剪后的终点，左右各 `half`。 */
    function ragingfuryBeam(mouth: CombatPoint, direction: CombatPoint, end: CombatPoint, half: number): number[][] {
        const heading = WorldGeometry.flatUnit(direction);
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        return [mouth.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half)), mouth.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    /** 在真实触地路径上留下余火：同源且重叠的余火只延长时长、不叠加，返回是否真的留了火。 */
    function ragingfuryEmber(world: CombatWorld, point: CombatPoint, radius: number, ignite: number, ticks: number): boolean {
        if (!(radius > 0.5)) return false;
        const owner = String(world.source().ref());
        const existing = WorldEffects.areas(world, ragingfuryField, point, radius);
        let merged = false;
        for (let i = 0; i < existing.length; i++) {
            const area = existing[i];
            if (String(area.source) !== owner) continue;
            const dx = area.position[0] - point.x(), dz = area.position[2] - point.z();
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            WorldEffects.update(world, area.id!, { ticks: Math.max(area.remaining || 0, ticks), data: { ignite: ignite } });
            merged = true;
        }
        if (merged) return true;
        WorldEffects.field(world, ragingfuryField, point, radius, { ignite: ignite }, ticks);
        return true;
    }

    interface FuryState { left: number; strikes: number; index: number; }

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
    }

    function ragingfuryStrike(current: CombatAction, state: FuryState, scenes: WorldFeedback.ActionScenes, done: (action: CombatAction) => void): void {
        const world = current.world(), actor = current.actor();
        const self = world.observe(actor);
        if (self === null) { scenes.finish(current, done); return; }
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

        let direction = ragingfuryInput(current);
        if (direction === null) direction = WorldGeometry.flatUnit(current.direction());
        current.face(self.position().plus(direction), 18, 18);

        // 本体只垫进 `lunge` 一步，真实受碰撞限制；不假装冲满整条火线。
        if (lunge > 0.05) sweepStep(current, direction.scale(lunge), radius);
        const body = current.world().observe(actor);
        const base = body !== null ? body.position() : self.position();
        const mouth = base.plus(WorldCombat.point(0, Math.max(0.5, Math.min(1.4, self.height() * 0.55)), 0)).plus(direction.scale(0.3));
        const aimEnd = mouth.plus(direction.scale(reach));
        const clipped = world.clipBlocks(mouth, aimEnd);
        const end = clipped !== null && clipped.blocked() ? clipped.position() : aimEnd;
        const length = Math.max(0, end.minus(mouth).length());
        const heading = direction;

        scenes.stop(current, "jet");
        scenes.show(current, "jet", mouth,
            { moment: "charge", target: String(actor.ref()), index: state.index, left: state.left, strikes: state.strikes,
                path: ragingfuryBeam(mouth, heading, end, radius), direction: [heading.x(), heading.y(), heading.z()],
                head: [end.x(), end.y(), end.z()], sparks: sparks, scale: scale, intensity: intensity });
        sound(current, "cobblemon:move.flamewheel.actor");
        sound(current, "minecraft:item.firecharge.use");

        let hits = 0;
        WorldGeometry.selectBodies(world, WorldGeometry.bodySegment(mouth, end, radius),
            function (target, facts) {
                if (String(target.ref()) === String(actor.ref()) || world.friendly(target)) return;
                if (current.trace(mouth, facts.position(), Math.max(0.2, radius * 0.4), true).blocked()) return;
                if (!hurt(current, target, ragingfuryId, power, { damage: damageSpec(ragingfuryId, "blaze") })) return;
                hits++;
                if (world.valid(target)) world.ignite(target, igniteTicks);
                const away = WorldCombat.point(facts.position().x() - base.x(), 0, facts.position().z() - base.z());
                if (world.valid(target) && away.length() > 0.05 && push > 0) world.hitDisplace(target, away.unit().scale(push));
                WorldFeedback.emit(world, ragingfuryScene, 1, facts.position(),
                    { moment: "scorch", target: String(target.ref()), sparks: Math.round(sparks * 0.6), scale: scale, intensity: intensity }, 22);
            });

        if (hits > 0) WorldFeedback.text(world, mouth.plus(heading.scale(Math.max(0.6, length * 0.5))).plus(WorldCombat.point(0, 0.6, 0)),
            ragingfuryChargeText, [Math.round(power)], 24);
        sound(current, "cobblemon:impact.fire");

        // 余烬只留在实际火舌下方的可支撑地面短条上：沿火束取几点，找脚下真实地面。
        let embers = 0;
        if (emberRadius > 0.5 && length > 0.5) {
            const slots = Math.max(1, Math.min(3, Math.round(length / 2)));
            for (let i = 1; i <= slots; i++) {
                const sample = mouth.plus(heading.scale(length * i / (slots + 1)));
                const ground = WorldGeometry.ground(world, sample, 4);
                if (ground.minus(sample).length() > 4.5) continue;
                const at = WorldCombat.point(ground.x(), ground.y(), ground.z());
                if (at.y() > sample.y() + 1.5) continue;
                if (ragingfuryEmber(world, at, emberRadius, igniteTicks, emberTicks)) embers++;
            }
        }
        if (embers > 0) {
            WorldFeedback.emit(world, ragingfuryScene, 1, mouth.plus(heading.scale(Math.max(0.6, length * 0.5))),
                { moment: "ember", target: String(actor.ref()), radius: emberRadius, scale: Math.max(0.6, Math.min(2.4, emberRadius / 2.2)),
                    intensity: Math.max(0.6, Math.min(2.0, power / 40)) }, 40);
            WorldFeedback.text(world, mouth.plus(heading.scale(Math.max(0.6, length * 0.5))).plus(WorldCombat.point(0, 0.4, 0)),
                ragingfuryEmberText, [], 26);
        }

        state.left = state.left - 1;
        state.index = state.index + 1;
        if (state.left > 0) {
            const pause = Math.max(6, Math.round(p(ragingfuryId, "gap", current)));
            current.after(pause, function (next: CombatAction) { ragingfuryStrike(next, state, scenes, done); });
        } else {
            ragingfurySpent(current, state);
            scenes.finish(current, done);
        }
    }

    define({
        freeMovement: true,
        id: ragingfuryId,
        cooldownParameter: "recharge",
        name: "Raging Fury",
        description: "连续几口收不住的猛烈火舌：每口从嘴端向前推进、遇墙截断，沿途多个敌人被烧中、点着并推开；只有实际触到的可支撑地面留下细短余火。拍间可转头换火路。喷完自己陷入恍惚，出手可能被打散。",
        uses: ["一口火舌扫过一条线上的多个敌人并点着它们", "在要道落下一片持续燃烧的余火", "把贴身的对手烧开并迫使其离开原地"],
        kind: "aim",
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
        windup: function (action, config, prepare) {
            const inferno = !!(config && config.inferno);
            action.present(ragingfuryId + ":windup", ragingfuryScene, 1, action.origin(),
                JSON.stringify({ moment: "tempo", inferno: inferno ? 1 : 0 }));
            return Math.max(3, Math.round(p(ragingfuryId, "tempo", action)));
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(ragingfuryScene);
            const world = action.world(), actor = action.actor();
            if (world.observe(actor) === null) { done(action); return; }
            const strikes = Math.max(2, Math.min(3, Math.round(p(ragingfuryId, "strikes", action))));
            const state: FuryState = { left: strikes, strikes: strikes, index: 0 };
            sound(action, "minecraft:entity.blaze.burn");
            ragingfuryStrike(action, state, scenes, done);
        }
    });

    // 失手反应：共享门禁把出手判给混乱时，按本单元自己的载体身份反噬一次；不续时、不重复。
    CombatStatus.rejected.define({ id: ragingfuryId + "/fumble", apply: function (context) {
        if (context.status !== "confusion") return;
        const carrier = context.details && context.details.effect !== undefined ? String(context.details.effect) : "";
        if (carrier && carrier !== ragingfuryDaze) return;
        const world = context.world, actor = context.actor;
        const effect = CombatStatus.representative(world, actor, "confusion");
        if (effect === null || String(effect.id()) !== ragingfuryDaze) return;
        const body = world.observe(actor);
        if (body !== null) {
            let attack = 0;
            try { attack = PokemonDamage.combatants.read(world, actor).stats.atk || 0; } catch (error) { attack = 0; }
            const fraction = Math.max(0.012, Math.min(0.05, 0.010 + attack * 0.00012));
            const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
            if (loss > 0) {
                WorldFeedback.emit(world, ragingfuryScene, 1, body.position(), { moment: "punish", target: String(actor.ref()) }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), ragingfuryChipText, [Math.round(loss * 10) / 10], 24);
                world.sound("minecraft:entity.player.hurt", body.position(), 12, "{}");
            }
        }
    } });

    // 恍惚存续期：低密度的眩晕气流每 20 刻续期，随效果自然结束而停；不写回时长。
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

    WorldCombat.preview("world_combat:" + ragingfuryId, JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
