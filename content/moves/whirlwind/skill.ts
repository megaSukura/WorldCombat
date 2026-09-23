/**
 * 吹飞 / whirlwind —— 注册、逐退行为与动作。
 *
 * 核心念头：朝选定的方向推出一道向前推进的风墙——它从身前出发，一路扫到风道尽头；被扫到的敌人
 *           沿风向被吹开，失去目标、被逐出交战圈。没有伤害，靠的是「赶走」。
 * 一幕半：
 *   起（windup，提交前）：身前气流开始旋转、风尘贴地聚起，预告这道风。
 *   推（execute，提交后）：风墙从原点以每刻 front 格向前推进 `beats` 刻，每刻在风墙位置开一圈判定；
 *       第一次被扫到的非友方活体沿风向被推出 blow 格并弹起，打上共享身份 world_combat:status/routed
 *       （本单元效果 world_combat:whirlwind_routed），并挂上逐退驱动 world_combat:whirlwind_rout：
 *       之后每 10 刻只要还离施法者不足 keepOut，就沿风向再被推开 panic 格。
 * 与同族分开：吹飞是本组唯一「线形、向前推进、可整发躲过」的逐退——站在风道宽度之外就毫发无伤；
 *   吼叫绕身一圈，龙尾是正面扇形横扫，巴投抓一个摔到背后。
 * 反制：风墙是直线，横移出风道、或拉开距离让它提前扫完，都能整发躲过。
 */
namespace PokemonSkills {
    const whirlwindBeat = 10;

    function whirlwindRoutBody(world: CombatWorld, caster: CombatActor, target: CombatActor, dir: CombatPoint,
        flee: number, panic: number, keepOut: number): void {
        const duration = Math.max(20, Math.round(flee));
        CombatStatus.apply(world, target, "routed", whirlwindRouted, duration);
        world.effect(whirlwindRout, target, JSON.stringify({ caster: String(caster.ref()),
            dir: [dir.x(), 0, dir.z()], keepOut: keepOut, panic: panic }), duration);
    }

    WorldCombat.effect(whirlwindRout, 1, 400, "actor", function (json: string): string {
        const state = JSON.parse(json);
        if (!state || !Array.isArray(state.dir) || state.dir.length !== 3 || !isFinite(state.keepOut) || !isFinite(state.panic))
            throw new Error("Invalid whirlwind rout state");
        return JSON.stringify(state);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(whirlwindRout, "start", function (effect: CombatEffect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        world.interrupt(victim, "world_combat:routed");
        world.target(victim, null);
        if (body !== null)
            WorldFeedback.emit(world, whirlwindScene, 1, body.position(), { moment: "rout", target: String(victim.ref()) }, 20);
        effect.schedule("surge", "surge", whirlwindBeat, "{}");
    });
    WorldCombat.effectHandler(whirlwindRout, "surge", function (effect: CombatEffect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const state = JSON.parse(effect.state()), body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        world.target(victim, null);
        const dir = WorldCombat.point(state.dir[0], 0, state.dir[2]);
        const caster = state.caster ? world.actor(state.caster) : null;
        const from = caster !== null ? world.observe(caster) : null;
        const distance = from !== null ? body.position().minus(from.position()).length() : 0;
        if (dir.length() > 0.01 && distance < state.keepOut) {
            world.displace(victim, dir.unit().scale(state.panic));
            const after = world.observe(victim);
            if (after !== null)
                WorldFeedback.keep(world, "world_combat:move_whirlwind:" + String(victim.ref()), whirlwindScene, 1, after.position(),
                    { moment: "flee", target: String(victim.ref()) }, 18);
        }
        effect.schedule("surge", "surge", whirlwindBeat, "{}");
    });

    define({
        id: whirlwindId,
        cooldownParameter: "wait",
        name: "吹飞",
        description: "朝选定方向推出一道向前推进的风墙，把沿途的敌人沿风向吹开、失去目标、逐出战斗；有后备的对手会被真正换下。没有伤害，站在风道外就无事。",
        uses: ["沿一条直线把一排敌人吹开", "把扑上来的敌人推回远处", "在开阔地远距离逐退"],
        kind: "point",
        range: 7,
        maxRange: 15,
        prepare: 10,
        active: 1,
        recover: 8,
        cooldown: 100,
        style: "wind",
        defaults: { wide: false, ai: { maxChase: 12, minFoes: 1, leaveStation: false } },
        fields: [flag("wide", "宽阔风墙")],
        resolve: function (pokemon: CombatPokemon, config: any, world?: CombatWorld | null, actor?: CombatActor | null, attributes?: IndividualAttributes.Context) {
            const context: NumberContext = { pokemon, skill: skills[whirlwindId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: Math.round(p(whirlwindId, "tempo", context)), recover: Math.round(p(whirlwindId, "recover", context)),
                cooldown: Math.round(p(whirlwindId, "wait", context)), active: 1, range: p(whirlwindId, "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:move_whirlwind:windup", whirlwindScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", scale: scale, motes: Math.round(p(whirlwindId, "motes", action)) }));
            return prepare;
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: p(whirlwindId, "reach", pokemon), geometry: "line", style: "wind", color: 0xBFE4E8,
                label: config && config.wide ? "吹飞·宽阔风墙" : "吹飞" };
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const origin = body !== null ? body.position() : action.origin();
            let heading = action.targetPosition().minus(origin);
            heading = WorldCombat.point(heading.x(), 0, heading.z());
            if (heading.length() < 0.01) heading = WorldCombat.point(action.direction().x(), 0, action.direction().z());
            const dir = heading.length() < 0.01 ? WorldCombat.point(0, 0, 1) : heading.unit();
            const reach = p(whirlwindId, "reach", action), band = p(whirlwindId, "band", action);
            const front = p(whirlwindId, "front", action), blow = p(whirlwindId, "blow", action);
            const flee = p(whirlwindId, "flee", action), panic = p(whirlwindId, "panic", action);
            const keepOut = p(whirlwindId, "keepOut", action), motes = Math.round(p(whirlwindId, "motes", action));
            const beats = Math.max(1, Math.ceil(reach / front)), step = reach / beats;
            const scale = band / 1.7;
            const hit: { [ref: string]: boolean } = Object.create(null);
            let index = 0, hits = 0;
            function advance(current: CombatAction): void {
                index++;
                const scope = current.world();
                const at = origin.plus(dir.scale(Math.min(reach, index * step)));
                WorldFeedback.keep(scope, "world_combat:move_whirlwind:gust", whirlwindScene, 1, at,
                    { moment: "gust", scale: scale, motes: motes, direction: [dir.x(), 0, dir.z()] }, 20);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, band, { below: 2, above: 3 }), function (target, facts) {
                    const ref = String(target.ref());
                    if (ref === String(actor.ref()) || hit[ref]) return;
                    hit[ref] = true;
                    scope.displace(target, dir.scale(blow));
                    scope.motion(target, WorldCombat.point(dir.x(), 0, dir.z()).scale(blow * 0.45).plus(WorldCombat.point(0, 0.28, 0)), true);
                    whirlwindRoutBody(scope, actor, target, dir, flee, panic, keepOut);
                    WorldFeedback.emit(scope, whirlwindScene, 1, facts.position(),
                        { moment: "rout", target: ref, motes: motes }, 22);
                    const after = scope.observe(target);
                    if (after !== null && partyForceOut(scope, target, partyFeet(after)) !== null)
                        WorldFeedback.text(scope, after.position().plus(WorldCombat.point(0, 1.1, 0)), whirlwindSwitchText, [], 24);
                    hits++;
                });
                if (index >= beats) {
                    if (hits === 0) WorldFeedback.emit(scope, whirlwindScene, 1, origin.plus(dir.scale(reach)), { moment: "miss", scale: scale }, 16);
                    sound(current, hits > 0 ? "cobblemon:move.gust.target" : "cobblemon:move.gust.actor");
                    const above = origin.plus(WorldCombat.point(0, 1.5, 0));
                    if (hits > 0) WorldFeedback.text(scope, above, whirlwindBlowText, [hits], 28);
                    else WorldFeedback.text(scope, above, whirlwindMissText, [], 24);
                    done(current);
                    return;
                }
                current.after(1, advance);
            }
            sound(action, "cobblemon:move.gust.actor");
            WorldFeedback.emit(world, whirlwindScene, 1, origin.plus(dir.scale(0.6)),
                { moment: "launch", scale: scale, motes: motes, direction: [dir.x(), 0, dir.z()] }, 18);
            action.after(1, advance);
        }
    });
}

