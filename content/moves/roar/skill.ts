/**
 * 吼叫 / roar —— 注册、逐退行为与动作。
 *
 * 核心念头：一声吼，把威势当作武器——声浪以自己为中心贴地铺开一圈，圈里的敌人被打上「溃退」，
 *           失去当前目标并被逐出交战圈；不打伤害，只把对手逐走。
 * 一幕半：
 *   起（windup，提交前）：胸口鼓起暖褐声光，预告这一吼。
 *   吼（execute，提交后）：声浪贴地放开，圈内的每个非友方活体被打上共享身份 world_combat:status/routed
 *        （本单元效果 world_combat:roar_routed），并挂上一条逐退驱动 `world_combat:roar_rout`：
 *        立即被打断当前动作、清掉目标、沿背离施法者的方向弹开；之后每 10 刻，只要还离施法者不足 keepOut，
 *        就再被逐开 panic 格，直到溃退时间走完。宝可梦、原版生物、其他模组生物与玩家走同一条路。
 * 与同族分开：吼叫是本组唯一绕身一圈、唯一无视方向、唯一完全无伤的逐退；龙尾是正面一大片横扫，吹飞是
 *   一条向前推进的长风道，巴投是抓一个摔到背后。
 * 反制：站到声浪半径之外就毫发无伤；溃退只是让人失去目标、被推开，不阻止它转身回来。
 */
namespace PokemonSkills {
    /** 逐退脉冲间隔（刻）：溃退期间每隔这么久把敌人从施法者身边再逐开一步。 */
    const roarBeat = 10;

    function roarFlat(point: CombatPoint): CombatPoint {
        const value = WorldCombat.point(point.x(), 0, point.z());
        return value.length() < 0.01 ? WorldCombat.point(0, 0, 1) : value;
    }

    /** 把「溃退」落到一个目标身上：共享身份 + 一条逐退驱动效果（施法者为 source，目标为 target）。 */
    function roarRoutBody(world: CombatWorld, caster: CombatActor, target: CombatActor, centre: CombatPoint, body: CombatObservation,
        flee: number, panic: number, keepOut: number): void {
        const duration = Math.max(20, Math.round(flee));
        CombatStatus.apply(world, target, "routed", roarRouted, duration);
        const away = roarFlat(body.position().minus(centre));
        world.effect(roarRout, target, JSON.stringify({ caster: String(caster.ref()),
            dir: [away.x(), away.y(), away.z()], keepOut: keepOut, panic: panic, kick: Math.min(2.4, panic * 1.6) }), duration);
    }

    WorldCombat.effect(roarRout, 1, 400, "actor", function (json: string): string {
        const state = JSON.parse(json);
        if (!state || !Array.isArray(state.dir) || state.dir.length !== 3 || !isFinite(state.keepOut) || !isFinite(state.panic))
            throw new Error("Invalid roar rout state");
        return JSON.stringify(state);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(roarRout, "start", function (effect: CombatEffect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const state = JSON.parse(effect.state()), body = world.observe(victim);
        world.interrupt(victim, "world_combat:routed");
        world.target(victim, null);
        if (body !== null) {
            const away = roarFlat(WorldCombat.point(state.dir[0], 0, state.dir[2]));
            world.motion(victim, WorldCombat.point(away.x(), 0.22, away.z()).unit().scale(state.kick), true);
            WorldFeedback.emit(world, roarScene, 1, body.position(), { moment: "rout", target: String(victim.ref()) }, 22);
        }
        effect.schedule("surge", "surge", roarBeat, "{}");
    });
    WorldCombat.effectHandler(roarRout, "surge", function (effect: CombatEffect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const state = JSON.parse(effect.state()), body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        world.target(victim, null);
        let away = roarFlat(WorldCombat.point(state.dir[0], 0, state.dir[2]));
        const caster = state.caster ? world.actor(state.caster) : null;
        const from = caster !== null ? world.observe(caster) : null;
        let distance = 999;
        if (from !== null) {
            const delta = body.position().minus(from.position());
            distance = delta.length();
            if (delta.length() > 0.01) away = roarFlat(delta);
        }
        if (distance < state.keepOut) {
            world.displace(victim, away.unit().scale(state.panic));
            const after = world.observe(victim);
            if (after !== null)
                WorldFeedback.keep(world, "world_combat:move_roar:" + String(victim.ref()), roarScene, 1, after.position(),
                    { moment: "flee", target: String(victim.ref()) }, 18);
        }
        effect.schedule("surge", "surge", roarBeat, "{}");
    });

    define({
        id: roarId,
        cooldownParameter: "wait",
        name: "吼叫",
        description: "吼出一圈声浪，把范围内的敌人震慑得失去目标、掉头离开战斗；没有伤害。它只把对手逐走，逼它们转身走开。",
        uses: ["把贴身的敌人一次逐开", "打断围攻、为自己拉开呼吸空间", "在混战里逼退一圈人"],
        kind: "self",
        range: 5,
        maxRange: 10,
        prepare: 9,
        active: 1,
        recover: 8,
        cooldown: 110,
        style: "roar",
        defaults: { unleash: false, ai: { maxChase: 6, minFoes: 1, leaveStation: false } },
        fields: [flag("unleash", "狂啸")],
        resolve: function (pokemon: CombatPokemon, config: any, world?: CombatWorld | null, actor?: CombatActor | null, attributes?: IndividualAttributes.Context) {
            const context: NumberContext = { pokemon, skill: skills[roarId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: Math.round(p(roarId, "tempo", context)), recover: Math.round(p(roarId, "recover", context)),
                cooldown: Math.round(p(roarId, "wait", context)), active: 1, range: p(roarId, "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:move_roar:windup", roarScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", scale: scale, waves: Math.round(p(roarId, "waves", action)) }));
            return prepare;
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: p(roarId, "reach", pokemon), geometry: "area", style: "roar", color: 0xE0B24A,
                label: config && config.unleash ? "吼叫·狂啸" : "吼叫" };
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            const reach = p(roarId, "reach", action), flee = p(roarId, "flee", action);
            const panic = p(roarId, "panic", action), keepOut = p(roarId, "keepOut", action);
            const waves = Math.round(p(roarId, "waves", action));
            let hits = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, reach, { below: 3, above: 3.5 }), function (target, facts) {
                if (String(target.ref()) === String(actor.ref())) return;
                roarRoutBody(world, actor, target, centre, facts, flee, panic, keepOut);
                WorldFeedback.emit(world, roarScene, 1, facts.position(),
                    { moment: "rout", target: String(target.ref()), waves: waves }, 22);
                if (partyForceOut(world, target, partyFeet(facts)) !== null)
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.1, 0)), roarSwitchText, [], 24);
                hits++;
            });
            WorldFeedback.emit(world, roarScene, 1, centre, { moment: "wave", radius: reach, scale: reach / 5, waves: waves, hits: hits }, 30);
            if (hits === 0) WorldFeedback.emit(world, roarScene, 1, centre, { moment: "miss", scale: reach / 5 }, 18);
            world.sound(hits > 0 ? "minecraft:entity.ravager.roar" : "minecraft:entity.wolf.growl", centre, 22, "{}");
            const above = centre.plus(WorldCombat.point(0, 1.5, 0));
            if (hits > 0) WorldFeedback.text(world, above, roarWaveText, [hits], 30);
            else WorldFeedback.text(world, above, roarMissText, [], 24);
            done(action);
        }
    });
}

