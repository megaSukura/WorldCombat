/**
 * 疾速转轮 / spinout 的出手方式。
 *
 * 核心念头：**过度旋转的甩尾滑旋**——压低重心、双脚摩擦地面冒出火星，前半按释放方向滑出，后半沿玩家选定的
 *   左／右方向甩尾偏转约 `turn` 度；这是唯一会移动的招式，冲势发出后不再追敌。撞实一记重击并把目标撞开，
 *   转势收不住、腿被反噬，速度按实际事实下降 2 级；空冲不付这份代价。
 *
 * 三幕（提交前只播预告）：
 *   起（wind）：压腿、重心往下沉，脚边火星先转起来，只播预告。
 *   旋（charge → spin → impact/miss）：提交后沿释放方向逐刻 `sweepStep` 真实推进；前半直线，后半按配置的
 *       左／右偏好逐刻转弯（由准心侧向／`side` 配置明确决定），身体朝向与短火花都跟着真实弯曲的路径；首碰
 *       实体才结算一次 `spin` 接触伤害并按冲击方向撞开 `knock`，撞墙或冲满则收势、不补伤。
 *   滞（stagger）：只有撞实才按实际事实降速；空冲只留一路空转的火星。
 *
 * 与同族分开：狂舞挥打是原地转整圈的覆盖、臂锤/冰锤是原地过顶单体重砸；疾速转轮是唯一贴地甩尾滑旋、
 *   命中后自身速度降 2 级、空冲不减速的移动招式。
 *
 * 配置 `preload`／`side` 由公式与执行共同决定；提交后才触碰世界。
 */
namespace PokemonSkills {
    const spinoutScene = "world_combat:move_spinout";
    const spinoutStaggerText = "world_combat.move.spinout.text.stagger";
    const spinoutMissText = "world_combat.move.spinout.text.miss";

    define({
        freeMovement: true,
        id: "spinout",
        cooldownParameter: "recharge",
        name: "Spin Out",
        description: "压低重心、双脚磨地冒火星，前半按瞄准方向贴地滑出，后半向选定的左／右一侧甩尾偏转，拖出一道真实弯曲的短轮痕：首碰实体打出一记高额单发并按冲势把它撞开，撞击点磨出一圈痕；转势收不住，自身速度按实际事实大幅下降。冲势发出后不再追敌，撞墙或空冲不收代价。预旋式先原地打转蓄势，冲得更远更重，代价是起手与冷却更长。",
        uses: ["贴地甩尾滑进一个目标，打出高额单发", "用弯曲的冲势把目标撞开、自己转向下一处", "用一次最贵的自我减速换掉关键目标，或空冲做有限侧向机动"],
        kind: "aim",
        range: 3.0,
        maxRange: 5.2,
        prepare: 10,
        active: 0,
        recover: 12,
        cooldown: 40,
        maximumTicks: 240,
        style: "spindash",
        defaults: { preload: false, side: "right", ai: { maxChase: 8, finish: true } },
        fields: [choice("side", "甩尾方向", ["right", "left"], ["向右", "向左"])],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("spinout", "reach", pokemon) : 3.0, geometry: "line", style: "spindash",
                color: 0x6E7C8C, label: config && config.preload === true ? "预旋式" : "即转式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["spinout"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("spinout", "tempo", context)),
                recover: Math.round(p("spinout", "aftercast", context)),
                cooldown: Math.round(p("spinout", "recharge", context)),
                active: 0,
                range: p("spinout", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("spinout:wind", spinoutScene, 1, action.origin(),
                JSON.stringify({ moment: "wind", preload: config && config.preload === true ? 1 : 0,
                    power: Math.round(p("spinout", "spin", action)), sparks: Math.round(p("spinout", "sparks", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(spinoutScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const centre = self.position();
            const power = p("spinout", "spin", action);
            const total = Math.max(1.2, p("spinout", "reach", action));
            const rush = Math.max(0.2, p("spinout", "rush", action));
            const turn = Math.max(10, p("spinout", "turn", action)) * Math.PI / 180;
            const knock = p("spinout", "knock", action);
            const sparks = Math.max(6, Math.round(p("spinout", "sparks", action)));
            const scuffRadius = Math.max(0.7, p("spinout", "scuffRadius", action));
            const speedLoss = Math.max(0, Math.round(p("spinout", "speedLoss", action)));
            const radius = Math.max(0.4, Math.min(1.0, self.width() * 0.5));
            const selfWidth = Math.max(0.5, self.width()), selfHeight = Math.max(0.8, self.height());
            const scale = Math.max(0.6, Math.min(2.0, scuffRadius / 1.2));
            const intensity = Math.max(0.5, Math.min(2.4, power / 100));
            const straight = total * 0.5;
            // 释放方向在发出后固定，不再追敌。left 为释放方向的几何左侧。
            const forward = WorldGeometry.flatUnit(aim(action), action.direction());
            const left = WorldCombat.point(forward.z(), 0, -forward.x());

            /** 该侧弯道是否真有空间；两侧都挤时仍用偏好侧，由真实 sweepStep 在墙上收势。 */
            function arcFree(sideSign: number): boolean {
                const half = turn * 0.5 * sideSign;
                const dir = forward.scale(Math.cos(half)).plus(left.scale(Math.sin(half)));
                const probe = centre.plus(dir.scale(straight + (total - straight) * 0.6));
                const feet = WorldCombat.point(probe.x(), centre.y() - selfHeight / 2, probe.z());
                return world.freeSpace(feet, selfWidth, selfHeight);
            }
            // 左／右偏好由配置明确决定；AI 读同一配置，并在偏好侧没空间时改用另一侧。
            let side = config && config.side === "left" ? 1 : -1;
            if (!arcFree(side) && arcFree(-side)) side = -side;

            const path: number[][] = [[centre.x(), centre.y(), centre.z()]];
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            /** 该进度处的实际前进方向：前半直线，后半累计偏转 `turn` 度。 */
            function headingAt(progress: number): CombatPoint {
                const t = progress <= 0.5 ? 0 : (progress - 0.5) / 0.5;
                const angle = turn * side * t;
                return forward.scale(Math.cos(angle)).plus(left.scale(Math.sin(angle)));
            }

            function conclude(current: CombatAction, landed: boolean, at: CombatPoint, dir: CombatPoint, victim: CombatActor | null): void {
                const scope = current.world();
                const here = at;
                if (landed && victim !== null) {
                    if (scope.valid(victim)) {
                        const away = WorldCombat.point(dir.x(), 0, dir.z());
                        if (away.length() >= 0.05) scope.hitDisplace(victim, away.unit().scale(knock));
                    }
                    const applied = NativeEffects.boost(scope, actor, "spe", -speedLoss);
                    WorldFeedback.emit(scope, spinoutScene, 1, at,
                        { moment: "impact", target: String(victim.ref()), sparks: sparks, radius: scuffRadius, scale: scale, intensity: intensity }, 24);
                    sound(current, "cobblemon:impact.steel");
                    if (applied !== 0) {
                        const body = scope.observe(actor);
                        const above = (body === null ? centre : body.position()).plus(WorldCombat.point(0, 1.3, 0));
                        WorldFeedback.emit(scope, spinoutScene, 1, above,
                            { moment: "stagger", speedLoss: Math.abs(applied), fatigue: Math.round(12 + Math.abs(applied) * 8), intensity: intensity }, 22);
                        WorldFeedback.text(scope, above, spinoutStaggerText, [Math.abs(applied)], 30);
                    }
                } else {
                    WorldFeedback.emit(scope, spinoutScene, 1, here, { moment: "miss", sparks: sparks, scale: scale }, 20);
                    WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.0, 0)), spinoutMissText, [], 22);
                    sound(current, "minecraft:entity.player.attack.weak");
                }
                finish(current);
            }

            /** 沿真实弯曲路径逐刻推进：首碰实体才单击结算；墙/冲满收势、不补原 target；空冲不降速。 */
            function advance(current: CombatAction): void {
                const remaining = total - travelled;
                if (remaining <= 0.02) { conclude(current, false, current.origin(), forward, null); return; }
                const dir = headingAt(travelled / total);
                const swept = sweepStep(current, dir.scale(Math.min(rush, remaining)), radius);
                const hit = swept.hit;
                travelled += swept.moved;
                const now = current.origin();
                const last = path[path.length - 1];
                if (Math.abs(now.x() - last[0]) + Math.abs(now.y() - last[1]) + Math.abs(now.z() - last[2]) > 0.02)
                    path.push([now.x(), now.y(), now.z()]);
                const look = now.plus(dir.scale(1.5));
                current.face(look, 45, 45);
                scenes.show(current, "spin", now,
                    { moment: "spin", path: path.slice(), direction: [dir.x(), 0, dir.z()], sparks: sparks,
                        radius: scuffRadius, scale: scale, intensity: intensity });

                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && current.sense().valid(victim) && !current.sense().friendly(victim)
                        && String(victim.ref()) !== String(actor.ref())) {
                        const landed = impact(current, hit, "spinout", power,
                            { damage: damageSpec("spinout", "spin"), contact: true });
                        conclude(current, landed, hit.position(), dir, victim);
                        return;
                    }
                }
                if (hit.blocked()) { conclude(current, false, current.origin(), dir, null); return; }
                if (swept.moved < Math.min(rush, remaining) * 0.5 || travelled >= total) { conclude(current, false, current.origin(), dir, null); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "cobblemon:move.flamewheel.actor");
            WorldFeedback.emit(world, spinoutScene, 1, action.origin(),
                { moment: "wind", sparks: sparks, intensity: intensity }, 16);
            advance(action);
        }
    });
}
