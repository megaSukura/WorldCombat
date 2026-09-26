/**
 * 摇尾巴 / Tail Whip — 执行组织。
 *
 * 核心念头：背向敌人摆开尾巴，左右两扫——看得见这条尾巴的追近者跟着晃神，架势散掉、防御下降。它铺在
 *   身后的 120 度扇带里，所以正面冲上来的敌人不会被甩到；想甩到人，要么先转身把对方放到背后，要么趁对方
 *   绕到身后时回身一记。与「瞪眼」身前的一张扇面互补，一个补正面、一个补后背。
 *
 * 两幕：
 *   起（windup 播「转身」，提交前只观察与预告，可被打断，打断不花代价）。
 *   扫（提交后）：提交方向决定身体前向，尾巴覆盖背后 120 度、半径 sweepRadius 的扇带；
 *     第一扫在提交当刻，第二扫间隔 6 刻、按施法者**当前位置**再扫一次（允许原生移动，不自动转身追人）。
 *     两扫同一目标只降一次防；扇内看得见的非友方逐个挂共享的 world_combat:tailwhip_wobble
 *     （身份 world_combat:status/guardbroken）并下降防御，本招不造成伤害。
 * 视线：尾巴要被看见；被掩体挡住的敌人甩不到。
 * 反制：站到正面、躲到掩体后、或退到扇带之外；它不造成伤害，也拦不住远程。
 */
namespace PokemonSkills {
    function tailwhipAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 扇带的整张角和两扫间隔是招式自己的形状与节奏；半径才是随体型变化的参数。 */
    const tailwhipArc = 120;
    const tailwhipGap = 6;

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
        description: "背向敌人把尾巴左右甩开两扫，让身后 120 度扇带里看得见这条尾巴的对手晃神、降低防御。要先转身把对方放到背后，正面冲上来的敌人不会被甩到；尾巴要被看见，掩体后甩不到。",
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
            action.present("tailwhip-windup", tailwhipScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(tailwhipId, "sweepRadius", pokemon) : 3, geometry: "circle", style: "wag", color: 0xE0A060, label: "摇尾巴" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const radius = Math.max(1.8, Math.min(4.2, p(tailwhipId, "sweepRadius", action)));
            const drop = Math.max(1, Math.min(2, Math.round(p(tailwhipId, "drop", action))));
            const daze = Math.max(60, Math.round(p(tailwhipId, "dazeTicks", action)));
            const arcs = Math.max(14, Math.round(p(tailwhipId, "arcs", action)));
            // 提交方向决定身体前向，尾巴扫的是它的反方向；两扫都用这一次提交定下的朝向。
            const forward = WorldGeometry.flatUnit(aim(action), action.direction());
            const backward = WorldCombat.point(-forward.x(), 0, -forward.z());
            const scale = radius / 3;
            const marks: { [ref: string]: boolean } = Object.create(null);
            const scenes = WorldFeedback.actionScenes(tailwhipScene);
            let caught = 0;
            sound(action, "minecraft:entity.cat.purreow");

            function wave(current: CombatAction, side: number, last: boolean): void {
                const scope = current.world();
                const body = scope.observe(self);
                if (body === null) { if (last) scenes.finish(current, done); return; }
                const centre = body.position(), feet = centre.y() - body.height() / 2;
                const ground = WorldCombat.point(centre.x(), feet + 0.05, centre.z());
                const path = tailwhipFan(ground, backward, radius, tailwhipArc);
                const region = WorldGeometry.sector(centre, backward, radius, tailwhipArc, { below: 1, above: 2 });
                let hits = 0;
                WorldGeometry.select(scope, region, function (actor, facts) {
                    if (facts.friendly() || marks[String(actor.ref())]) return;
                    if (!scope.clear(centre, facts.position())) return;
                    marks[String(actor.ref())] = true;
                    MobEffects.apply(scope, actor, tailwhipEffect, daze, 0);
                    if (scope.effects(actor, tailwhipDazeMark).length === 0)
                        scope.effect(tailwhipDazeMark, actor, "{}", Math.max(1, Math.min(2400, daze)));
                    // 只有防御真的掉下去的目标才亮晃动护甲线；免疫或已到底线只留身份。
                    if (NativeEffects.boost(scope, actor, "def", -drop) === 0) return;
                    hits++; caught++;
                    WorldFeedback.emit(scope, tailwhipScene, 1, facts.position(),
                        { moment: "mark", target: String(actor.ref()), drop: drop, arcs: arcs, scale: scale }, 26);
                });
                const key = side > 0 ? "side-right" : "side-left";
                scenes.show(current, key, centre, {
                    moment: "swing", path: path, direction: [backward.x(), backward.y(), backward.z()],
                    radius: radius, scale: scale, arcs: arcs, side: side, drop: drop, hits: hits,
                    tailX: -forward.x() * 0.7, tailZ: -forward.z() * 0.7
                });
                if (!last) {
                    current.after(tailwhipGap, function (later: CombatAction) {
                        scenes.stop(later, key);
                        wave(later, -side, true);
                    });
                    return;
                }
                current.after(12, function (finishing: CombatAction) {
                    const point = finishing.origin();
                    if (caught === 0)
                        WorldFeedback.emit(finishing.world(), tailwhipScene, 1, point, { moment: "fizzle", scale: scale }, 16);
                    WorldFeedback.text(finishing.world(), tailwhipAbove(point),
                        caught > 0 ? "world_combat.move.tailwhip.text.sweep" : "world_combat.move.tailwhip.text.empty",
                        caught > 0 ? [caught, drop] : [], 30);
                    scenes.finish(finishing, done);
                });
            }

            wave(action, 1, false);
        }
    });
}
