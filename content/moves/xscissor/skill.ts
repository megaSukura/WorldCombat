/**
 * 十字剪 / xscissor 的出手方式。
 *
 * 核心念头：两把镰刀从身体左右张开，在一个短合拢窗里同时相向旋转，刀尖越过中线、真正交错成一剪。
 * 夹口每刻都朝前张开一条窄带，扫到的目标各被剪一次；合剪窄而深（带 sever），开剪宽而快。
 * 没有先后两拍、也没有同目标第二下——玩家关心的是把目标框进夹口、还是在合拢前被横向闪开。
 *
 * 两幕：
 *   起（windup，提交前）：双臂向两侧张开、刃口集光，只播预告。
 *   合（execute → 逐刻刃姿、clip 命中、miss 空剪）：提交后在 `closing` 刻里两片刃同时从
 *       O+F*reach±jaw 收向中线并越线；每刻按相邻两姿势扫过的小三角形与真实身体盒相交，两片刃共享同一
 *       命中集合，每个目标只结算一次 `cut`。哪片刃撞上墙就截到哪个面，墙后的目标剪不到。合拢结束直接收招。
 *       每刻把两把刃当刻的精确端点（和服务端判定同一条刃段）交给自定义客户端场景画稳定主体，粒子只留极短余痕。
 *
 * 与同族分开：十字劈是竖向先后两拍压点，十字毒刃是同刻截面 X 精度，劈开是慢而准的单点重劈；
 * 十字剪是横向同时连续合拢、每敌一次。
 *
 * 选取 kind: "aim"：可点任意阵营实体，也可只朝一个方向／世界点空剪，空剪也可读。
 */
namespace PokemonSkills {
    /** 面向 heading 时的水平右轴。 */
    function xscissorLateral(heading: CombatPoint): CombatPoint {
        return WorldCombat.point(-heading.z(), 0, heading.x());
    }

    /** 一段刃的两个世界顶点，供判定与表现读同一组位置。 */
    function xscissorEdge(from: CombatPoint, to: CombatPoint): number[][] {
        return [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]];
    }

    /** 把刃的外端裁到最先撞到的方块面：墙截住哪片刃，那片刃就只画、只判到这里。 */
    function xscissorClip(world: CombatWorld, grip: CombatPoint, tip: CombatPoint): CombatPoint {
        const hit = WorldGeometry.blockHit(world,grip, tip);
        if (hit !== null && hit.blocked()) {
            return hit.position();
        }
        return tip;
    }

    define({
        id: xscissorId,
        cooldownParameter: "recharge",
        name: "X-Scissor",
        description: "两把镰刀从身体左右同时合拢成一剪：夹口每刻朝前扫过一条窄带，站在夹口里的目标各被剪一次。合剪形态收窄夹口、剪得更深也更慢；开剪形态张得更宽、起手与冷却更短。可以点敌人，也可以只朝一个方向空剪。",
        uses: ["两刃同时合拢的一剪、剪中夹口里的目标", "把身前并排的敌人一剪带过", "横向收口，逼走位或补最后一下"],
        kind: "aim",
        range: 2.5,
        maxRange: 3.1,
        prepare: 7,
        active: 22,
        recover: 7,
        cooldown: 26,
        style: "slash",
        defaults: { scissor: true, ai: { maxChase: 5, crowd: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(xscissorId, "reach", pokemon), geometry: "cone", style: "slash", color: 0xB6D45A,
                label: config && config.scissor === false ? "开剪" : "合剪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[xscissorId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(xscissorId, "tempo", context)),
                recover: Math.round(p(xscissorId, "aftercast", context)),
                cooldown: Math.round(p(xscissorId, "recharge", context)),
                active: skills[xscissorId].active,
                range: p(xscissorId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const right = xscissorLateral(WorldGeometry.flatUnit(aim(action), action.direction())).scale(0.45);
            action.present("world_combat:move_xscissor:windup", xscissorScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, scissors: config && config.scissor !== false,
                    left: [-right.x(), 0.4, -right.z()], right: [right.x(), 0.4, right.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            // 锁定的前向：合拢过程中朝向不再重读，夹口才是玩家看到的那一个。
            action.releaseTarget();
            const scenes = WorldFeedback.actionScenes(xscissorScene);
            const xscissorBladeScene = "world_combat:move_xscissor/blade";
            const closed = !(config && config.scissor === false);
            const reach = Math.max(2.0, p(xscissorId, "reach", action));
            const arm = Math.max(0.25, p(xscissorId, "arm", action));
            const span = Math.max(30, Math.min(180, p(xscissorId, "span", action)));
            const closing = Math.max(4, Math.min(30, Math.round(p(xscissorId, "closing", action))));
            const cut = p(xscissorId, "cut", action);
            const sever = closed ? Math.max(0, p(xscissorId, "sever", action)) : 0;
            const power = cut * (1 + sever);
            const heading = WorldGeometry.flatUnit(aim(action), action.direction());
            const lateral = xscissorLateral(heading);
            const jaw = Math.max(arm + 0.15, reach * Math.sin(span * Math.PI / 360));
            const scale = Math.max(0.5, Math.min(2.2, jaw / xscissorReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 40));
            const selfRef = String(actor.ref());
            const struck: { [ref: string]: boolean } = Object.create(null);
            let hits = 0, settled = false;

            sound(action, "cobblemon:impact.bug");

            function contact(scope: CombatWorld, current: CombatAction, victim: CombatActor, ref: string, point: CombatPoint): void {
                if (struck[ref]) return;
                struck[ref] = true;
                const where = scope.closestPoint(victim, point);
                if (!hurt(current, victim, xscissorId, power,
                    { damage: damageSpec(xscissorId, "cut"), contact: true, slice: true })) return;
                hits++;
                WorldFeedback.emit(scope, xscissorScene, 1, where,
                    { moment: "clip", target: ref, cut: power, sparks: Math.max(4, Math.min(24, Math.round(power * 0.5))),
                        scale: scale, intensity: intensity }, 18);
                scope.sound("minecraft:item.trident.hit", where, 12, "{}");
            }

            function finish(current: CombatAction, origin: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                // 收回当刻精确刃的客户端画面，避免收招阶段留下静态的旧 X。
                current.present("xscissor:blade", xscissorBladeScene, 1, origin,
                    JSON.stringify({ moment: "blade", lifecycle: { reason: "settled", tick: current.sense().tick() } }));
                if (hits === 0) {
                    WorldFeedback.emit(scope, xscissorScene, 1, origin.plus(heading.scale(reach * 0.5)),
                        { moment: "miss", scale: scale, intensity: intensity }, 18);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), xscissorMissText, [], 22);
                }
                scenes.finish(current, done);
            }

            function step(current: CombatAction, index: number): void {
                const scope = current.world();
                const observed = scope.observe(actor);
                if (observed === null) { finish(current, current.origin()); return; }
                const origin = observed.position(), plane = origin.plus(WorldCombat.point(0, 0.25, 0));
                const gripL = xscissorClip(scope,plane,plane.minus(lateral.scale(arm)));
                const gripR = xscissorClip(scope,plane,plane.plus(lateral.scale(arm)));
                const t0 = index / closing, t1 = (index + 1) / closing;
                const xL0 = -jaw + 2 * jaw * t0, xL1 = -jaw + 2 * jaw * t1;
                const xR0 = jaw - 2 * jaw * t0, xR1 = jaw - 2 * jaw * t1;
                const forward = plane.plus(heading.scale(reach));
                const tipL0 = xscissorClip(scope, gripL, forward.plus(lateral.scale(xL0)));
                const tipL1 = xscissorClip(scope, gripL, forward.plus(lateral.scale(xL1)));
                const tipR0 = xscissorClip(scope, gripR, forward.plus(lateral.scale(xR0)));
                const tipR1 = xscissorClip(scope, gripR, forward.plus(lateral.scale(xR1)));

                function sweep(grip: CombatPoint, from: CombatPoint, to: CombatPoint): void {
                    const halfThickness=Math.max(.12,arm*.25);
                    const region = WorldGeometry.bodyPolygon([grip, from, to], plane.y()-halfThickness,plane.y()+halfThickness);
                    WorldGeometry.selectBodies(scope, region, function (victim: CombatActor) {
                        const ref = String(victim.ref());
                        if (ref === selfRef || struck[ref] || scope.friendly(victim)) return;
                        if(WorldGeometry.blockHit(scope,grip,scope.closestPoint(victim,grip)))return;
                        contact(scope, current, victim, ref, to);
                    });
                }
                sweep(gripL, tipL0, tipL1);
                sweep(gripR, tipR0, tipR1);

                const leftPath = xscissorEdge(gripL, tipL1), rightPath = xscissorEdge(gripR, tipR1);
                // 稳定主体：把两条当刻精确刃（判定用的同一组端点）交给客户端自定义场景画线/贴图。
                current.present("xscissor:blade", xscissorBladeScene, 1, origin,
                    JSON.stringify({ moment: "blade", left: leftPath, right: rightPath, cut: cut, scale: scale,
                        intensity: intensity }));
                // 粒子只作极短余痕，不再是主体。
                const motes = Math.max(6, Math.min(20, Math.round(power * 0.3)));
                scenes.show(current, "blade_left", origin,
                    { moment: "blade_left", path: leftPath, motes: motes, scale: scale, intensity: intensity, side: -1 });
                scenes.show(current, "blade_right", origin,
                    { moment: "blade_right", path: rightPath, motes: motes, scale: scale, intensity: intensity, side: 1 });

                if (index + 1 < closing) { current.after(1, function (next: CombatAction) { step(next, index + 1); }); return; }
                finish(current, origin);
            }

            step(action, 0);
        }
    });
}
