/**
 * 摇尾巴 / Tail Whip — 执行组织。
 *
 * 核心念头：背向敌人摆开尾巴，尾尖从一侧扫到另一侧、再扫回来——两趟真实尾弧里被扫到、且看得见这条尾巴的
 *   追近者跟着晃神，架势散掉、防御下降。它铺在身后的 120 度扇带里，所以正面冲上来的敌人不会被甩到；
 *   想甩到人，要么先转身把对方放到背后，要么趁对方绕到身后时回身一记。与「瞪眼」身前的一张扇面互补。
 *
 * 两幕：
 *   起（windup 播「转身」，提交前只观察与预告，可被打断，打断不花代价）。
 *   扫（提交后）：提交方向决定身体前向，尾巴覆盖背后 120 度、半径 sweepRadius 的扇带；
 *     尾尖用几刻从一侧扫到另一侧（第一趟），间隔 6 刻后再反扫回来（第二趟，按施法者**当前位置**，不自动转身）。
 *     每一刻只判当刻那段真实子弧（bodyPolygon 三角楔，判定与画面共用同一组端点），撞上就挂共享的
 *     world_combat:tailwhip_wobble（身份 world_combat:status/guardbroken），并用 NativeEffects.boostWindow
 *     把防御下降绑在这份载体上：载体在，降防就在；到期/被清就收回。两趟同一目标只降一次。本招不造成伤害。
 * 视线：尾巴要被看见；被掩体挡住的敌人甩不到。
 * 反制：站到正面、躲到掩体后、或退到扇带之外；它不造成伤害，也拦不住远程。
 */
namespace PokemonSkills {
    function tailwhipAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 扇带的整张角、两扫间隔与几刻一趟是招式自己的形状与节奏；半径才是随体型变化的参数。 */
    const tailwhipArc = 120;
    const tailwhipGap = 6;
    const tailwhipSteps = 6;

    /**
     * 晃神存续的托管载体：把「头顶打转的弧光」绑在真实状态效果的生命周期上，
     * 自然到期、牛奶／`/effect clear` 提前拿掉都随它一起停。
     */
    const tailwhipDazeMark = "world_combat:move_tailwhip/daze_mark";

    function tailwhipDazeWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        if (body === null) { effect.end(); return; }
        const carrier = world.mobEffect(target, tailwhipEffect);
        if (carrier === null) { effect.end(); return; }
        // 本载体就是本 source 创建的托管效果，presentOn 随它一起清理。
        WorldFeedback.onEffect(world, effect.id(), "linger", tailwhipScene, 1, body.position(),
            { moment: "linger", target: String(target.ref()) });
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effect(tailwhipDazeMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid tail whip daze mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(tailwhipDazeMark, "start", tailwhipDazeWatch);
    WorldCombat.effectHandler(tailwhipDazeMark, "watch", tailwhipDazeWatch);
    WorldCombat.effectHandler(tailwhipDazeMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.on("world_combat:move_tailwhip/daze-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tailwhipEffect) return;
        const world = event.world(), actor = event.actor();
        world.effects(actor, tailwhipDazeMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    /** 以 centre 为顶点、朝 heading 张开 arc 度的扇带地面顶点；判定（sector）与表现（path polygon）读同一份形状。 */
    function tailwhipFan(centre: CombatPoint, heading: CombatPoint, reach: number, arc: number): number[][] {
        const base = Math.atan2(heading.z(), heading.x());
        const half = (arc * Math.PI / 180) / 2, steps = 12;
        const vertices: number[][] = [[centre.x(), centre.y(), centre.z()]];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + 2 * half * (i / steps);
            vertices.push([centre.x() + Math.cos(angle) * reach, centre.y(), centre.z() + Math.sin(angle) * reach]);
        }
        return vertices;
    }

    define({
        id: tailwhipId,
        cooldownParameter: "recharge",
        name: "摇尾巴",
        description: "朝撤离方向瞄准、背向敌人把尾巴从一侧扫到另一侧再扫回来：被这趟尾弧扫到、且看得见尾巴的对手晃神、防御下降。要先转身把对方放到背后，正面冲上来的敌人不会被甩到；尾巴要被看见，掩体后甩不到。晃神与降防一同到期，两扫同一目标只降一次。",
        uses: ["被追在身后时回身一记让追兵破防", "为自己撤离时压住身后的威胁", "为队友的物攻打开身后的缺口"],
        kind: "aim",
        range: 3,
        maxRange: 5,
        prepare: 7,
        active: 1,
        recover: 5,
        cooldown: 100,
        style: "wag",
        defaults: {},
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[tailwhipId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(tailwhipId, "tempo", context)),
                recover: p(tailwhipId, "recover", context),
                cooldown: Math.round(p(tailwhipId, "recharge", context)),
                active: 1,
                range: p(tailwhipId, "sweepRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            // 起手就把这次真正会扫到的背后扇带画出来：尾尖会扫过的那块地方，正面的人一眼看出自己不在里面。
            const world = action.sense();
            const self = world.observe(action.actor());
            const origin = self === null ? action.origin() : self.position();
            const radius = Math.max(1.8, Math.min(4.2, p(tailwhipId, "sweepRadius", action)));
            const forward = WorldGeometry.flatUnit(aim(action), action.direction());
            const backward = WorldCombat.point(-forward.x(), 0, -forward.z());
            const feet = origin.y() - (self === null ? 0.7 : self.height() / 2);
            action.present("tailwhip-windup", tailwhipScene, 1, origin,
                JSON.stringify({ moment: "windup", path: tailwhipFan(WorldCombat.point(origin.x(), feet + 0.05, origin.z()), backward, radius, tailwhipArc),
                    direction: [backward.x(), backward.y(), backward.z()], scale: radius / 3,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            // 选择器只画到尾巴半径；实际作用区是施法者背后的 120 度扇带（见描述）。内建的圆/扇面都不会翻到背面。
            return { radius: pokemon ? p(tailwhipId, "sweepRadius", pokemon) : 3, geometry: "circle", style: "wag", color: 0xE0A060, label: "摇尾巴（背后 120°）" };
        },
        execute: function (action, move, config, done) {
            const self = action.actor();
            const radius = Math.max(1.8, Math.min(4.2, p(tailwhipId, "sweepRadius", action)));
            const drop = Math.max(1, Math.min(2, Math.round(p(tailwhipId, "drop", action))));
            const daze = Math.max(60, Math.round(p(tailwhipId, "dazeTicks", action)));
            const arcs = Math.max(14, Math.round(p(tailwhipId, "arcs", action)));
            const scale = radius / 3;
            // 提交方向决定身体前向，尾巴扫的是它的反方向；两趟都用这一次提交定下的朝向。
            const forward = WorldGeometry.flatUnit(aim(action), action.direction());
            const backward = WorldCombat.point(-forward.x(), 0, -forward.z());
            const base = Math.atan2(backward.z(), backward.x());
            const half = tailwhipArc * Math.PI / 360;
            const marks: { [ref: string]: boolean } = Object.create(null);
            const scenes = WorldFeedback.actionScenes(tailwhipScene);
            let caught = 0;
            sound(action, "minecraft:entity.cat.purreow");

            /** 落到一个目标身上：先申请真实载体，被拒就什么都不做；成功才把这级下降交给绑在这份载体上的 boostWindow。 */
            function apply(scope: CombatWorld, target: CombatActor, facts: CombatObservation): number {
                const previous = MobEffects.read(scope, target, tailwhipEffect);
                const carrier = MobEffects.apply(scope, target, tailwhipEffect, daze, 0);
                if (carrier === null) return 0;
                const before = NativeEffects.effectiveStage(scope, target, "def");
                NativeEffects.boostWindow(scope, target, { def: -drop }, Math.max(1, carrier.duration()), "world_combat:move/tailwhip", carrier, previous);
                const dropped = Math.max(0, before - NativeEffects.effectiveStage(scope, target, "def"));
                if (scope.effects(target, tailwhipDazeMark).length === 0)
                    scope.effect(tailwhipDazeMark, target, "{}", Math.max(1, Math.min(2400, daze)));
                if (dropped !== 0) {
                    caught++;
                    WorldFeedback.emit(scope, tailwhipScene, 1, facts.position(),
                        { moment: "mark", target: String(target.ref()), drop: dropped, arcs: arcs, scale: scale }, 26);
                }
                return dropped;
            }

            /** 一趟尾弧：尾尖用 tailwhipSteps 刻从 edgeStart 扫到 edgeEnd，逐刻只判当刻那段真实子弧。 */
            function wave(current: CombatAction, side: number, step: number, last: boolean): void {
                const scope = current.world();
                const live = scope.observe(self);
                if (live === null) { finish(current); return; }
                const centre = live.position(), feet = centre.y() - live.height() / 2;
                const ground = WorldCombat.point(centre.x(), feet + 0.05, centre.z());
                const edgeStart = base + side * half, edgeEnd = base - side * half;
                const a0 = edgeStart + (edgeEnd - edgeStart) * (step / tailwhipSteps);
                const a1 = edgeStart + (edgeEnd - edgeStart) * ((step + 1) / tailwhipSteps);
                const onArc = function (angle: number): number[] {
                    return [ground.x() + Math.cos(angle) * radius, ground.y(), ground.z() + Math.sin(angle) * radius];
                };
                const p0 = onArc(a0), p1 = onArc(a1);
                const vm = onArc((a0 + a1) / 2);
                const v0 = WorldCombat.point(p0[0], p0[1], p0[2]), v1 = WorldCombat.point(p1[0], p1[1], p1[2]);
                const lowY = centre.y() - 1, highY = centre.y() + 2;
                const stepHits = { count: 0 };
                // 判定与画面共用这一片真实子弧的端点：原点到外弧两端张成的三角楔。
                WorldGeometry.selectBodies(scope, WorldGeometry.bodyPolygon([centre, v0, v1], lowY, highY), function (other, facts) {
                    const ref = String(other.ref());
                    if (ref === String(self.ref()) || facts.friendly() || marks[ref]) return;
                    if (!scope.clear(centre, facts.position())) return;
                    marks[ref] = true;
                    if (apply(scope, other, facts) !== 0) stepHits.count++;
                });
                scenes.show(current, "band", ground, {
                    moment: "band", path: tailwhipFan(ground, backward, radius, tailwhipArc),
                    direction: [backward.x(), backward.y(), backward.z()], scale: scale, arcs: arcs, side: side, drop: drop
                });
                scenes.show(current, "swing", centre, {
                    moment: "swing", path: [p0, vm, p1],
                    direction: [backward.x(), backward.y(), backward.z()], side: side,
                    radius: radius, scale: scale, arcs: arcs, drop: drop, hits: stepHits.count
                });
                if (step + 1 < tailwhipSteps) {
                    current.after(1, function (next: CombatAction) { wave(next, side, step + 1, last); });
                    return;
                }
                if (!last) {
                    // 第一趟扫完，间隔 6 刻后再反扫回来；第二趟按当下位置。
                    current.after(Math.max(1, tailwhipGap - (tailwhipSteps - 1)), function (later: CombatAction) {
                        // 停掉上一趟的场景键，第二趟从头建立，尾尖的 moment 才不会被上一趟的计时吃掉。
                        scenes.stop(later);
                        wave(later, -side, 0, true);
                    });
                    return;
                }
                current.after(12, finish);
            }

            function finish(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(self);
                const point = body === null ? current.origin() : body.position();
                if (caught === 0)
                    WorldFeedback.emit(scope, tailwhipScene, 1, point, { moment: "fizzle", scale: scale }, 16);
                WorldFeedback.text(scope, tailwhipAbove(point),
                    caught > 0 ? "world_combat.move.tailwhip.text.sweep" : "world_combat.move.tailwhip.text.empty",
                    caught > 0 ? [caught, drop] : [], 30);
                scenes.finish(current, done);
            }

            wave(action, 1, 0, false);
        }
    });
}
