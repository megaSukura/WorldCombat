/**
 * 龙尾 / dragontail —— 注册、逐退行为与动作。
 *
 * 核心念头：抡起尾巴在身前扫出一整片扇形，把站在里面的敌人一起抽飞——挨得越近越疼，飞出后失去目标、
 *           被逐出交战圈。本组唯一「带伤害又带范围」的逐退。
 * 一幕半：
 *   起（windup，提交前）：龙鳞色的尾光在身后拢起、地盘微微震动，预告这一扫。
 *   扫（execute，提交后）：以施法者为原点、朝目标方向扫出 reach 格半径、sweep 度的扇形；扇形内每个非友方
 *       活体都挨一记 lash（正对的目标吃满威力，其余的人吃 share 折扣），随后沿背离施法者的方向被弹开 hurl 格、
 *       抛起 lift 格；每个被扫中者打上共享身份 world_combat:status/routed（本单元效果
 *       world_combat:dragontail_routed），并挂上逐退驱动 world_combat:dragontail_rout，之后每 10 刻再被扫开。
 * 与同族分开：龙尾是正面一大片扇形横扫，能一次扫中多人；巴投是抓一个摔到背后；吼叫绕身一圈无伤；吹飞是一条远风道。
 */
namespace PokemonSkills {
    const dragontailBeat = 10;

    /** 位移单次上限 4 格，超出时拆成几步走完。 */
    function dragontailShove(world: CombatWorld, target: CombatActor, dir: CombatPoint, distance: number): void {
        let left = distance, guard = 0;
        while (left > 0.05 && guard++ < 8) {
            const step = Math.min(3.5, left);
            if (world.displace(target, dir.scale(step)) <= 0.01) return;
            left -= step;
        }
    }

    function dragontailRoutBody(world: CombatWorld, caster: CombatActor, target: CombatActor, dir: CombatPoint,
        flee: number, panic: number, keepOut: number): void {
        const duration = Math.max(20, Math.round(flee));
        CombatStatus.apply(world, target, "routed", dragontailRouted, duration);
        world.effect(dragontailRout, target, JSON.stringify({ caster: String(caster.ref()),
            dir: [dir.x(), 0, dir.z()], keepOut: keepOut, panic: panic }), duration);
    }

    WorldCombat.effect(dragontailRout, 1, 400, "actor", function (json: string): string {
        const state = JSON.parse(json);
        if (!state || !Array.isArray(state.dir) || state.dir.length !== 3 || !isFinite(state.keepOut) || !isFinite(state.panic))
            throw new Error("Invalid dragontail rout state");
        return JSON.stringify(state);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(dragontailRout, "start", function (effect: CombatEffect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        world.interrupt(victim, "world_combat:routed");
        world.target(victim, null);
        if (body !== null)
            WorldFeedback.emit(world, dragontailScene, 1, body.position(), { moment: "rout", target: String(victim.ref()) }, 20);
        effect.schedule("surge", "surge", dragontailBeat, "{}");
    });
    WorldCombat.effectHandler(dragontailRout, "surge", function (effect: CombatEffect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const state = JSON.parse(effect.state()), body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        world.target(victim, null);
        const dir = WorldCombat.point(state.dir[0], 0, state.dir[2]);
        const caster = state.caster ? world.actor(state.caster) : null;
        const from = caster !== null ? world.observe(caster) : null;
        let away = dir;
        let distance = 0;
        if (from !== null) {
            const delta = body.position().minus(from.position());
            distance = delta.length();
            if (delta.length() > 0.01) away = WorldCombat.point(delta.x(), 0, delta.z());
        }
        if (away.length() > 0.01 && distance < state.keepOut) {
            world.displace(victim, away.unit().scale(state.panic));
            const after = world.observe(victim);
            if (after !== null)
                WorldFeedback.keep(world, "world_combat:move_dragontail:" + String(victim.ref()), dragontailScene, 1, after.position(),
                    { moment: "flee", target: String(victim.ref()) }, 18);
        }
        effect.schedule("surge", "surge", dragontailBeat, "{}");
    });

    define({
        id: dragontailId,
        cooldownParameter: "recharge",
        name: "龙尾",
        description: "抡起尾巴在身前扫开一大片扇形，把里面的敌人一起抽飞、失去目标、逐出战斗；正对的对手吃最重的一记。",
        uses: ["当面横扫、把一排敌人一起抽开", "在敌人贴身时把它们扫出近身圈", "对单个厚实目标打一击并送走"],
        kind: "enemy",
        range: 3,
        maxRange: 4.5,
        prepare: 10,
        active: 1,
        recover: 8,
        cooldown: 100,
        style: "tail",
        defaults: { high: false, ai: { maxChase: 8, minFoes: 1, leaveStation: false } },
        fields: [flag("high", "高抛")],
        resolve: function (pokemon: CombatPokemon, config: any, world?: CombatWorld | null, actor?: CombatActor | null, attributes?: IndividualAttributes.Context) {
            const context: NumberContext = { pokemon, skill: skills[dragontailId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: Math.round(p(dragontailId, "tempo", context)), recover: Math.round(p(dragontailId, "aftercast", context)),
                cooldown: Math.round(p(dragontailId, "recharge", context)), active: 1, range: p(dragontailId, "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:move_dragontail:windup", dragontailScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", scale: scale, shards: Math.round(p(dragontailId, "shards", action)) }));
            return prepare;
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: p(dragontailId, "reach", pokemon), geometry: "cone", style: "tail", color: 0x7C5CD8,
                label: config && config.high ? "龙尾·高抛" : "龙尾" };
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            const heading = aim(action);
            const reach = p(dragontailId, "reach", action), sweep = p(dragontailId, "sweep", action);
            const hurl = p(dragontailId, "hurl", action), lift = p(dragontailId, "lift", action);
            const flee = p(dragontailId, "flee", action), panic = p(dragontailId, "panic", action);
            const keepOut = p(dragontailId, "keepOut", action), shards = Math.round(p(dragontailId, "shards", action));
            const share = p(dragontailId, "share", action);
            const primary = action.target() !== null ? String(action.target()!.ref()) : "";
            const groundY = body !== null ? centre.y() - body.height() / 2 : centre.y() - 0.7;
            const half = sweep * Math.PI / 360, base = Math.atan2(heading.z(), heading.x()), steps = 9;
            const path: number[][] = [[centre.x(), groundY, centre.z()]];
            for (let index = 0; index <= steps; index++) {
                const angle = base - half + 2 * half * index / steps;
                path.push([centre.x() + Math.cos(angle) * reach, groundY, centre.z() + Math.sin(angle) * reach]);
            }
            let hits = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.sector(centre, heading, reach, sweep, { below: 2, above: 3 }), function (target, facts) {
                const ref = String(target.ref());
                if (ref === String(actor.ref())) return;
                const landed = hurt(action, target, dragontailId, p(dragontailId, "lash", action) * (ref === primary ? 1 : share),
                    { damage: damageSpec(dragontailId, "lash"), contact: true });
                WorldFeedback.emit(world, dragontailScene, 1, facts.position(),
                    { moment: "impact", target: ref, shards: shards, primary: ref === primary ? 1 : 0 }, 24);
                hits++;
                if (!landed || !world.valid(target)) return;
                const away = WorldCombat.point(facts.position().x() - centre.x(), 0, facts.position().z() - centre.z());
                const dir = away.length() < 0.01 ? WorldCombat.point(heading.x(), 0, heading.z()) : away.unit();
                dragontailShove(world, target, dir, hurl);
                world.motion(target, WorldCombat.point(dir.x(), 0, dir.z()).scale(Math.min(2.4, hurl * 0.4)).plus(WorldCombat.point(0, lift, 0)), true);
                dragontailRoutBody(world, actor, target, dir, flee, panic, keepOut);
                const after = world.observe(target);
                if (after !== null && partyForceOut(world, target, partyFeet(after)) !== null)
                    WorldFeedback.text(world, after.position().plus(WorldCombat.point(0, 1.1, 0)), dragontailSwitchText, [], 24);
            });
            WorldFeedback.emit(world, dragontailScene, 1, centre,
                { moment: "sweep", scale: reach / 3, reach: reach, sweep: Math.round(sweep), hits: hits, shards: shards, path: path }, 24);
            if (hits === 0) WorldFeedback.emit(world, dragontailScene, 1, centre, { moment: "miss", scale: reach / 3 }, 16);
            world.sound(hits > 0 ? "cobblemon:impact.dragon" : "cobblemon:move.dragonclaw.actor", centre, 20, "{}");
            const above = centre.plus(WorldCombat.point(0, 1.5, 0));
            if (hits > 0) WorldFeedback.text(world, above, dragontailHitText, [hits], 28);
            else WorldFeedback.text(world, above, dragontailMissText, [], 24);
            done(action);
        }
    });
}

