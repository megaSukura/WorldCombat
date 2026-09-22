/**
 * 巴投 / circlethrow —— 注册、逐退行为与动作。
 *
 * 核心念头：贴身抓住一个对手，借它冲过来的力转身，把它从自己头顶摔过去——落点在施法者的另一侧，
 *           也就是它来的方向的反面；摔完它失去目标、被逐出交战圈。
 * 两幕：
 *   起（windup，提交前）：压低下盘、双手拢起抓握的褐光，预告这一次贴身。
 *   抓与摔（execute，提交后）：贴身抓中目标，吃一记 slam 摔击并立刻打上共享身份
 *       world_combat:status/routed（本单元效果 world_combat:circlethrow_routed）；随后目标沿一条抛物线
 *       被带过施法者头顶，落到背离来向的一侧——这是与龙尾最直接的分别：龙尾是横扫一大片，巴投是把一个
 *       人扔到背后。落地后挂上逐退驱动 world_combat:circlethrow_rout，之后每 10 刻再被摔开。
 * 反制：只对一个目标、必须贴身；对手在你出手瞬间横移出抓取距离就抓空；摔的飞行会被地形挡住。
 */
namespace PokemonSkills {
    const circlethrowBeat = 10;

    function circlethrowRoutBody(world: CombatWorld, caster: CombatActor, target: CombatActor, dir: CombatPoint,
        flee: number, panic: number, keepOut: number): void {
        const duration = Math.max(20, Math.round(flee));
        CombatStatus.apply(world, target, "routed", circlethrowRouted, duration);
        world.effect(circlethrowRout, target, JSON.stringify({ caster: String(caster.ref()),
            dir: [dir.x(), 0, dir.z()], keepOut: keepOut, panic: panic }), duration);
    }

    WorldCombat.effect(circlethrowRout, 1, 400, "actor", function (json: string): string {
        const state = JSON.parse(json);
        if (!state || !Array.isArray(state.dir) || state.dir.length !== 3 || !isFinite(state.keepOut) || !isFinite(state.panic))
            throw new Error("Invalid circle throw rout state");
        return JSON.stringify(state);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(circlethrowRout, "start", function (effect: CombatEffect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        world.interrupt(victim, "world_combat:routed");
        world.target(victim, null);
        if (body !== null)
            WorldFeedback.emit(world, circlethrowScene, 1, body.position(), { moment: "rout", target: String(victim.ref()) }, 20);
        effect.schedule("surge", "surge", circlethrowBeat, "{}");
    });
    WorldCombat.effectHandler(circlethrowRout, "surge", function (effect: CombatEffect) {
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
                WorldFeedback.keep(world, "world_combat:move_circlethrow:" + String(victim.ref()), circlethrowScene, 1, after.position(),
                    { moment: "flee", target: String(victim.ref()) }, 18);
        }
        effect.schedule("surge", "surge", circlethrowBeat, "{}");
    });

    define({
        id: circlethrowId,
        name: "巴投",
        description: "贴身抓住一个对手，借力把它从自己头顶摔到身后，并逐出战斗；摔击造成格斗属性接触伤害。",
        uses: ["把一个扑上来的对手摔到背后", "贴身反击、把对手从自己面前清走", "把厚实目标摔出近身圈并打上一击"],
        kind: "enemy",
        range: 2.8,
        maxRange: 3.8,
        prepare: 11,
        active: 1,
        recover: 9,
        cooldown: 100,
        style: "throw",
        defaults: { tight: false, ai: { maxChase: 7, minFoes: 1, leaveStation: false } },
        fields: [flag("tight", "贴身固投")],
        resolve: function (pokemon: CombatPokemon, config: any, world?: CombatWorld | null, actor?: CombatActor | null, attributes?: IndividualAttributes.Context) {
            const context: NumberContext = { pokemon, skill: skills[circlethrowId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: Math.round(p(circlethrowId, "tempo", context)), recover: Math.round(p(circlethrowId, "aftercast", context)),
                cooldown: Math.round(p(circlethrowId, "recharge", context)), active: 1, range: p(circlethrowId, "grip", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:move_circlethrow:windup", circlethrowScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", scale: scale, rings: Math.round(p(circlethrowId, "rings", action)) }));
            return prepare;
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: p(circlethrowId, "grip", pokemon), geometry: "line", style: "throw", color: 0xD89A6A,
                label: config && config.tight ? "巴投·贴身固投" : "巴投" };
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor);
            if (target === null || self === null || !world.valid(target)) { done(action); return; }
            const grabbed: CombatActor = target;
            const victim = world.observe(grabbed);
            if (victim === null) { done(action); return; }
            const from = victim.position(), centre = self.position();
            let heading = WorldCombat.point(from.x() - centre.x(), 0, from.z() - centre.z());
            if (heading.length() < 0.01) heading = WorldCombat.point(action.direction().x(), 0, action.direction().z());
            if (heading.length() < 0.01) heading = WorldCombat.point(0, 0, 1);
            heading = heading.unit();
            const over = WorldCombat.point(-heading.x(), 0, -heading.z());
            const slam = p(circlethrowId, "slam", action), fling = p(circlethrowId, "fling", action);
            const arc = p(circlethrowId, "arc", action), air = Math.max(2, Math.round(p(circlethrowId, "air", action)));
            const flee = p(circlethrowId, "flee", action), panic = p(circlethrowId, "panic", action);
            const keepOut = p(circlethrowId, "keepOut", action), rings = Math.round(p(circlethrowId, "rings", action));
            const scale = (self.width() + self.height()) / 2.3;
            action.face(from, 20, 20);
            const landed = hurt(action, grabbed, circlethrowId, slam, { damage: damageSpec(circlethrowId, "slam"), contact: true });
            CombatStatus.apply(world, grabbed, "routed", circlethrowRouted, Math.max(20, Math.round(flee)));
            WorldFeedback.emit(world, circlethrowScene, 1, from, { moment: "grip", target: String(grabbed.ref()), rings: rings, scale: scale }, 20);
            world.sound("minecraft:entity.player.attack.strong", from, 16, "{}");
            if (!landed) {
                WorldFeedback.emit(world, circlethrowScene, 1, from, { moment: "miss", scale: scale }, 16);
                WorldFeedback.text(world, from.plus(WorldCombat.point(0, 1.2, 0)), circlethrowMissText, [], 24);
                done(action);
                return;
            }
            const to = WorldCombat.point(centre.x() + over.x() * fling, from.y(), centre.z() + over.z() * fling);
            let step = 0;
            function fly(current: CombatAction): void {
                step++;
                const scope = current.world(), now = scope.observe(grabbed);
                if (now === null) { done(current); return; }
                const t = Math.min(1, step / air);
                const at = from.plus(to.minus(from).scale(t)).plus(WorldCombat.point(0, arc * 4 * t * (1 - t), 0));
                scope.displace(grabbed, at.minus(now.position()));
                WorldFeedback.keep(scope, "world_combat:move_circlethrow:fly", circlethrowScene, 1, at,
                    { moment: "throw", target: String(grabbed.ref()), rings: rings, scale: scale, phase: Math.round(t * 100) / 100 }, 14);
                if (step >= air) {
                    const after = scope.observe(grabbed);
                    if (after !== null) {
                        WorldFeedback.emit(scope, circlethrowScene, 1, after.position(),
                            { moment: "land", target: String(grabbed.ref()), rings: rings, scale: scale }, 22);
                        scope.sound("minecraft:entity.player.attack.strong", after.position(), 16, "{}");
                        circlethrowRoutBody(scope, actor, grabbed, over, flee, panic, keepOut);
                        if (partyForceOut(scope, grabbed, partyFeet(after)) !== null)
                            WorldFeedback.text(scope, after.position().plus(WorldCombat.point(0, 1.1, 0)), circlethrowSwitchText, [], 24);
                    }
                    done(current);
                    return;
                }
                current.after(1, fly);
            }
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.5, 0)), circlethrowThrowText, [], 24);
            action.after(1, fly);
        }
    });
}



