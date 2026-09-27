/**
 * 拦堵 / obstruct 的出手方式。
 *
 * 念头的形状：把一圈带刺拒马顶在身前、钉在原地（raise），用比守住更薄的量挡下来自**正面**的来袭（hold → block）；
 * 每一次正面接触攻击撞上来，撞的人在同一个窗口里被扎一次、防御大幅下降（punish）；量尽则崩解（shatter）。
 * 三幕：立拒马 → 拒止 → 崩解。拒马本体是共享 GuardEffects 的 pool，撑罩期间用 world_combat:rooted 定身。
 *
 * 正面判据在立起时固定：朝向就是施法者当时的水平视线；侧背来的攻击照常打在身上，不消耗拒马、也不降防。
 * 根与拒马同寿命：立起时同一 `window` 挂上，拒马被打穿的那一刻立刻收回这道 rooted（不再拖到原时限）。
 * 每个攻击者在本次拒马窗口内只被扎一次：去重表存在 guard 自己的 state 里，直到这段拒马结束才随它一起消失。
 */
namespace PokemonSkills {
    const obstructScene = "world_combat:move_obstruct";
    export const ObstructRule = "world_combat:obstruct";
    const obstructHoldKey = "world_combat:move_obstruct:hold";
    const obstructFacingKey = "obstruct_facing";
    const obstructBlockText = "world_combat.move.obstruct.text.block";
    const obstructPunishText = "world_combat.move.obstruct.text.punish";
    const obstructShatterText = "world_combat.move.obstruct.text.shatter";
    /** 正面半角 60°（整张 120°）。侧背不挡，表现里的正面桩弧也用同一张角。 */
    const obstructFrontCos = Math.cos(60 * Math.PI / 180);

    function obstructIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function obstructContact(data: any): boolean {
        return DamageSemantics.read(data).contact;
    }
    function finitePoint(value: any): boolean {
        return Array.isArray(value) && value.length === 3
            && value.every(function (n: any) { return typeof n === "number" && isFinite(n); });
    }
    /** 立起时的固定正面：施法者当刻水平视线；取不到朝向时返回空表，判定退回全向、表现不带方向。 */
    function obstructFacing(world: CombatWorld, actor: CombatActor): number[] {
        const look = WorldGeometry.facing(world, actor);
        if (look === null) return [];
        const flat = WorldGeometry.flatUnit(look);
        return flat.length() < 1e-6 ? [] : [flat.x(), flat.z()];
    }
    function obstructStoredFacing(action: CombatAction, world: CombatWorld, actor: CombatActor): number[] {
        const stored = action.data(obstructFacingKey);
        if (stored !== null) {
            try { const value = JSON.parse(stored); if (value && value.known === true) return [Number(value.x), Number(value.z)]; return []; }
            catch (error) { /* fall through */ }
        }
        return obstructFacing(world, actor);
    }
    /** 来袭起点：优先原生 sourcePosition，其次真实弹道最后一段的实际接触点，再次攻击者身体位置；都没有就不猜方向。 */
    function obstructSource(world: CombatWorld, incoming: GuardEffects.Incoming): CombatPoint | null {
        const data: any = incoming.data;
        if (data && finitePoint(data.sourcePosition))
            return WorldCombat.point(data.sourcePosition[0], data.sourcePosition[1], data.sourcePosition[2]);
        const path = data && data.projectilePath;
        if (Array.isArray(path) && path.length) {
            const to = path[path.length - 1] && path[path.length - 1].to;
            if (finitePoint(to)) return WorldCombat.point(to[0], to[1], to[2]);
        }
        const attacker = incoming.source ? world.observe(incoming.source) : null;
        return attacker === null ? null : attacker.position();
    }

    GuardEffects.register(ObstructRule, {
        /** 只挡敌对来源的、落在固定正面 120° 内的攻击；自身来源（摔落、灼伤）与侧背来袭都不消耗拒马。 */
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            if (!incoming.source || String(incoming.source.ref()) === String(effect.target().ref()) || world.friendly(incoming.source)) return false;
            const direction = (<any>state).direction;
            if (!Array.isArray(direction) || direction.length < 2) return true;
            const body = world.observe(effect.target()), origin = obstructSource(world, incoming);
            if (body === null || origin === null) return true;
            const approach = WorldGeometry.flatUnit(origin.minus(body.position()));
            return approach.x() * Number(direction[0]) + approach.z() * Number(direction[1]) >= obstructFrontCos;
        },
        pulse: function (effect, state) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            const custom: any = state;
            const direction = Array.isArray(custom.direction) && custom.direction.length >= 2
                ? [Number(custom.direction[0]), 0, Number(custom.direction[1])] : undefined;
            WorldFeedback.keep(world, obstructHoldKey, obstructScene, 1, body.position(), {
                moment: "hold", target: String(effect.target().ref()),
                reach: custom.radius, direction: direction,
                intensity: obstructIntensity(state.capacity, custom.initial || state.capacity || 1)
            }, 20);
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const attacker = incoming.source && String(incoming.source.ref()) !== String(target.ref()) && world.observe(incoming.source) !== null ? incoming.source : null;
            const attackerBody = attacker !== null ? world.observe(attacker) : null;
            // 来向：away 从攻击者指向拒马（打在哪一侧），toAttacker 从拒马指向攻击者（刺从哪边顶出去）。
            const away = attackerBody !== null ? body.position().minus(attackerBody.position()) : null;
            const toAttacker = attackerBody !== null ? attackerBody.position().minus(body.position()) : null;
            if (attacker !== null && attackerBody !== null && obstructContact(incoming.data) && !world.friendly(attacker)) {
                const key = String(attacker.ref());
                if (!custom.punished) custom.punished = {};
                if (!custom.punished[key]) {
                    custom.punished[key] = true;
                    // 去重写进 guard 自己的 state：直到这段拒马结束才释放，末段也不允许同一敌人再被扎一次。
                    effect.state(JSON.stringify(state));
                    const drop = custom.drop || 1;
                    // 只有真正削掉级数才算成功：boost 返回实际负增量，已到下限（回执 0）不播降防回执。
                    const applied = NativeEffects.boost(world, attacker, "def", -drop);
                    if (applied < 0) {
                        const point = attackerBody.position();
                        const punish: any = { moment: "punish", target: key, drop: Math.abs(applied), punishCount: Math.abs(applied) * 8 };
                        if (toAttacker !== null && toAttacker.length() > 0.01) {
                            const direction = toAttacker.unit();
                            punish.direction = [direction.x(), direction.y(), direction.z()];
                        }
                        WorldFeedback.emit(world, obstructScene, 1, point, punish, 24);
                        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.4, 0)), obstructPunishText, [Math.abs(applied)], 30);
                        world.sound("minecraft:entity.iron_golem.attack", point, 16, "{}");
                    }
                }
            }
            const blocked = Math.round(amount * 10) / 10, remaining = Math.round(state.capacity * 10) / 10;
            const block: any = { moment: "block", target: String(target.ref()),
                intensity: obstructIntensity(state.capacity, custom.initial || 1), blocked: blocked, remaining: remaining };
            if (away !== null && away.length() > 0.01) {
                const direction = away.unit();
                block.direction = [direction.x(), direction.y(), direction.z()];
            }
            WorldFeedback.emit(world, obstructScene, 1, body.position(), block, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), obstructBlockText, [blocked, remaining], 30);
            world.sound("minecraft:item.shield.block", body.position(), 16, "{}");
            if (state.capacity <= 0) {
                // 根与拒马同寿命：拒马被打穿的这一刻收回本次立起的 rooted，而不是等它走完原时限。
                const root = custom.rootId;
                if (typeof root === "number" && root > 0) world.operation(root, "world_combat:dispel", "{}");
                WorldFeedback.emit(world, obstructScene, 1, body.position(), { moment: "shatter", target: String(target.ref()), reach: custom.radius }, 26);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), obstructShatterText, [], 30);
                world.sound("minecraft:item.shield.break", body.position(), 16, "{}");
            }
        }
    });

    define({
        freeMovement: true,
        id: "obstruct",
        cooldownParameter: "charge",
        name: "Obstruct",
        description: "立起一道拒马并钉在原地，用总量完整挡下来自正面的伤害；正面接触它的攻击者防御会大幅下降，侧背来的攻击照常打中你，连续使用容易失败。",
        uses: ["引诱近战对手撞上拒马正面", "为后续攻击先把对手打软", "站在要道上，用拒马替自己扛下一轮正面集火"],
        kind: "self",
        range: 0,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 80,
        stationary: false,
        style: "barricade",
        defaults: { barbs: false, ai: { range: 4 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["obstruct"], detail: { values: config }, world, actor, attributes };
            const barbs = !!(config && config.barbs);
            return {
                prepare: p("obstruct", "raise", context),
                recover: barbs ? 6 : 10,
                cooldown: p("obstruct", "charge", context),
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            const facing = obstructFacing(action.sense(), action.actor());
            // action.data 只接受对象：把固定正面存成 {known,x,z}，空朝向表示退回全向。
            action.data(obstructFacingKey, JSON.stringify({ known: facing.length >= 2, x: facing.length >= 2 ? facing[0] : 0, z: facing.length >= 2 ? facing[1] : 0 }));
            const shown = facing.length >= 2 ? [facing[0], 0, facing[1]] : [0, 0, 1];
            action.present("world_combat:move_obstruct:raise", obstructScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", reach: p("obstruct", "radius", action), direction: shown }));
            return prepare;
        },
        ready: function (action, config) {
            const key = "obstruct_fizzle", stored = action.data(key);
            if (stored !== null) return JSON.parse(stored).failed ? "world_combat:fizzle" : "";
            const failed = action.sense().random() < p("obstruct", "fizzle", action);
            action.data(key, JSON.stringify({ failed: failed }));
            return failed ? "world_combat:fizzle" : "";
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const window = p("obstruct", "window", action);
            const capacity = p("obstruct", "capacity", action);
            const radius = p("obstruct", "radius", action);
            const facing = obstructStoredFacing(action, world, actor);
            const previous = state(world, actor, GuardEffects.stallKey), now = world.tick();
            const count = previous && typeof previous.stall === "number" && now - (previous.at || 0) <= p("obstruct", "stallReset", action) ? previous.stall : 0;
            setState(world, actor, GuardEffects.stallKey, { stall: count + 1, at: now });
            // 先立根、再把它的 id 交给 guard：拒马碎时由 guarded 同步收回，寿命始终一致。
            const rootId = world.effect("world_combat:rooted", actor, "{}", window);
            const guard: any = { rule: ObstructRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, initial: capacity, radius: radius, drop: p("obstruct", "drop", action),
                direction: facing, rootId: rootId, punished: {} };
            GuardEffects.apply(world, actor, guard, window);
            sound(action, "minecraft:block.deepslate.place");
            const shown = facing.length >= 2 ? [facing[0], 0, facing[1]] : [0, 0, 1];
            action.present("world_combat:move_obstruct:raise2", obstructScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", reach: radius, direction: shown }));
            done(action);
        }
    });
}
