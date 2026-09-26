/**
 * 蛸固 / octolock —— 执行组织。
 *
 * 核心念头：**伸出一条触手咬住目标，把它牵制住；此后每过一拍就勒紧一次，越勒越软。**
 *   缠是术者维持的：术者离开维持距离、视线被挡或倒下，触手就松开——所以用法是「贴上去缠住一个必须解决的目标」，
 *   代价是术者也被拴在这片地方继续挨打。
 *
 * 三幕：
 *   盘（windup，提交前）：术者身下盘起、触手在身侧收拢（只观察与预告，可被打断不花代价）。
 *   缠（lash，提交后）：触手命中活体即挂共享身份 `world_combat:status/octolock` 与 `world_combat:status/trapped`
 *       的真实 MobEffect（有界减速，不是钉死）；随后的持久触手 `world_combat:octolock_bind`
 *       每 `interval` 刻复查「目标还在 `grip` 之内、视线仍通、术者仍存活」，并给目标防御与特防各 −1 级（原生的每回合）；
 *       本次的勒紧次数有上限，用完即松。
 *   松（release／slip）：时长走完、术者走远／倒下、视线被挡、或被牛奶清掉时，触手松开、状态被精确移除。
 *
 * 与同族分开：紧咬不放双方互锁、只咬一次；捕兽夹丢地上术者走开；蛸固只锁目标、术者仍能打，
 *   但每拍把目标削得更软，且必须留在维持距离之内。
 *
 * 配置 `coil`（缠紧）由 resolve 改时序与射程，由公式改间隔／维持距离：缠得更牢更狠，但更近更费。
 */
namespace PokemonSkills {
    function octoBindData(json: string): string {
        const value = JSON.parse(json);
        if (typeof value.caster !== "string" || !value.caster) throw new Error("Invalid octolock caster");
        ["grip", "interval", "tentacles", "squeeze", "round", "maxRounds", "scale", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid octolock state");
        });
        if (value.grip <= 0 || value.interval < 1 || value.squeeze < 1 || value.maxRounds < 1) throw new Error("Invalid octolock state");
        return JSON.stringify(value);
    }

    function octoVisual(world: CombatWorld, victim: CombatActor, caster: CombatActor, state: any, ticks: number, moment: string, drops: number): void {
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, octoScene, 1, body.position(),
            { moment: moment, target: String(victim.ref()), path: [String(caster.ref()), String(victim.ref())],
                tentacles: state.tentacles, round: state.round, drops: drops,
                scale: state.scale, intensity: state.intensity }, ticks);
    }

    /** 持续缠线：绑在本单元的托管触手效果上，效果自然到期、被驱散或术者离场都一起收回。 */
    function octoHold(world: CombatWorld, effectId: number, victim: CombatActor, state: any, tension: number): void {
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.onEffect(world, effectId, octoHoldKey, octoScene, 1, body.position(),
            { moment: "hold", target: String(victim.ref()), path: ["source", String(victim.ref())],
                tentacles: state.tentacles, round: state.round, tension: tension, intensity: state.intensity });
    }

    /** 沿提交方向在触手伸出距离内取最近的敌人；没有就不建立关系。 */
    function octoFirstEnemy(world: CombatWorld, origin: CombatPoint, direction: CombatPoint, reach: number): CombatActor | null {
        let found: CombatActor | null = null, best = Infinity;
        WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, direction, reach, Math.max(1.2, reach * 0.35), { below: 2, above: 2 }),
            function (enemy, facts) {
                const distance = facts.position().minus(origin).length();
                if (distance < best) { best = distance; found = enemy; }
            });
        return found;
    }

    WorldCombat.effect(octoBind, 1, 600, "actor", octoBindData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(octoBind, "start", function (effect) {
        const world = effect.world(), victim = effect.target(), state = JSON.parse(effect.state());
        octoHold(world, effect.id(), victim, state, 0.35);
        effect.schedule("squeeze", "squeeze", Math.max(1, Math.round(state.interval)), "{}");
    });
    WorldCombat.effectHandler(octoBind, "squeeze", function (effect) {
        const world = effect.world(), victim = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const caster = effect.source();
        const held = world.observe(victim), holder = world.valid(caster) ? world.observe(caster) : null;
        // 距离或视线断开就立刻停下后续降防，不强行补抓；目标由此脱困。
        if (holder === null || held === null || held.position().minus(holder.position()).length() > state.grip
            || !world.clear(holder.position(), held.position())) {
            state.slipped = true; effect.state(JSON.stringify(state)); effect.end(); return;
        }
        if (state.round >= state.maxRounds) { effect.end(); return; }
        state.round += 1;
        const def = NativeEffects.boost(world, victim, "def", -state.squeeze);
        const spd = NativeEffects.boost(world, victim, "spd", -state.squeeze);
        const drops = Math.abs(def) + Math.abs(spd);
        MobEffects.apply(world, victim, octoBound, Math.max(20, effect.remaining()), 0);
        effect.state(JSON.stringify(state));
        octoHold(world, effect.id(), victim, state, Math.max(0.35, Math.min(1, state.round / Math.max(1, state.maxRounds))));
        if (drops > 0) {
            octoVisual(world, victim, caster, state, 24, "squeeze", drops);
            WorldFeedback.text(world, held.position().plus(WorldCombat.point(0, 1.1, 0)), octoSqueezeText, [state.round, drops], 22);
            world.sound("minecraft:entity.glow_squid.squirt", held.position(), 11, "{}");
        }
        effect.schedule("squeeze", "squeeze", Math.max(1, Math.round(state.interval)), "{}");
    });
    WorldCombat.effectHandler(octoBind, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(victim)) return;
        const seal = MobEffects.read(world, victim, octoBound);
        // 标记已被原生手段清掉（牛奶／/effect clear）时视为目标拒绝了牵制，走 slip。
        const refused = seal === null;
        if (seal !== null) world.removeMobEffect(victim, octoBound, seal.key());
        const body = world.observe(victim);
        if (body === null) return;
        const slipped = state.slipped === true || refused;
        WorldFeedback.emit(world, octoScene, 1, body.position(),
            { moment: slipped ? "slip" : "release", target: String(victim.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)),
            slipped ? octoSlipText : octoReleaseText, [], 24);
    });

    // 牛奶／/effect clear 清掉缠绕标记时，收回触手。
    WorldCombat.on("world_combat:move_octolock/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== octoBound) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim)) return;
        const binds = world.effects(victim, octoBind);
        for (let index = 0; index < binds.length; index++) world.operation(binds[index].id(), "world_combat:dispel", "{}");
    });

    define({
        id: octoId,
        cooldownParameter: "recharge",
        name: "蛸固",
        description: "伸出一条触手咬住一个对手或身前第一个敌人，把它牵制住（移动与飞行速度减半）；此后每隔一段时间就勒紧一次，防御与特防各降一级。缠由术者维持：术者离开太远或视线被挡住，触手就松开；目标也能用牛奶等原生手段解掉牵制。",
        uses: ["把一个必须解决的厚目标缠住，一层层削掉它的双防", "在拉锯里持续压低对手的防御与特防", "把逃向出口的目标拖慢在自己身边"],
        kind: "aim",
        range: 5,
        maxRange: 7,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 110,
        style: "tentacle",
        stationary: true,
        turn: 15,
        defaults: { coil: false, ai: { maxChase: 8 } },
        fields: [
            field(pathOf("coil"), "缠紧", "boolean", { help: "开启（缠紧）：勒得密（间隔 ×0.75）、维持距离 +1 格；代价是伸出距离 −1 格、冷却 ×1.2——缠得更牢更狠，但更近更费。关闭（松缠）：够得更远、出手更快、冷却更短；代价是勒得更慢、更容易被挣脱。" })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[octoId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(octoId, "tempo", context)),
                recover: Math.round(p(octoId, "aftercast", context)),
                cooldown: Math.round(p(octoId, "recharge", context)),
                active: 1,
                range: p(octoId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_octolock:coil", octoScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", coil: config && config.coil === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: p(octoId, "reach"), geometry: "line", style: "tentacle", color: 0x8E4FA8,
                label: config && config.coil === true ? "蛸固 · 缠紧" : "蛸固" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            if (selfBody === null) { done(action); return; }
            const origin = selfBody.position();
            const reach = Math.max(3, p(octoId, "reach", action));
            const direction = WorldGeometry.flatUnit(PokemonSkills.aim(action), action.direction());
            // 中性瞄准：指定敌人就用它；只给方向就沿短方向抓最近的敌人；指定友方或空抓都不建立关系。
            let target = action.target();
            const explicitTarget = target !== null;
            if (target !== null && (!world.valid(target) || world.friendly(target))) target = null;
            if (target === null && !explicitTarget) target = octoFirstEnemy(world, origin, direction, reach);
            if (target === null) {
                WorldFeedback.emit(world, octoScene, 1, origin.plus(direction.scale(reach)), { moment: "fizzle" }, 16);
                done(action); return;
            }
            const body = world.observe(target);
            if (body === null) { done(action); return; }
            const targetPoint = body.position();
            // 墙挡住连线（或超出伸出距离）就不起连。
            if (origin.minus(targetPoint).length() > reach + 1.5 || !world.clear(origin, targetPoint)) {
                WorldFeedback.emit(world, octoScene, 1, targetPoint, { moment: "fizzle", target: String(target.ref()) }, 18);
                done(action); return;
            }
            const grip = Math.max(3, p(octoId, "grip", action));
            const bindTicks = Math.max(120, Math.round(p(octoId, "bindTicks", action)));
            const interval = Math.max(20, Math.round(p(octoId, "interval", action)));
            const maxRounds = Math.max(1, Math.floor(bindTicks / interval));
            const tentacles = Math.max(6, Math.round(p(octoId, "tentacles", action)));
            const scale = Math.max(0.6, Math.min(2.4, body.width() / 0.9));
            const intensity = Math.max(0.6, Math.min(2.4, tentacles / 16));
            if (!CombatStatus.apply(world, target, "octolock", octoBound, bindTicks, 0, { unique: true })) { done(action); return; }
            const existing = world.effects(target, octoBind);
            for (let index = 0; index < existing.length; index++) world.operation(existing[index].id(), "world_combat:dispel", "{}");
            world.effect(octoBind, target, JSON.stringify({ caster: String(self.ref()), grip: grip, interval: interval,
                tentacles: tentacles, squeeze: 1, round: 0, maxRounds: maxRounds, scale: scale, intensity: intensity }), bindTicks);
            WorldFeedback.emit(world, octoScene, 1, targetPoint,
                { moment: "lash", target: String(target.ref()), path: [String(self.ref()), String(target.ref())],
                    tentacles: tentacles, round: 0, scale: scale, intensity: intensity }, 30);
            WorldFeedback.text(world, targetPoint.plus(WorldCombat.point(0, 1.1, 0)), octoLashText,
                [Math.round(interval / 20 * 10) / 10], 26);
            sound(action, "minecraft:block.chain.place");
            sound(action, "minecraft:entity.squid.ambient");
            done(action);
        }
    });
}
