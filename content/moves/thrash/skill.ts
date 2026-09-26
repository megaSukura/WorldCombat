/**
 * 大闹一番 / thrash 的出手方式。
 *
 * 核心念头：被围住时左一扫、右一扫，把身边贴身的人朝外挤开，最后重重跺地收场——不看目标，用身体扫出一圈空间。
 *   它不追谁：左、右两片真实扇扫各自罩住一侧，扫不到的一侧暂时安全；挥扫之间自己踉跄一小步，方向由玩家
 *   当刻的移动意图（或交替左右）决定，被墙和身体挡住；最后一记跺地要脚踩实地。
 *
 * 出手（`kind: "aim"`）：方向由当刻自由 aim 与交替左右决定，无需指定敌人；空闹也照样承担狂乱代价。
 *   提交后按住技能键可在挥间重新瞄准。
 *
 * 三幕（execute 自管节奏）：
 *   起（windup，提交前）：踏地、抡起一条手臂，只播预告。
 *   闹（execute，提交后）：`strikes` 次。前 `strikes-1` 记左右交替的约 150° 贴身扇扫，每记对扇内每个非友方
 *       各结算一次 `bash` 接触伤害并朝外震开 `push` 格，扇扫被墙／身体真实截断；最后一记是自身贴地跺击
 *       （不足地面就不结算伤害），另乘 `finisher`。每记之后自己沿移动意图／交替方向踉跄 `step` 格，不随机掉崖。
 *       狂乱式下每记还磕伤自己 `recoil`。两记之间隔 `gap` 刻。
 *   晕（结束）：闹完给自己挂共享身份 world_combat:status/confusion（载体本单元自己的 effect，时长按首次写入的
 *       `dazeTicks`，反噬不再续时）。
 *
 * 与同族分开：逆鳞是锁定单体的真冲撞，花瓣舞是移动中空花裙，大愤慨是分段火舌；大闹一番是原地左右扇扫＋末跺。
 */
namespace PokemonSkills {
    interface ThrashState { left: number; strikes: number; index: number; }

    function thrashInput(action: CombatAction): CombatPoint | null {
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

    /** 扇形取样顶点：圆心 + 从 `direction` 两侧张开的弧采样；判定与表现共用同一个半径与夹角。 */
    function thrashArc(centre: CombatPoint, direction: CombatPoint, radius: number, degrees: number): number[][] {
        const heading = WorldGeometry.flatUnit(direction);
        const base = Math.atan2(heading.x(), heading.z()), half = degrees * Math.PI / 360, steps = 8;
        const points: number[][] = [[centre.x(), centre.y() + 0.15, centre.z()]];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + 2 * half * i / steps;
            points.push([centre.x() + Math.sin(angle) * radius, centre.y() + 0.15, centre.z() + Math.cos(angle) * radius]);
        }
        return points;
    }

    function thrashSpent(current: CombatAction, state: ThrashState): void {
        const world = current.world(), actor = current.actor(), body = world.observe(actor);
        const ticks = Math.max(80, Math.round(p(thrashId, "dazeTicks", current)));
        const fumble = Math.round(Math.max(0.05, Math.min(0.9, p(thrashId, "fumble", current))) * 100);
        if (body !== null) {
            CombatStatus.apply(world, actor, "confusion", thrashDaze, ticks, fumble, { unique: true });
            WorldFeedback.emit(world, thrashScene, 1, body.position(),
                { moment: "spent", target: String(actor.ref()), strikes: state.strikes, fumble: fumble, ticks: ticks, intensity: 1 }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), thrashDazeText, [], 30);
            world.sound("cobblemon:status.volatile.confusion.actor", body.position(), 16, "{}");
        }
    }

    /** 挥扫之间的一小步踉跄：优先按玩家当刻移动意图，没输入就交替左右；被墙／身体挡住，不随机掉崖。 */
    function thrashStumble(current: CombatAction, index: number, step: number, aim: CombatPoint, radius: number): void {
        const world = current.world(), actor = current.actor(), self = world.observe(actor);
        if (self === null || step <= 0.02) return;
        const velocity = self.velocity();
        const moving = WorldCombat.point(velocity.x(), 0, velocity.z());
        let direction: CombatPoint;
        if (moving.length() > 0.05) direction = moving.unit();
        else {
            const heading = WorldGeometry.flatUnit(aim);
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            direction = side.scale(index % 2 === 0 ? 1 : -1);
        }
        if (LivingActions.hasFreeSpace(world)) {
            const candidate = self.position().plus(direction.scale(step));
            if (!LivingActions.freeSpace(world, candidate, Math.max(0.4, self.width()), Math.max(0.8, self.height()))) {
                const alternate = direction.scale(-1).scale(step);
                const other = self.position().plus(alternate);
                if (LivingActions.freeSpace(world, other, Math.max(0.4, self.width()), Math.max(0.8, self.height()))) direction = direction.scale(-1);
                else return;
            }
        }
        sweepStep(current, direction.scale(step), radius);
    }

    function thrashStrike(current: CombatAction, state: ThrashState, scenes: WorldFeedback.ActionScenes, done: (action: CombatAction) => void): void {
        const world = current.world(), actor = current.actor();
        const self = world.observe(actor);
        if (self === null) { scenes.finish(current, done); return; }
        const centre = self.position();
        const radius = Math.max(1.6, p(thrashId, "radius", current));
        const push = Math.max(0, p(thrashId, "push", current));
        const step = Math.max(0, p(thrashId, "step", current));
        const dust = Math.max(6, Math.round(p(thrashId, "dust", current)));
        const recoil = Math.max(0, p(thrashId, "recoil", current));
        const final = state.left <= 1;
        const power = p(thrashId, "bash", current) * (final ? p(thrashId, "finisher", current) : 1);
        const intensity = Math.max(0.6, Math.min(2.6, power / 24 + state.index * 0.12));
        const scale = Math.max(0.7, Math.min(2.2, radius / 3.4));
        const aim = thrashInput(current) || WorldGeometry.flatUnit(current.direction());

        let hits = 0;
        scenes.stop(current, "sweep");
        scenes.stop(current, "stomp");

        if (final) {
            // 末记：脚踩实地的贴地跺击；离地时只自己踉跄、不结算伤害。
            const grounded = self.grounded();
            current.face(centre.plus(aim), 15, 15);
            sound(current, "minecraft:entity.generic.big_fall");
            WorldFeedback.emit(world, thrashScene, 1, centre,
                { moment: "stomp", target: String(actor.ref()), index: state.index,
                    left: state.left, strikes: state.strikes, dust: dust, scale: scale, intensity: intensity }, 28);
            if (grounded) {
                sound(current, "minecraft:entity.player.attack.sweep");
                WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: 1.8, above: 2.4 }),
                    function (target, facts) {
                        if (current.trace(centre, facts.position(), Math.max(0.3, radius * 0.25), true).blocked()) return;
                        if (!hurt(current, target, thrashId, power, { damage: damageSpec(thrashId, "bash"), contact: true })) return;
                        hits++;
                        const away = WorldCombat.point(facts.position().x() - centre.x(), 0, facts.position().z() - centre.z());
                        if (world.valid(target) && away.length() > 0.05 && push > 0) world.hitDisplace(target, away.unit().scale(push));
                        WorldFeedback.emit(world, thrashScene, 1, facts.position(),
                            { moment: "knock", target: String(target.ref()), dust: dust, scale: scale, intensity: intensity }, 20);
                    });
            }
        } else {
            // 左／右交替的 150° 贴身扇扫：方向由当刻 aim 转向一侧，被墙／身体真截断。
            const heading = aim;
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const sweepDirection = WorldGeometry.flatUnit(heading.plus(side.scale(state.index % 2 === 0 ? 1 : -1)));
            current.face(centre.plus(sweepDirection), 20, 20);
            const path = thrashArc(centre, sweepDirection, radius, 150);
            scenes.show(current, "sweep", centre,
                { moment: "sweep", path: path, direction: [sweepDirection.x(), 0, sweepDirection.z()], index: state.index,
                    left: state.left, strikes: state.strikes, dust: dust, scale: scale, intensity: intensity });
            sound(current, "cobblemon:impact.normal");
            WorldGeometry.selectEnemies(world, WorldGeometry.sector(centre, sweepDirection, radius, 150, { below: 1.8, above: 2.4 }),
                function (target, facts) {
                    if (current.trace(centre, facts.position(), Math.max(0.3, radius * 0.25), true).blocked()) return;
                    if (!hurt(current, target, thrashId, power, { damage: damageSpec(thrashId, "bash"), contact: true })) return;
                    hits++;
                    const away = WorldCombat.point(facts.position().x() - centre.x(), 0, facts.position().z() - centre.z());
                    if (world.valid(target) && away.length() > 0.05 && push > 0) world.hitDisplace(target, away.unit().scale(push));
                    WorldFeedback.emit(world, thrashScene, 1, facts.position(),
                        { moment: "knock", target: String(target.ref()), dust: dust, scale: scale, intensity: intensity }, 20);
                });
        }

        if (hits > 0) {
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)),
                final ? thrashStompText : thrashFlailText, [Math.round(power)], 26);
        }

        // 自己站不稳：按移动意图／交替方向真位移一小步。
        thrashStumble(current, state.index, step, aim, Math.max(0.4, radius * 0.3));
        // 狂乱式：每一挥磕伤自己一点。
        if (recoil > 0.0001) {
            const loss = -world.health(actor, -self.maxHealth() * recoil, "world_combat:thrash_recoil");
            if (loss > 0) {
                WorldFeedback.emit(world, thrashScene, 1, centre, { moment: "reckless", target: String(actor.ref()) }, 18);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.2, 0)), thrashChipText, [Math.round(loss * 10) / 10], 22);
            }
        }

        state.left = state.left - 1;
        state.index = state.index + 1;
        if (state.left > 0) {
            const pause = Math.max(5, Math.round(p(thrashId, "gap", current)));
            current.after(pause, function (next: CombatAction) { thrashStrike(next, state, scenes, done); });
        } else {
            thrashSpent(current, state);
            scenes.finish(current, done);
        }
    }

    define({
        freeMovement: true,
        id: thrashId,
        cooldownParameter: "recharge",
        name: "Thrash",
        description: "被围住时左一扫、右一扫，把身边贴身的人朝外挤开，最后重跺收场：挥扫只罩住扫过去的那一侧，没扫到的一侧暂时安全；挥间自己按移动意图踉跄一小步，末记跺地要脚踩实地。闹完自己陷入恍惚，出手可能被打散。",
        uses: ["被围住时左右扫开贴身的人", "把贴身的敌人分两边震开、挤出身位", "用末记跺地清掉脚下目标"],
        kind: "aim",
        range: 3.4,
        maxRange: 5.2,
        prepare: 7,
        active: 0,
        recover: 9,
        cooldown: 38,
        maximumTicks: 240,
        style: "flurry",
        interruptible: false,
        defaults: { wild: false, ai: { maxChase: 8, minFoes: 1, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(thrashId, "radius", pokemon), geometry: "area", style: "flurry", color: 0xC9A227,
                label: config && config.wild === true ? "大闹一番·狂乱" : "大闹一番" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[thrashId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(thrashId, "tempo", context)),
                recover: Math.round(p(thrashId, "recover", context)),
                cooldown: Math.round(p(thrashId, "recharge", context)),
                active: 0,
                range: p(thrashId, "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            const wild = !!(config && config.wild);
            action.present(thrashId + ":windup", thrashScene, 1, action.origin(),
                JSON.stringify({ moment: "tempo", wild: wild ? 1 : 0 }));
            return Math.max(3, Math.round(p(thrashId, "tempo", action)));
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(thrashScene);
            const world = action.world(), actor = action.actor();
            if (world.observe(actor) === null) { done(action); return; }
            const strikes = Math.max(2, Math.min(3, Math.round(p(thrashId, "strikes", action))));
            const state: ThrashState = { left: strikes, strikes: strikes, index: 0 };
            sound(action, "minecraft:entity.ravager.roar");
            thrashStrike(action, state, scenes, done);
        }
    });

    // 失手反应：共享门禁把出手判给混乱时，按本单元自己的载体身份磕伤一次；不续时、不重复。
    CombatStatus.rejected.define({ id: thrashId + "/fumble", apply: function (context) {
        if (context.status !== "confusion") return;
        const carrier = context.details && context.details.effect !== undefined ? String(context.details.effect) : "";
        if (carrier && carrier !== thrashDaze) return;
        const world = context.world, actor = context.actor;
        const effect = CombatStatus.representative(world, actor, "confusion");
        if (effect === null || String(effect.id()) !== thrashDaze) return;
        const body = world.observe(actor);
        if (body !== null) {
            let attack = 0;
            try { attack = PokemonDamage.combatants.read(world, actor).stats.atk || 0; } catch (error) { attack = 0; }
            const fraction = Math.max(0.012, Math.min(0.05, 0.010 + attack * 0.00011));
            const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
            if (loss > 0) {
                WorldFeedback.emit(world, thrashScene, 1, body.position(), { moment: "punish", target: String(actor.ref()) }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), thrashChipText, [Math.round(loss * 10) / 10], 24);
                world.sound("minecraft:entity.player.hurt", body.position(), 12, "{}");
            }
        }
    } });

    // 恍惚存续期：低密度的眩晕气流每 20 刻续期，随效果自然结束而停；不写回时长。
    WorldCombat.on(thrashId + ":linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== thrashDaze) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, thrashId + ":dizzy:" + String(actor.ref()), thrashScene, 1, body.position(),
            { moment: "dizzy", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });

    WorldCombat.preview("world_combat:" + thrashId, JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
