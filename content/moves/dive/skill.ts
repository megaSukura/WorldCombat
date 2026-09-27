/**
 * 潜水 / Dive — 世界内的动作。
 *
 * 核心念头：先沉进真实的水里，让一道水痕贴着水面替你走完最后一段路；水痕到哪儿，人就从那儿窜出来，把挡在
 * 水缘上的第一个目标顶上天。喊出口的不是伤害数字，是"水痕正朝我脚边来"这条可读、可躲的线。
 *
 * 节奏（共享节奏）：windup 播放下潜预告（水面翻涌），可免费打断；提交前先核实脚下是容得下身体的真实水体。
 * 提交后本体先下沉，再沿一条最多现射程的连通水路逐段做真实碰撞移动（每步都用真实流体与完整身体箱检查），
 * 到可落脚的水缘或锁定点；末端沿真实出水短段窜出，首个挡在前面的敌人吃一记物理伤害并被顶飞、推开。
 *
 * 反制：落点在下潜那一刻锁死——可以锁实体，也可以锁一个空点。本体只走真实连通的水路：水路被墙或断崖截停、
 * 目标退到锁定半径之外，窜出的一击就会落空；失败时留在实际水内安全点，不瞬移补齐。空点瞄准只做真实换位。
 *
 * 对象覆盖：伤害走 hurt（宝可梦、原版生物、其他模组生物、玩家同一条路），位移走 hitDisplace（原生受击位移，
 * 抗性由原生结算）。
 * 非战斗：在水里下潜会浇灭自己身上的灼伤；窜出命中会把目标身上的火一起浇灭。不再留下常驻涌泉。
 */
namespace PokemonSkills {
    const DIVE_SCENE = "world_combat:move_dive";

    function diveAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    interface DiveRoute { entry: CombatPoint; end: CombatPoint; surface: CombatPoint | null; exit: CombatPoint | null; waterOnly: boolean; }
    function diveFreePath(world: CombatWorld, body: CombatObservation, from: CombatPoint, to: CombatPoint): boolean {
        const delta = to.minus(from), count = Math.max(1, Math.ceil(delta.length() / .2));
        for (let i = 0; i <= count; i++) if (!world.freeSpace(from.plus(delta.scale(i / count)), body.width(), body.height())) return false;
        return true;
    }
    /** 有限直水路；完整身体不能再进水时留在最后一个真实可容位置。 */
    function diveRoute(world: CombatWorld, body: CombatObservation, landing: CombatPoint, range: number, waterOnly: boolean): DiveRoute | null {
        const entry = diveEntry(world, body);
        if (entry === null) return null;
        const delta = waterOnly ? landing.minus(WorldCombat.point(0, body.height() / 2, 0)).minus(entry)
            : WorldCombat.point(landing.x() - entry.x(), 0, landing.z() - entry.z());
        const length = Math.min(range, delta.length()), direction = delta.length() > .001 ? delta.unit() : WorldCombat.point(0, 0, 0);
        let end = entry;
        for (let step = 1; step <= Math.ceil(length / .2); step++) {
            const next = entry.plus(direction.scale(Math.min(length, step * .2)));
            if (!diveWaterVolume(world, body, next)) break;
            end = next;
        }
        const surface = diveWaterSurface(world, end.plus(WorldCombat.point(0, body.height() / 2, 0)), body.height() + 1.8);
        let exit: CombatPoint | null = null;
        if (!waterOnly && surface !== null) {
            const above = WorldCombat.point(end.x(), surface.y() + .3, end.z());
            if (diveFreePath(world, body, end, above)) {
                exit = above;
                const remaining = WorldCombat.point(landing.x() - end.x(), 0, landing.z() - end.z());
                if (remaining.length() > .01) {
                    const step = Math.min(1.8, remaining.length(), Math.max(0, range - end.minus(entry).length()));
                    const forward = above.plus(remaining.unit().scale(step));
                    const support = SurfacePaths.support(world, forward, .1, 1.8);
                    const backToWater = diveWaterBlock(world, forward.minus(WorldCombat.point(0, .4, 0)));
                    if ((support !== null || backToWater) && diveFreePath(world, body, above, forward)) exit = forward;
                }
            }
        }
        return { entry: entry, end: end, surface: surface, exit: exit, waterOnly: waterOnly };
    }
    /** AI 与执行共享水路/净空事实；没有安全出水点时把攻击机会交给其他招。 */
    export function diveExitAvailable(world: CombatWorld, actor: CombatActor, target: CombatActor, range: number): boolean {
        const body = world.observe(actor), foe = world.observe(target);
        if (!body || !foe) return false;
        const route = diveRoute(world, body, foe.position(), range, false);
        if (!route || !route.exit) return false;
        const centre = route.exit.plus(WorldCombat.point(0, body.height() / 2, 0));
        return world.closestPoint(target, centre).minus(centre).length() <= Math.max(.3, body.width() / 2 + .4);
    }

    define({
        freeMovement: true,
        id: "dive", name: "潜水",
        description: "只在容得下身体的真实水体里下潜：本体先下沉，再沿一条最多现射程的连通水路逐段做真实碰撞移动，到水缘或锁定点后沿真实出水短段窜出——首个挡在前面的敌人挨一记物理伤害、被向上顶飞并推开，并浇灭它身上的火。水路被墙或断崖截停、目标在水路到达前退到锁定半径外都会扑空，失败时留在实际水内安全点；锁定空点只做真实换位。水里的加成只在水中成立，软地不再算深潜。",
        uses: ["借真实水道绕后突袭", "下水隐蔽接近，再从水缘窜出", "在水中突进并用窜出打断对手"],
        kind: "aim", range: 12, maxRange: 16, active: 6, recover: 10, cooldown: 46, style: "water-dive",
        maximumTicks: 160,
        defaults: { deep: true },
        fields: [field(pathOf("deep"), "深潜", "boolean", { help: "开启：下潜更久、水路更长、威力与顶飞更高、冷却更长；关闭（急袭）：射程更短、威力更低，但下潜与冷却都快。只在水里成立。" })],
        indicator: function (config, pokemon) {
            return { radius: p("dive", "lockRadius", pokemon), geometry: "line", style: "water-dive",
                label: diveDeep(config) ? "深潜突袭" : "急袭" };
        },
        resolve: function (pokemon, config, world, actor) {
            var context: NumberContext = { pokemon, skill: skills["dive"], detail: { values: config }, world: world || null, actor: actor || null };
            var deep = diveDeep(config), submerged = diveSubmerged(world, actor);
            var range = deep ? (submerged ? 15 : 7) : (submerged ? 10 : 6);
            return { prepare: p("dive", "submergeTicks", context), recover: p("dive", "recover", context) + (deep ? 2 : -4),
                cooldown: p("dive", "cooldown", context) + (deep ? 12 : -8), active: skills["dive"].active, range: range };
        },
        ready: function (action) {
            // 只在容得下身体的真实水体里才能下潜；没有水或水位不够就明确不能潜，不花 PP。
            return diveSubstantial(action.sense(), action.actor()) ? "" : "no-water";
        },
        windup: function (action, config) {
            var body = action.sense().observe(action.actor());
            var wet = !!body && body.wet();
            const surface = body === null ? null : diveWaterSurface(action.sense(), body.position(), body.height() + 1.8);
            const at = surface || (body ? body.position() : action.origin());
            action.present("dive:submerge", DIVE_SCENE, 1, at,
                JSON.stringify({ moment: "submerge", point: LivingActions.coordinates(at), target: String(action.actor().ref()), wet: wet ? 1 : 0, deep: diveDeep(config) ? 1 : 0 }));
            return p("dive", "submergeTicks", action);
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const target = action.target(), landing = action.targetPosition(), deep = diveDeep(config);
            const submerged = diveSubmerged(world, actor), waterOnly = target === null && diveWaterBlock(world, landing);
            const route = diveRoute(world, body, landing, action.range(), waterOnly);
            if (route === null) { done(action); return; }
            action.releaseTarget();
            const factor = submerged ? 1 + p("dive", "waterBonus", action) : 1;
            const power = p("dive", "power", action) * factor, launch = p("dive", "launch", action) * factor;
            const push = p("dive", "push", action) * factor * (deep ? 1.1 : .85);
            const radius = Math.max(.2, Math.min(1, p("dive", "collisionRadius", action)));
            const lock = p("dive", "lockRadius", action), surge = Math.max(.6, p("dive", "surgeSpeed", action));
            const scenes = WorldFeedback.actionScenes(DIVE_SCENE);
            let finished = false, struck = false, emerged = false, travelled = 0;
            if (submerged && CombatStatus.cure(world, actor, "burn")) {
                WorldFeedback.emit(world, DIVE_SCENE, 1, body.position(), { moment: "douse", target: String(actor.ref()) }, 24);
                WorldFeedback.text(world, diveAbove(body.position()), "world_combat.move.dive.text.douse", [], 24);
            }
            function finish(current: CombatAction): void {
                if (finished) return;
                finished = true; scenes.finish(current, done);
            }
            function underwater(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(actor);
                if (me !== null) {
                    const wet = diveWaterBlock(scope, me.position());
                    WorldFeedback.emit(scope, DIVE_SCENE, 1, me.position(), { moment: wet ? "underwater" : "whiff", point: LivingActions.coordinates(me.position()) }, 16);
                    WorldFeedback.text(scope, diveAbove(me.position()), wet ? "world_combat.move.dive.text.underwater" : "world_combat.move.dive.text.whiff", [], 24);
                }
                finish(current);
            }
            function wake(current: CombatAction, me: CombatObservation): void {
                const surface = diveWaterSurface(current.world(), me.position(), me.height() + 1.8);
                if (surface === null) { scenes.stop(current, "wake"); return; }
                scenes.show(current, "wake", surface, { moment: "wake", point: LivingActions.coordinates(surface),
                    progress: Math.min(1, travelled / Math.max(.1, route!.end.minus(route!.entry).length())) });
            }
            function splash(current: CombatAction): void {
                if (emerged || route!.surface === null) return;
                const scope = current.world(), me = scope.observe(actor);
                if (!me || me.boundsMax().y() <= route!.surface.y() + .02) return;
                emerged = true;
                const point = WorldCombat.point(me.position().x(), route!.surface.y(), me.position().z());
                WorldFeedback.emit(scope, DIVE_SCENE, 1, point,
                    { moment: "surface", point: LivingActions.coordinates(point), deep: deep ? 1 : 0 }, 26);
                scope.sound("minecraft:entity.generic.splash", point, 16, "{}");
            }
            function contact(current: CombatAction, hit: CombatImpact): void {
                if (struck || target === null) return;
                const scope = current.world(), victim = hit.target();
                const aimed = scope.valid(target) ? scope.observe(target) : null;
                if (!aimed || aimed.position().minus(landing).length() > lock || victim === null || !scope.valid(victim) || scope.friendly(victim)) return;
                struck = true;
                if (!impact(current, hit, "dive", power, { damage: damageSpec("dive", "power"), contact: true })) return;
                if (!scope.valid(actor)) { finished = true; return; }
                const at = hit.position(), me = scope.observe(actor);
                const delta = me === null ? WorldCombat.point(0, 0, 0) : at.minus(me.position());
                const flat = WorldCombat.point(delta.x(), 0, delta.z());
                const away = flat.length() > .01 ? flat.unit() : WorldCombat.point(0, 0, 0);
                if (scope.valid(victim)) {
                    scope.hitDisplace(victim, WorldCombat.point(0, launch, 0).plus(away.scale(push)));
                    if (CombatStatus.cure(scope, victim, "burn"))
                        WorldFeedback.emit(scope, DIVE_SCENE, 1, at, { moment: "douse", target: String(victim.ref()) }, 22);
                }
                WorldFeedback.emit(scope, DIVE_SCENE, 1, at,
                    { moment: "impact", target: String(victim.ref()), scale: radius / .5 }, 28);
                WorldFeedback.text(scope, diveAbove(at), "world_combat.move.dive.text.hit", [Math.round(power)], 30);
            }
            // 先沉入、实际水路、上浮到水面下沿，再走独立的真实出水短段；水路接触不结算攻击。
            const goals = [route.entry, route.end];
            if (route.exit !== null && route.surface !== null) {
                goals.push(WorldCombat.point(route.end.x(), route.surface.y() - body.height() - .02, route.end.z()));
                goals.push(WorldCombat.point(route.end.x(), route.surface.y() + .3, route.end.z()));
                goals.push(route.exit);
            }
            function advance(current: CombatAction, phase: number): void {
                if (finished) return;
                const scope = current.world(), me = scope.observe(actor);
                if (me === null) { finish(current); return; }
                if (phase >= goals.length) {
                    if (!emerged) { underwater(current); return; }
                    if (!struck && target !== null) WorldFeedback.text(scope, diveAbove(me.position()), "world_combat.move.dive.text.whiff", [], 24);
                    finish(current); return;
                }
                const goal = goals[phase];
                let left = phase === 1 ? surge : .6;
                for (let sample = 0; sample < 24 && left > .001; sample++) {
                    const here = scope.observe(actor);
                    if (here === null) { finish(current); return; }
                    const feet = diveFeet(here), delta = goal.minus(feet);
                    if (delta.length() <= .035) { current.after(1, next => advance(next, phase + 1)); return; }
                    const amount = Math.min(.2, left, delta.length()), step = delta.unit().scale(amount), desired = feet.plus(step);
                    if (!scope.freeSpace(desired, here.width(), here.height())
                        || (phase === 1 || phase === 2) && !diveWaterVolume(scope, here, desired)) { underwater(current); return; }
                    if (phase >= 3) {
                        const swept = sweepStep(current, step, radius);
                        if (swept.hit.hitEntity() && swept.remaining.length() > .001) scope.displace(actor, swept.remaining);
                        const risen = scope.observe(actor);
                        if (swept.hit.hitEntity() && risen !== null && route!.surface !== null
                            && risen.boundsMax().y() > route!.surface.y() + .02 && diveFeet(risen).minus(feet).length() > .001)
                            contact(current, swept.hit);
                        if (finished) return;
                    } else scope.displace(actor, step);
                    const after = scope.observe(actor);
                    if (after === null) { finish(current); return; }
                    const moved = diveFeet(after).minus(feet).length();
                    travelled += phase === 1 ? moved : 0;
                    if (phase >= 3) splash(current);
                    if (moved < amount - .025) { underwater(current); return; }
                    left -= moved;
                }
                const now = scope.observe(actor);
                if (now !== null) wake(current, now);
                scope.motion(actor, WorldCombat.point(0, 0, 0), false);
                current.after(1, next => advance(next, phase));
            }
            wake(action, body);
            advance(action, 0);
        }
    });
}
